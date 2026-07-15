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
  favoriteGenre?: string;
  recurringUniverse?: string;
  favoriteLine?: string;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  signup: (email: string, password: string, name: string) => Promise<{ error?: string; needsConfirmation?: boolean }>;
  logout: () => Promise<void>;
  updatePassword: (newPassword: string) => Promise<{ error?: string }>;
  updateAvatar: (file: File) => Promise<{ error?: string; url?: string }>;
  updateProfile: (updates: {
    name: string;
    dailyGoal: number;
    bio?: string;
    favoriteGenre?: string;
    recurringUniverse?: string;
    favoriteLine?: string;
  }) => Promise<{ error?: string }>;
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
    favoriteGenre: (user_metadata?.favorite_genre as string | undefined) ?? "",
    recurringUniverse: (user_metadata?.recurring_universe as string | undefined) ?? "",
    favoriteLine: (user_metadata?.favorite_line as string | undefined) ?? "",
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(toUser(data.session));
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(toUser(session));
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

  async function updatePassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return { error: error?.message };
  }

  async function updateProfile(updates: {
    name: string;
    dailyGoal: number;
    bio?: string;
    favoriteGenre?: string;
    recurringUniverse?: string;
    favoriteLine?: string;
  }) {
    if (!user) return { error: "Not logged in" };

    const { error } = await supabase.auth.updateUser({
      data: {
        name: updates.name,
        daily_goal: updates.dailyGoal,
        bio: updates.bio ?? "",
        favorite_genre: updates.favoriteGenre ?? "",
        recurring_universe: updates.recurringUniverse ?? "",
        favorite_line: updates.favoriteLine ?? "",
      },
    });

    return { error: error?.message };
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
    return { url };
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, login, signup, logout, updatePassword, updateAvatar, updateProfile }}
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