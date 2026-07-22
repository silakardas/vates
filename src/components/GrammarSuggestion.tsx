"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function GrammarSuggestion(props: {
  message: string;
  replacements: string[];
  x: number;
  y: number;
  onApply: (replacement: string) => void;
  onClose: () => void;
}) {
  const [pos, setPos] = useState({ top: props.y + 12, left: props.x });

  useEffect(() => {
    const margin = 12;
    const width = 256; // matches w-64
    const estimatedHeight = 160;
    const left = Math.min(
      Math.max(props.x, margin),
      Math.max(margin, window.innerWidth - width - margin)
    );
    const top = Math.min(
      Math.max(props.y + 12, margin),
      Math.max(margin, window.innerHeight - estimatedHeight - margin)
    );
    setPos({ top, left });
  }, [props.x, props.y]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: -6 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: -6 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        className="fixed z-50 w-64 max-w-[calc(100vw-24px)] bg-ink border border-crimson/30 rounded-lg p-4 shadow-2xl"
        style={{ top: pos.top, left: pos.left }}
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