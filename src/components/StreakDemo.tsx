"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

const TOTAL_DAYS = 7;
const STEP_MS = 350;
const PAUSE_MS = 2200;

export default function StreakDemo() {
  const [lit, setLit] = useState(0);

  useEffect(() => {
    if (lit < TOTAL_DAYS) {
      const t = setTimeout(() => setLit(lit + 1), STEP_MS);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setLit(0), PAUSE_MS);
    return () => clearTimeout(t);
  }, [lit]);

  return (
    <div className="rounded-xl border border-parchment/10 bg-ink-soft px-6 py-7 h-full flex flex-col justify-center items-center text-center">
      <motion.span
        key={lit === TOTAL_DAYS ? "full" : "counting"}
        animate={lit === TOTAL_DAYS ? { scale: [1, 1.15, 1] } : {}}
        transition={{ duration: 0.4 }}
        className="text-3xl mb-2"
      >
        🔥
      </motion.span>
      <p className="font-serif text-2xl text-lamp mb-4">{lit}-day streak</p>
      <div className="flex gap-1.5">
        {Array.from({ length: TOTAL_DAYS }, (_, i) => (
          <motion.span
            key={i}
            animate={{
              backgroundColor: i < lit ? "rgba(232,163,61,0.85)" : "rgba(245,235,220,0.08)",
            }}
            transition={{ duration: 0.25 }}
            className="w-3 h-3 rounded-sm"
          />
        ))}
      </div>
      <p className="mt-6 font-mono text-[10px] uppercase tracking-widest text-faint">
        a reason to come back
      </p>
    </div>
  );
}