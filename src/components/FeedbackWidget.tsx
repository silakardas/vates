"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/AuthContext";

const FEEDBACK_EMAIL = "vates.app.feedback@gmail.com";

const TYPES = ["Bug", "Idea", "Something else"] as const;
type FeedbackType = (typeof TYPES)[number];

export default function FeedbackWidget() {
  const { user } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<FeedbackType>("Bug");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  function handleSend() {
    if (!message.trim()) return;
    const subject = encodeURIComponent(`[Vates Beta] ${type}`);
    const body = encodeURIComponent(
      `${message}\n\n—\nFrom: ${user?.email ?? "not signed in"}\nPage: ${
        typeof window !== "undefined" ? window.location.href : ""
      }`
    );
    window.location.href = `mailto:${FEEDBACK_EMAIL}?subject=${subject}&body=${body}`;
    setSent(true);
  }

  function handleToggle() {
    setOpen((o) => !o);
    if (open) {
      setSent(false);
      setMessage("");
    }
  }

  // Stay out of the way on the editor page — the writing area needs the
  // full screen, and this button just gets in the way there.
  const isEditorPage = pathname?.startsWith("/story/");
  if (isEditorPage) return null;

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="w-72 bg-ink-soft border border-parchment/15 rounded-xl p-4 shadow-2xl"
          >
            {!sent ? (
              <>
                <p className="font-serif text-sm text-parchment mb-3">
                  Something to tell us?
                </p>
                <div className="flex gap-1.5 mb-3">
                  {TYPES.map((t) => (
                    <button
                      key={t}
                      onClick={() => setType(t)}
                      className={`text-[10px] font-mono uppercase tracking-wide px-2 py-1 rounded-full border transition-colors ${
                        type === t
                          ? "bg-lamp/15 border-lamp/40 text-lamp"
                          : "border-parchment/10 text-muted hover:text-parchment"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="What happened, or what's on your mind..."
                  rows={4}
                  className="w-full bg-ink rounded-lg px-3 py-2 text-xs leading-relaxed outline-none border border-parchment/10 focus:border-lamp/40 transition-colors placeholder:text-faint resize-none mb-3"
                />
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] text-faint leading-snug">
                    Opens your email app, addressed to us.
                  </p>
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={handleSend}
                    disabled={!message.trim()}
                    className="bg-lamp text-ink text-xs font-semibold px-4 py-1.5 rounded-full disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                  >
                    Send
                  </motion.button>
                </div>
              </>
            ) : (
              <div className="py-2">
                <p className="font-serif text-sm text-parchment mb-1">Thank you 🕯️</p>
                <p className="text-xs text-muted leading-relaxed">
                  Your email app should be open now. If nothing happened, write
                  to us directly at{" "}
                  <a
                    href={`mailto:${FEEDBACK_EMAIL}`}
                    className="text-lamp hover:underline"
                  >
                    {FEEDBACK_EMAIL}
                  </a>
                  .
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleToggle}
        className="flex items-center gap-2 bg-ink-soft border border-parchment/15 text-muted hover:text-lamp hover:border-lamp/30 text-xs font-mono px-4 py-2.5 rounded-full shadow-lg transition-colors"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-lamp" />
        {open ? "Close" : "Send feedback"}
      </motion.button>
    </div>
  );
}