"use client";

import { useState } from "react";
import { motion } from "framer-motion";

export default function ChallengeBanner(props: { prompt: string }) {
  const [copied, setCopied] = useState(false);

  function handleShare() {
    const url = "https://vates-six.vercel.app/challenge";
    const text = `Today's writing challenge: "${props.prompt}" — try it at vates-six.vercel.app`;

    if (navigator.share) {
      navigator.share({ title: "Vates — Today's Challenge", text, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(`${text} ${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

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

      <button
        onClick={handleShare}
        className="font-mono text-[11px] uppercase tracking-wide text-lamp hover:text-lamp-bright transition-colors whitespace-nowrap"
      >
        {copied ? "Link copied ✓" : "Share this prompt →"}
      </button>
    </motion.div>
  );
}