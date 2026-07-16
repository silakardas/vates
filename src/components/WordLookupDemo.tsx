"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const DEMO = {
  before: "The lantern flickered against the fog, casting a ",
  word: "restless",
  after: " glow across the harbor.",
  definition: "unable to relax or stay still, because of anxiety or excess energy",
  synonyms: ["uneasy", "fidgety", "unsettled"],
};

// idle -> cursor moves in -> double-click + popup -> popup retreats -> loop
const STEP_MS = [1000, 650, 2200, 550];

export default function WordLookupDemo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const wordRef = useRef<HTMLSpanElement>(null);
  const [target, setTarget] = useState({ x: 140, y: 24 });
  const [step, setStep] = useState(0);
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    function measure() {
      const container = containerRef.current;
      const word = wordRef.current;
      if (!container || !word) return;
      const cRect = container.getBoundingClientRect();
      const wRect = word.getBoundingClientRect();
      setTarget({
        x: wRect.left - cRect.left + wRect.width / 2,
        y: wRect.top - cRect.top + wRect.height / 2,
      });
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      setStep((s) => {
        const next = (s + 1) % 4;
        if (next === 0) setCycle((c) => c + 1);
        return next;
      });
    }, STEP_MS[step]);
    return () => clearTimeout(t);
  }, [step]);

  const cursorOnWord = step === 1 || step === 2;
  const showPopup = step === 2;
  const startPos = { x: Math.max(24, target.x - 70), y: target.y + 40 };
  const cursorPos = cursorOnWord ? target : startPos;
  const popupLeft = Math.max(0, Math.min(target.x - 90, 320 - 224));

  return (
    <div
      ref={containerRef}
      className="relative mx-auto max-w-md rounded-xl border border-parchment/10 bg-ink-soft px-6 py-9 sm:px-8 sm:py-10 overflow-hidden select-none"
    >
      <p className="font-serif text-lg sm:text-xl leading-relaxed text-parchment/90">
        {DEMO.before}
        <span
          ref={wordRef}
          style={{
            textDecoration: "underline",
            textDecorationStyle: "dashed",
            textDecorationColor: "rgba(232,163,61,0.5)",
            textUnderlineOffset: "4px",
          }}
        >
          {DEMO.word}
        </span>
        {DEMO.after}
      </p>

      {/* animated cursor */}
      <motion.div
        className="pointer-events-none absolute z-20"
        animate={{ left: cursorPos.x, top: cursorPos.y }}
        transition={{ duration: 0.6, ease: "easeInOut" }}
        style={{ marginLeft: -5, marginTop: -5 }}
      >
        <div className="w-2.5 h-2.5 rounded-full bg-parchment shadow-[0_0_10px_rgba(0,0,0,0.5)]" />
      </motion.div>

      {/* click ripple */}
      <AnimatePresence>
        {showPopup && (
          <motion.div
            key={`ripple-${cycle}`}
            className="pointer-events-none absolute z-10 rounded-full border-2 border-lamp"
            style={{
              left: target.x,
              top: target.y,
              width: 6,
              height: 6,
              marginLeft: -3,
              marginTop: -3,
            }}
            initial={{ opacity: 0.9, scale: 0.5 }}
            animate={{ opacity: 0, scale: 7 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        )}
      </AnimatePresence>

      {/* lookup popup, mirrors the real WordLookup card */}
      <AnimatePresence>
        {showPopup && (
          <motion.div
            key={`popup-${cycle}`}
            initial={{ opacity: 0, scale: 0.92, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: -6 }}
            transition={{ duration: 0.2, ease: "easeOut", delay: 0.22 }}
            className="absolute z-30 w-56 bg-ink border border-lamp/30 rounded-lg p-4 shadow-2xl text-left"
            style={{ left: popupLeft, top: target.y + 18 }}
          >
            <div className="flex items-start justify-between mb-1">
              <span className="font-serif text-base text-lamp">{DEMO.word}</span>
              <span className="text-muted text-xs font-mono">✕</span>
            </div>
            <p className="text-xs text-muted mb-3">{DEMO.definition}</p>
            <p className="text-[10px] font-mono uppercase tracking-wide text-muted mb-1.5">
              Synonyms
            </p>
            <div className="flex flex-wrap gap-1.5">
              {DEMO.synonyms.map((s, i) => (
                <motion.span
                  key={s}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.32 + i * 0.06 }}
                  className="text-xs text-parchment bg-parchment/10 px-2 py-1 rounded-full"
                >
                  {s}
                </motion.span>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <p className="mt-9 text-center font-mono text-[10px] uppercase tracking-widest text-faint">
        double-click any word to look it up
      </p>
    </div>
  );
}