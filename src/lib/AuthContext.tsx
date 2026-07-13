"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { avatarExtensionFor, MAX_AVATAR_BYTES } from "@/lib/avatar";

type User = {
  id: string;
  name: string;
  email: string;
  joinedAt: number;
  avatarUrl?: string;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  signup: (email: string, password: string, name: string) => Promise<{ error?: string; needsConfirmation?: boolean }>;
  logout: () => Promise<void>;
  updatePassword: (newPassword: string) => Promise<{ error?: string }>;
  updateAvatar: (file: File) => Promise<{ error?: string; url?: string }>;
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

    const path = `${user.id}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });

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
      value={{ user, loading, login, signup, logout, updatePassword, updateAvatar }}
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
