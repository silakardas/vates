"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { getContinueReading, ContinueReadingEntry } from "@/lib/readingProgress";

function excerptFrom(html: string) {
  const text = html.replace(/<[^>]+>/g, "").trim();
  return text.length > 0 ? text.slice(0, 120) : "An empty page, waiting.";
}

// Companion to ContinueCard: that one resumes *writing* your own story,
// this one resumes *reading* someone else's. Kept as a separate
// component/card (not a variant of ContinueCard) since the data source,
// destination (/discover/[id] vs /story/[id]), and "own work vs someone
// else's" framing are different enough that sharing one component would
// mean branching most of its body anyway.
export default function ContinueReadingCard() {
  const { user } = useAuth();
  const [entry, setEntry] = useState<ContinueReadingEntry | null | undefined>(undefined);

  useEffect(() => {
    if (!user) {
      setEntry(null);
      return;
    }
    let cancelled = false;
    getContinueReading(user.id).then((result) => {
      if (!cancelled) setEntry(result);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  // undefined = still loading, null = nothing to resume — render nothing
  // either way rather than an empty-state card; unlike ContinueCard
  // (always relevant once you have any story) this one is opportunistic.
  if (!entry) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="relative bg-ink-soft rounded-2xl px-6 py-6 sm:px-9 sm:py-8 overflow-hidden"
    >
      <motion.div
        className="absolute top-0 left-0 h-[3px] bg-gradient-to-r from-lamp/60 via-lamp/20 to-transparent"
        initial={{ width: 0 }}
        animate={{ width: "100%" }}
        transition={{ duration: 0.7, ease: "easeOut", delay: 0.15 }}
      />

      <p className="text-xs font-mono text-lamp uppercase tracking-wide mb-4 flex items-center gap-2">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#E8A33D" strokeWidth="2">
          <path d="M4 4.5A2.5 2.5 0 016.5 2H20v17H6.5A2.5 2.5 0 004 21.5V4.5z" />
          <path d="M4 4.5A2.5 2.5 0 006.5 7H20" />
        </svg>
        Continue reading
      </p>

      <div className="flex items-baseline gap-3 flex-wrap mb-2">
        <h2 className="font-serif text-2xl">{entry.story.title}</h2>
        <span className="text-xs font-mono text-muted">by {entry.author.username}</span>
      </div>

      {entry.chapter && (
        <p className="text-muted italic text-base max-w-lg leading-relaxed">
          &quot;{excerptFrom(entry.chapter.content)}&quot;
        </p>
      )}

      <div className="flex items-center gap-5 mt-6 flex-wrap">
        {entry.story.type === "series" && entry.chapter && (
          <span className="text-xs font-mono text-muted">{entry.chapter.title}</span>
        )}
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Link
            href={`/discover/${entry.storyId}`}
            className="inline-block bg-lamp text-ink font-semibold text-sm px-5 py-2.5 rounded-full"
          >
            Resume reading
          </Link>
        </motion.div>
      </div>
    </motion.div>
  );
}
