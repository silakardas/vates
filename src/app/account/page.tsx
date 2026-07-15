"use client";

import { useRef, useState } from "react";
import { totalWordCount } from "@/lib/types";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { useAuth } from "@/lib/AuthContext";
import { useStories } from "@/lib/StoryContext";
import { ALLOWED_AVATAR_TYPES, MAX_AVATAR_BYTES } from "@/lib/avatar";
import { STATUS_CONFIG } from "@/lib/storyStatus";
import { relativeTime } from "@/lib/timeAgo";
import { buildActivity } from "@/lib/activity";
import ActivityStrip from "@/components/ActivityStrip";

function formatJoinDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export default function AccountPage() {
  const { user, logout, updateAvatar } = useAuth();
  const { stories } = useStories();
  const router = useRouter();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

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
  const sortedTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]);
  const favoriteTag = sortedTags[0]?.[0];
  const topTags = sortedTags.slice(0, 10).map(([tag]) => tag);

  const recentStories = [...stories].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 3);
  const activity = buildActivity(stories, 14);

  function handleLogout() {
    logout();
    router.push("/");
  }

  async function handleAvatarPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_AVATAR_TYPES[file.type]) {
      setAvatarError("Please upload a JPG, PNG, WEBP, or GIF image.");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
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
            className="relative w-24 h-24 rounded-full bg-lamp/15 border border-lamp/30 text-lamp font-serif text-3xl flex items-center justify-center overflow-hidden group flex-shrink-0"
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
            <span className="absolute inset-0 bg-ink/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[10px] font-mono text-parchment uppercase tracking-wide">
              {avatarUploading ? "…" : "Change"}
            </span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept={Object.keys(ALLOWED_AVATAR_TYPES).join(",")}
            onChange={handleAvatarPick}
            className="hidden"
          />
          <div>
            <h1 className="font-serif text-2xl text-parchment">{user.name}</h1>
            <p className="text-muted text-sm">{user.email}</p>
            <p className="text-faint text-xs font-mono mt-1">
              Writing here since {formatJoinDate(user.joinedAt)}
            </p>
            {user.bio && (
              <p className="text-muted text-sm italic mt-2 max-w-md">&quot;{user.bio}&quot;</p>
            )}
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
          className="mb-12"
        >
          <div className="flex items-center justify-between mb-4">
            <p className="font-mono text-[10px] uppercase tracking-wide text-faint">
              Recent stories
            </p>
            {stories.length > 0 && (
              <Link
                href="/workshop"
                className="text-xs text-muted hover:text-parchment transition-colors"
              >
                View all →
              </Link>
            )}
          </div>

          {recentStories.length === 0 ? (
            <div className="bg-panel border border-parchment/10 rounded-xl px-6 py-8 text-center">
              <p className="text-sm text-muted mb-3">You haven&apos;t started a story yet.</p>
              <Link href="/workshop" className="text-lamp text-sm hover:underline">
                Begin your first one →
              </Link>
            </div>
          ) : (
            <div className="bg-panel border border-parchment/10 rounded-xl divide-y divide-parchment/10 overflow-hidden">
              {recentStories.map((s) => {
                const status = STATUS_CONFIG[s.status];
                return (
                  <Link
                    key={s.id}
                    href={`/story/${s.id}`}
                    className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-parchment/[0.03] transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-[10px] font-mono ${status.color}`}>
                          ● {status.label}
                        </span>
                        <span className="text-[10px] font-mono text-faint">
                          {s.type === "series" ? `${s.chapters.length} ch` : "oneshot"}
                        </span>
                      </div>
                      <p className="font-serif text-parchment truncate">{s.title}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs font-mono text-muted">
                        {totalWordCount(s).toLocaleString("en-US")} words
                      </p>
                      <p className="text-[10px] font-mono text-faint mt-0.5">
                        edited {relativeTime(s.updatedAt)}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </motion.div>

        {stories.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.25, ease: "easeOut" }}
            className="mb-12"
          >
            <p className="font-mono text-[10px] uppercase tracking-wide text-faint mb-4">
              Last 14 days
            </p>
            <ActivityStrip days={activity} />
          </motion.div>
        )}

        {topTags.length > 1 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3, ease: "easeOut" }}
            className="mb-12"
          >
            <p className="font-mono text-[10px] uppercase tracking-wide text-faint mb-4">
              Tags you write
            </p>
            <div className="flex flex-wrap gap-2">
              {topTags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs font-mono text-muted bg-panel border border-parchment/10 px-3 py-1.5 rounded-full"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.35, ease: "easeOut" }}
          className="mb-6"
        >
          <div className="flex items-center gap-6">
            <Link href="/settings" className="text-sm text-muted hover:text-parchment transition-colors">
              Settings
            </Link>
            <button
              onClick={handleLogout}
              className="text-sm text-crimson hover:underline"
            >
              Log out
            </button>
          </div>
        </motion.div>
      </main>
    </>
  );
}