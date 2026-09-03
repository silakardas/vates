"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { STATUS_CONFIG, StoryStatus } from "@/lib/storyStatus";
import { relativeTime } from "@/lib/timeAgo";
import { StoryType, StoryTags } from "@/lib/types";
import StreakBadge from "@/components/StreakBadge";

export default function StoryRow(props: {
  id: string;
  title: string;
  description?: string;
  type: StoryType;
  chapterCount: number;
  wordCount: number;
  streak?: number;
  tags: StoryTags;
  status: StoryStatus;
  updatedAt: number;
  pinned?: boolean;
  onTogglePin?: () => void;
}) {
  const status = STATUS_CONFIG[props.status];
  const stripColor =
    props.status === "inProgress"
      ? "bg-lamp"
      : props.status === "completed"
      ? "bg-completed"
      : "bg-plum";

  function handlePinClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    props.onTogglePin?.();
  }

  return (
    <motion.div
      whileHover={{ x: 4 }}
      transition={{ duration: 0.15 }}
      className="group flex items-center gap-3 py-5 border-b border-parchment/10 hover:border-parchment/25 transition-colors"
    >
      <Link href={`/story/${props.id}`} className="flex flex-1 min-w-0 gap-4">
        <div
          className={`w-[3px] rounded-full ${stripColor} opacity-70 group-hover:opacity-100 transition-opacity`}
        />
        <div className="flex-1 flex items-center justify-between gap-6 flex-wrap">
          <div>
            <div className="flex items-center gap-3 mb-1.5">
              <span className={`text-xs font-mono ${status.color}`}>● {status.label}</span>
              <span className="text-xs font-mono text-faint capitalize">
                {props.type === "series"
                  ? `series · ${props.chapterCount} ch`
                  : "oneshot"}
              </span>
              {props.pinned && (
                <span className="text-xs font-mono text-lamp">pinned</span>
              )}
            </div>
            <h3 className="font-serif text-lg group-hover:text-lamp transition-colors">
              {props.title}
            </h3>
            {props.description && (
              <p className="text-xs text-muted mt-1 max-w-md line-clamp-1">
                {props.description}
              </p>
            )}
            <div className="flex items-center gap-2 flex-wrap mt-2">
              {props.tags.fandoms.length > 0 && (
                <span className="text-xs font-mono uppercase tracking-wide text-lamp">
                  {props.tags.fandoms.join(" · ")}
                </span>
              )}
              {[
                ...props.tags.relationships,
                ...props.tags.characters,
                ...props.tags.additionalTags,
              ].map((tag) => (
                <span key={tag} className="text-xs font-mono text-muted">
                  #{tag}
                </span>
              ))}
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-mono text-muted block">
              {props.wordCount.toLocaleString("en-US")} words
            </span>
            <span className="text-xs font-mono text-muted/60 block mt-1">
              edited {relativeTime(props.updatedAt)}
            </span>
          </div>
        </div>
      </Link>

      {props.streak ? <StreakBadge streak={props.streak} className="shrink-0 self-start mt-0.5" /> : null}

      {props.onTogglePin && (
        <button
          onClick={handlePinClick}
          aria-label={props.pinned ? "Unpin story" : "Pin story to top"}
          aria-pressed={!!props.pinned}
          className={`shrink-0 self-start mt-0.5 p-1 -m-1 rounded-md transition-all ${
            props.pinned
              ? "text-lamp opacity-100"
              : "text-faint opacity-40 hover:opacity-100 hover:text-lamp focus-visible:opacity-100"
          }`}
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill={props.pinned ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ transform: props.pinned ? "rotate(0deg)" : "rotate(45deg)" }}
            className="transition-transform duration-200"
          >
            <path d="M12 17v5" />
            <path d="M9 3h6l-.5 5.5L18 11v2H6v-2l3.5-2.5L9 3z" />
          </svg>
        </button>
      )}
    </motion.div>
  );
}