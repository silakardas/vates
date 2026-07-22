"use client";

import { motion, AnimatePresence } from "framer-motion";

export default function GrammarSuggestion(props: {
  message: string;
  replacements: string[];
  x: number;
  y: number;
  onApply: (replacement: string) => void;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: -6 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: -6 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        className="fixed z-50 w-64 bg-ink border border-crimson/30 rounded-lg p-4 shadow-2xl"
        style={{ top: props.y + 12, left: Math.min(props.x, window.innerWidth - 280) }}
      >
        <div className="flex items-start justify-between mb-2">
          <span className="font-mono text-[10px] uppercase tracking-wide text-crimson">
            Grammar
          </span>
          <button
            onClick={props.onClose}
            className="text-muted hover:text-parchment text-xs font-mono transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <p className="text-xs text-muted mb-3">{props.message}</p>

        {props.replacements.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {props.replacements.map((r, i) => (
              <motion.button
                key={`${r}-${i}`}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => props.onApply(r)}
                className="text-xs text-parchment bg-parchment/10 hover:bg-lamp hover:text-ink px-2 py-1 rounded-full transition-colors"
              >
                {r}
              </motion.button>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted italic">No suggested fix.</p>
        )}
      </motion.div>
    </AnimatePresence>
  );
}