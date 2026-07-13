"use client";

import { useRef, useState } from "react";
import { totalWordCount } from "@/lib/types";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { useAuth } from "@/lib/AuthContext";
import { useStories } from "@/lib/StoryContext";

function formatJoinDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export default function AccountPage() {
  const { user, logout, updatePassword, updateAvatar } = useAuth();
  const { stories } = useStories();
  const router = useRouter();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);

  if (!user) {
    return (
      <>
        <Header />
        <main className="px-8 py-24 text-center">
          <p className="text-muted mb-4">You&apos;re not logged in.</p>
          <Link href="/login" className="text-lamp hover:underline text-sm">
            Go to login →
          </Link>
        </main>
      </>
    );
  }

  const totalWords = stories.reduce((sum, s) => sum + totalWordCount(s), 0);
  const inProgress = stories.filter((s) => s.status === "inProgress").length;
  const streak = stories.reduce((max, s) => Math.max(max, s.streak ?? 0), 0);

  const longestStory = stories.reduce<{ title: string; words: number } | null>(
    (best, s) => {
      const words = totalWordCount(s);
      if (!best || words > best.words) return { title: s.title, words };
      return best;
    },
    null
  );

  const tagCounts = stories.flatMap((s) => s.tags).reduce<Record<string, number>>(
    (counts, tag) => {
      counts[tag] = (counts[tag] ?? 0) + 1;
      return counts;
    },
    {}
  );
  const favoriteTag = Object.entries(tagCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

  function handleLogout() {
    logout();
    router.push("/");
  }

  async function handleAvatarPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setAvatarError("Image must be under 5MB.");
      return;
    }

    setAvatarError(null);
    setAvatarUploading(true);
    const result = await updateAvatar(file);
    setAvatarUploading(false);

    if (result.error) {
      setAvatarError(result.error);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords don't match.");
      return;
    }

    setPasswordSubmitting(true);
    const result = await updatePassword(newPassword);
    setPasswordSubmitting(false);

    if (result.error) {
      setPasswordError(result.error);
      return;
    }

    setPasswordSuccess(true);
    setNewPassword("");
    setConfirmPassword("");
    setTimeout(() => {
      setShowPasswordForm(false);
      setPasswordSuccess(false);
    }, 1800);
  }

  return (
    <>
      <Header />
      <main className="px-8 py-16 max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="flex items-center gap-5 mb-3"
        >
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={avatarUploading}
            className="relative w-16 h-16 rounded-full bg-lamp/15 border border-lamp/30 text-lamp font-serif text-2xl flex items-center justify-center overflow-hidden group flex-shrink-0"
            title="Change avatar"
          >
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="w-full h-full object-cover"
              />
            ) : (
              user.name.charAt(0).toUpperCase()
            )}
            <span className="absolute inset-0 bg-ink/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[9px] font-mono text-parchment uppercase tracking-wide">
              {avatarUploading ? "…" : "Change"}
            </span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarPick}
            className="hidden"
          />
          <div>
            <h1 className="font-serif text-2xl text-parchment">{user.name}</h1>
            <p className="text-muted text-sm">{user.email}</p>
            <p className="text-faint text-xs font-mono mt-1">
              Writing here since {formatJoinDate(user.joinedAt)}
            </p>
          </div>
        </motion.div>

        {avatarError && (
          <p className="text-xs text-red-400 mb-8">{avatarError}</p>
        )}
        {!avatarError && <div className="mb-8" />}

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
          className="grid grid-cols-3 gap-4 mb-4"
        >
          <div className="bg-panel border border-parchment/10 rounded-xl px-5 py-4 text-center">
            <p className="font-mono text-2xl text-lamp">{stories.length}</p>
            <p className="text-xs text-muted mt-1">stories</p>
          </div>
          <div className="bg-panel border border-parchment/10 rounded-xl px-5 py-4 text-center">
            <p className="font-mono text-2xl text-lamp">
              {totalWords.toLocaleString("en-US")}
            </p>
            <p className="text-xs text-muted mt-1">words written</p>
          </div>
          <div className="bg-panel border border-parchment/10 rounded-xl px-5 py-4 text-center">
            <p className="font-mono text-2xl text-lamp">{inProgress}</p>
            <p className="text-xs text-muted mt-1">in progress</p>
          </div>
        </motion.div>

        {(streak > 0 || longestStory || favoriteTag) && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15, ease: "easeOut" }}
            className="grid grid-cols-3 gap-4 mb-12"
          >
            <div className="bg-panel border border-parchment/10 rounded-xl px-5 py-4 text-center">
              <p className="font-mono text-2xl text-lamp">{streak || "—"}</p>
              <p className="text-xs text-muted mt-1">day streak</p>
            </div>
            <div className="bg-panel border border-parchment/10 rounded-xl px-5 py-4 text-center overflow-hidden">
              <p className="font-mono text-2xl text-lamp">
                {longestStory ? longestStory.words.toLocaleString("en-US") : "—"}
              </p>
              <p className="text-xs text-muted mt-1 truncate" title={longestStory?.title}>
                longest{longestStory ? `: ${longestStory.title}` : " story"}
              </p>
            </div>
            <div className="bg-panel border border-parchment/10 rounded-xl px-5 py-4 text-center overflow-hidden">
              <p className="font-mono text-2xl text-lamp truncate" title={favoriteTag}>
                {favoriteTag ?? "—"}
              </p>
              <p className="text-xs text-muted mt-1">favorite tag</p>
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2, ease: "easeOut" }}
          className="mb-6"
        >
          {!showPasswordForm ? (
            <div className="flex items-center gap-6">
              <Link href="/settings" className="text-sm text-muted hover:text-parchment transition-colors">
                Preferences
              </Link>
              <button
                onClick={() => setShowPasswordForm(true)}
                className="text-sm text-muted hover:text-parchment transition-colors"
              >
                Change password
              </button>
              <button
                onClick={handleLogout}
                className="text-sm text-crimson hover:underline"
              >
                Log out
              </button>
            </div>
          ) : (
            <form
              onSubmit={handlePasswordSubmit}
              className="bg-panel border border-parchment/10 rounded-xl px-6 py-5 space-y-3 max-w-sm"
            >
              <p className="font-mono text-[10px] uppercase tracking-wide text-muted mb-1">
                Change password
              </p>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password"
                className="w-full bg-ink-soft rounded-lg px-4 py-2.5 text-sm text-parchment outline-none border border-parchment/10 focus:border-lamp/40 transition-colors placeholder:text-faint"
              />
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="w-full bg-ink-soft rounded-lg px-4 py-2.5 text-sm text-parchment outline-none border border-parchment/10 focus:border-lamp/40 transition-colors placeholder:text-faint"
              />

              {passwordError && (
                <p className="text-xs text-red-400">{passwordError}</p>
              )}
              {passwordSuccess && (
                <p className="text-xs text-green-400">Password updated.</p>
              )}

              <div className="flex items-center gap-3 pt-1">
                <button
                  type="submit"
                  disabled={passwordSubmitting}
                  className="bg-lamp text-ink text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-60"
                >
                  {passwordSubmitting ? "Saving…" : "Save password"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordForm(false);
                    setPasswordError(null);
                    setNewPassword("");
                    setConfirmPassword("");
                  }}
                  className="text-sm text-muted hover:text-parchment transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </main>
    </>
  );
}
