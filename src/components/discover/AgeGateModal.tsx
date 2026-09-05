"use client";

import { motion, AnimatePresence } from "framer-motion";

// Shown in place of a mature story's content until the reader confirms
// they're 18+. Deliberately simple — no separate content-warning tags,
// no "remember for this device" checkbox: confirming persists straight
// to the account (see AuthContext's confirmAge) for logged-in readers,
// so this only ever appears once per account. For a logged-out visitor
// there's no account to persist to, so onConfirm only clears it for the
// current page load (see the two discover pages) — declining sends them
// back rather than leaving the story visible.
export default function AgeGateModal({
  onConfirm,
  onDecline,
}: {
  onConfirm: () => void;
  onDecline: () => void;
}) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 sm:p-6"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 10 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="w-full max-w-sm bg-ink border border-parchment/10 rounded-2xl shadow-2xl p-6 text-center"
        >
          <p className="font-mono text-[10px] uppercase tracking-wide text-lamp mb-1.5">
            Mature content
          </p>
          <h2 className="font-serif text-xl text-parchment mb-2">Are you 18 or older?</h2>
          <p className="text-sm text-muted leading-relaxed mb-6">
            The author has marked this story as mature. You&apos;ll only be asked this once.
          </p>
          <div className="flex flex-col gap-2">
            <button
              onClick={onConfirm}
              className="w-full bg-lamp/15 border border-lamp/40 text-lamp text-sm font-mono py-2.5 rounded-lg hover:bg-lamp/25 transition-colors"
            >
              Yes, I&apos;m 18+
            </button>
            <button
              onClick={onDecline}
              className="w-full text-muted text-sm font-mono py-2 hover:text-parchment transition-colors"
            >
              Take me back
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}