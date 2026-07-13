"use client";

import { motion } from "framer-motion";

export default function ChallengeBanner(props: { prompt: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="flex items-center justify-between gap-6 px-8 py-4 bg-lamp/10 border-b border-lamp/20 flex-wrap"
    >
      <p className="text-sm">
        <span className="font-mono text-lamp uppercase tracking-wide text-xs mr-3">
          Today&apos;s challenge
        </span>
        <span className="italic text-parchment">&quot;{props.prompt}&quot;</span>
      </p>
    </motion.div>
  );
}
