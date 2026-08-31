"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { avatarExtensionFor, MAX_AVATAR_BYTES } from "@/lib/avatar";

// Avatars are always displayed as small circles, but a lot of source
// photos are either much larger than that (huge upload, slow to load)
// or an odd aspect ratio that gets awkwardly cropped by object-cover.
// Normalizing every upload to a fixed, center-cropped square at a
// resolution well above any on-screen avatar size (crisp even on
// retina screens) fixes both the "blurry/pixelated" and "off-center"
// complaints in one pass. Animated GIFs are left untouched so we don't
// flatten them to a single frame.
const AVATAR_TARGET_SIZE = 480;

async function normalizeAvatarImage(file: File): Promise<File> {
  if (file.type === "image/gif") return file;

  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - side) / 2;
  const sy = (bitmap.height - side) / 2;

  const canvas = document.createElement("canvas");
  canvas.width = AVATAR_TARGET_SIZE;
  canvas.height = AVATAR_TARGET_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, AVATAR_TARGET_SIZE, AVATAR_TARGET_SIZE);

  const outputType = file.type === "image/png" ? "image/png" : "image/jpeg";
  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob(resolve, outputType, 0.92)
  );
  if (!blob) return file;

  const ext = outputType === "image/png" ? "png" : "jpg";
  return new File([blob], `avatar.${ext}`, { type: outputType });
}

type User = {
  id: string;
  name: string;
  email: string;
  joinedAt: number;
  avatarUrl?: string;
  dailyGoal?: number;
  bio?: string;
  favoriteLine?: string;
  showWriterIdentity?: boolean;
  // Unlike the fields above, username lives only in `profiles` (it needs
  // a database-level uniqueness guarantee auth.users' metadata can't
  // give it), so it isn't known synchronously from the session the way
  // the rest of this object is — it starts undefined and is filled in
  // by loadUsername() just after. usernameChangedAt drives the
  // once-a-week cooldown in Settings.
  username?: string;
  usernameChangedAt?: string | null;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  signup: (email: string, password: string, name: string) => Promise<{ error?: string; needsConfirmation?: boolean }>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<{ error?: string }>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
  updatePassword: (newPassword: string) => Promise<{ error?: string }>;
  updateAvatar: (file: File) => Promise<{ error?: string; url?: string }>;
  updateProfile: (updates: {
    name: string;
    dailyGoal: number;
    bio?: string;
    favoriteLine?: string;
    showWriterIdentity?: boolean;
  }) => Promise<{ error?: string }>;
  updateUsername: (username: string) => Promise<{ error?: string }>;
};

const AuthContext = createContext<AuthContextType | null>(null);

function toUser(session: Session | null): User | null {
  if (!session?.user) return null;
  const { id, email, user_metadata, created_at } = session.user;
  return {
    id,
    email: email ?? "",
    name: (user_metadata?.name as string | undefined) || (email?.split("@")[0] ?? "writer"),
    joinedAt: created_at ? new Date(created_at).getTime() : Date.now(),
    avatarUrl: user_metadata?.avatar_url as string | undefined,
    dailyGoal: (user_metadata?.daily_goal as number | undefined) ?? 300,
    bio: (user_metadata?.bio as string | undefined) ?? "",
    favoriteLine: (user_metadata?.favorite_line as string | undefined) ?? "",
    showWriterIdentity: (user_metadata?.show_writer_identity as boolean | undefined) ?? false,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  // username lives in `profiles`, not in the session/metadata toUser()
  // reads synchronously above, so it's fetched separately and merged in
  // right after. Best-effort: if it fails, the rest of `user` (which is
  // what actually gates isLoading) still loads fine.
  async function loadUsername(userId: string) {
    const { data } = await supabase
      .from("profiles")
      .select("username, username_changed_at")
      .eq("id", userId)
      .maybeSingle();
    if (!data) return;
    setUser((prev) =>
      prev && prev.id === userId
        ? {
            ...prev,
            username: data.username as string,
            usernameChangedAt: data.username_changed_at as string | null,
          }
        : prev
    );
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const nextUser = toUser(data.session);
      setUser(nextUser);
      setLoading(false);
      if (nextUser) loadUsername(nextUser.id);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = toUser(session);
      setUser(nextUser);
      if (nextUser) loadUsername(nextUser.id);
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function login(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message };
  }

  async function signup(email: string, password: string, name: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (error) return { error: error.message };
    if (!data.session) {
      // Account created, but email confirmation is required before a
      // session exists — don't pretend the user is logged in.
      return { needsConfirmation: true };
    }
    return {};
  }

  async function logout() {
    await supabase.auth.signOut();
  }

  async function deleteAccount() {
    if (!user) return { error: "Not logged in" };

    try {
      const res = await fetch("/api/account/delete", { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { error: body.error ?? "Something went wrong. Please try again." };
      }
    } catch {
      return { error: "Something went wrong. Please try again." };
    }

    await supabase.auth.signOut();
    return {};
  }

  async function resetPassword(email: string) {
    // Sends a "reset your password" email containing a recovery link.
    // Supabase redirects the user back to this URL with a recovery
    // session already attached, where they can set a new password.
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error: error?.message };
  }

  async function updatePassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return { error: error?.message };
  }

  async function updateProfile(updates: {
    name: string;
    dailyGoal: number;
    bio?: string;
    favoriteLine?: string;
    showWriterIdentity?: boolean;
  }) {
    if (!user) return { error: "Not logged in" };

    const { error } = await supabase.auth.updateUser({
      data: {
        name: updates.name,
        daily_goal: updates.dailyGoal,
        bio: updates.bio ?? "",
        favorite_line: updates.favoriteLine ?? "",
        show_writer_identity: updates.showWriterIdentity ?? false,
      },
    });

    if (error) return { error: error.message };

    // Mirror name + the writer-identity fields onto profiles, same
    // reasoning as avatar_url in updateAvatar below: auth.users'
    // metadata (just written above) isn't readable by anyone but the
    // user themselves, but /profile/[username] needs these fields for
    // other visitors. bio/favorite_line only ever surface to other
    // visitors through the profile_writer_identity view (see
    // schema.sql), which gates on show_writer_identity — so it's safe
    // to always write the raw values here regardless of the toggle's
    // state. Best-effort: the fields still work from the user's own
    // perspective (via auth metadata) even if this fails, so don't
    // surface it as a blocking error.
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        name: updates.name,
        bio: updates.bio ?? "",
        favorite_line: updates.favoriteLine ?? "",
        show_writer_identity: updates.showWriterIdentity ?? false,
      })
      .eq("id", user.id);
    if (profileError) {
      console.error("Failed to sync profile fields to public profile:", profileError.message);
    }

    return {};
  }

  // Cooldown/format/reserved-word rules are enforced server-side by the
  // on_username_change trigger (see schema.sql) — this just calls a
  // plain update and turns the raw Postgres error into something
  // readable. 23505 is a unique-constraint violation (username already
  // taken by someone else); anything else (bad format, reserved word,
  // cooldown still active) comes back as the trigger's own message.
  async function updateUsername(username: string) {
    if (!user) return { error: "Not logged in" };

    const { error } = await supabase
      .from("profiles")
      .update({ username })
      .eq("id", user.id);

    if (error) {
      if (error.code === "23505") {
        return { error: "That username is already taken." };
      }
      return { error: error.message };
    }

    setUser((prev) =>
      prev ? { ...prev, username, usernameChangedAt: new Date().toISOString() } : prev
    );
    return {};
  }

  async function updateAvatar(file: File) {
    if (!user) return { error: "Not logged in" };

    // Derive the extension from the actual MIME type rather than the
    // user-supplied filename, and reject anything not on the allowlist.
    const ext = avatarExtensionFor(file.type);
    if (!ext) {
      return { error: "Please upload a JPG, PNG, WEBP, or GIF image." };
    }
    if (file.size > MAX_AVATAR_BYTES) {
      return { error: "Image must be under 5MB." };
    }

    let upload: File;
    try {
      upload = await normalizeAvatarImage(file);
    } catch {
      // If normalization fails for any reason, fall back to the
      // original file rather than blocking the upload entirely.
      upload = file;
    }
    const uploadExt = avatarExtensionFor(upload.type) ?? ext;

    const path = `${user.id}/avatar.${uploadExt}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, upload, { upsert: true });

    if (uploadError) return { error: uploadError.message };

    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(path);

    // Cache-bust so the new image shows immediately even if the URL is
    // otherwise identical to a previously-uploaded avatar.
    const url = `${publicUrl}?t=${Date.now()}`;

    const { error: updateError } = await supabase.auth.updateUser({
      data: { avatar_url: url },
    });

    if (updateError) return { error: updateError.message };

    // Also mirror it onto profiles, which — unlike auth.users'
    // metadata — is readable on the public /profile/[username] page
    // (for users with at least one public story). Best-effort: if this
    // fails, the user's own avatar (from auth metadata) still works
    // everywhere else in the app, so don't surface it as an error.
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ avatar_url: url })
      .eq("id", user.id);
    if (profileError) {
      console.error("Failed to sync avatar to public profile:", profileError.message);
    }

    return { url };
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        signup,
        logout,
        deleteAccount,
        resetPassword,
        updatePassword,
        updateAvatar,
        updateProfile,
        updateUsername,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}