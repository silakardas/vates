"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { STATUS_CONFIG, StoryStatus } from "@/lib/storyStatus";

export default function ContinueCard(props: {
  id: string;
  title: string;
  excerpt: string;
  wordCount: number;
  streak?: number;
  status: StoryStatus;
}) {
  const status = STATUS_CONFIG[props.status];

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="relative bg-ink-soft rounded-2xl px-9 py-8 overflow-hidden"
    >
      <motion.div
        className="absolute top-0 left-0 h-[3px] bg-gradient-to-r from-lamp via-lamp/40 to-transparent"
        initial={{ width: 0 }}
        animate={{ width: "100%" }}
        transition={{ duration: 0.7, ease: "easeOut", delay: 0.15 }}
      />

      <p className="text-xs font-mono text-lamp uppercase tracking-wide mb-4 flex items-center gap-2">
        <motion.svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="#E8A33D"
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <path d="M12 2c1 4-3 5-3 9a3 3 0 006 0c0-1-1-2-1-3 2 1 3 3 3 5a5 5 0 01-10 0c0-5 4-6 5-11z" />
        </motion.svg>
        Continue where you left off
      </p>

      <div className="flex items-baseline gap-3 flex-wrap mb-2">
        <h2 className="font-serif text-2xl">{props.title}</h2>
        <span className={`text-xs font-mono ${status.color}`}>● {status.label}</span>
      </div>

      <p className="text-muted italic text-base max-w-lg leading-relaxed">
        &quot;{props.excerpt}&quot;
      </p>

      <div className="flex items-center gap-5 mt-6 flex-wrap">
        <span className="text-xs font-mono text-muted">
          {props.wordCount.toLocaleString("en-US")} words
        </span>
        {props.streak ? (
          <span className="text-xs font-mono text-lamp">{props.streak}-day streak</span>
        ) : null}
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Link
            href={`/story/${props.id}`}
            className="inline-block bg-lamp text-ink font-semibold text-sm px-5 py-2.5 rounded-full"
          >
            {status.ctaLabel}
          </Link>
        </motion.div>
      </div>
    </motion.div>
  );
}
