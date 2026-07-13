"use client";

import { motion } from "framer-motion";
import { Story, totalWordCount } from "@/lib/types";
import { buildActivity } from "@/lib/activity";
import ActivityStrip from "./ActivityStrip";

export default function WorkshopStats(props: {
  stories: Story[];
  query: string;
  onQueryChange: (value: string) => void;
}) {
  const { stories, query, onQueryChange } = props;

  const totalWords = stories.reduce((sum, s) => sum + totalWordCount(s), 0);
  const inProgress = stories.filter((s) => s.status === "inProgress").length;
  const completed = stories.filter((s) => s.status === "completed").length;
  const bestStreak = stories.reduce((max, s) => Math.max(max, s.streak ?? 0), 0);

  const tagCounts = new Map<string, number>();
  stories.forEach((s) =>
    s.tags.forEach((t) => tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1))
  );
  const topTags = [...tagCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([tag]) => tag);

  const activity = buildActivity(stories, 14);

  const stats = [
    { label: "Total words", value: totalWords.toLocaleString("en-US") },
    { label: "In progress", value: inProgress },
    { label: "Completed", value: completed },
    { label: "Best streak", value: bestStreak ? `${bestStreak}d` : "—" },
  ];

  return (
    <aside className="w-80 flex-shrink-0 border-l border-parchment/10 p-6 space-y-8">
      <div>
        <label className="block font-mono text-[10px] uppercase tracking-wide text-muted mb-3">
          Search your stories
        </label>
        <div className="relative">
          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search by title..."
            className="w-full bg-ink-soft rounded-lg pl-9 pr-8 py-2.5 text-sm outline-none border border-parchment/10 focus:border-lamp/40 transition-colors placeholder:text-faint"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-faint text-sm">
            ⌕
          </span>
          {query && (
            <button
              onClick={() => onQueryChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-faint hover:text-crimson transition-colors text-xs"
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <div>
        <p className="font-mono text-[10px] uppercase tracking-wide text-muted mb-4">
          At a glance
        </p>
        <div className="grid grid-cols-2 gap-3">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.05, ease: "easeOut" }}
              className="bg-ink-soft border border-parchment/10 rounded-lg px-3.5 py-3"
            >
              <span className="block font-serif text-xl text-lamp leading-none mb-1.5">
                {s.value}
              </span>
              <span className="block font-mono text-[10px] uppercase tracking-wide text-faint">
                {s.label}
              </span>
            </motion.div>
          ))}
        </div>
      </div>

      {topTags.length > 0 && (
        <div>
          <p className="font-mono text-[10px] uppercase tracking-wide text-muted mb-4">
            Frequent tags
          </p>
          <div className="flex flex-wrap gap-2">
            {topTags.map((tag) => (
              <span
                key={tag}
                className="text-xs font-mono text-muted bg-ink-soft border border-parchment/10 px-2.5 py-1 rounded-full"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="font-mono text-[10px] uppercase tracking-wide text-muted mb-4">
          Last 14 days
        </p>
        <ActivityStrip days={activity} />
      </div>
    </aside>
  );
}
