"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { STATUS_CONFIG, StoryStatus } from "@/lib/storyStatus";
import { relativeTime } from "@/lib/timeAgo";
import { StoryType } from "@/lib/types";

export default function StoryRow(props: {
  id: string;
  title: string;
  description?: string;
  type: StoryType;
  chapterCount: number;
  wordCount: number;
  streak?: number;
  tags: string[];
  status: StoryStatus;
  updatedAt: number;
}) {
  const status = STATUS_CONFIG[props.status];
  const stripColor =
    props.status === "inProgress"
      ? "bg-lamp"
      : props.status === "completed"
      ? "bg-completed"
      : "bg-plum";

  return (
    <motion.div whileHover={{ x: 4 }} transition={{ duration: 0.15 }}>
      <Link
        href={`/story/${props.id}`}
        className="group flex gap-4 py-5 border-b border-parchment/10 hover:border-parchment/25 transition-colors"
      >
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
              {props.streak ? (
                <span className="text-xs font-mono text-lamp">{props.streak}d streak</span>
              ) : null}
            </div>
            <h3 className="font-serif text-lg group-hover:text-lamp transition-colors">
              {props.title}
            </h3>
            {props.description && (
              <p className="text-xs text-muted mt-1 max-w-md line-clamp-1">
                {props.description}
              </p>
            )}
            <div className="flex gap-3 flex-wrap mt-2">
              {props.tags.map((tag) => (
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
    </motion.div>
  );
}
