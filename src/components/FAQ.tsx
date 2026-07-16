"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const FAQS: { q: string; a: string }[] = [
  {
    q: "Is what I write saved?",
    a: "Yes — once you have an account, everything autosaves as you type. Writing without an account is great for trying things out, but it only lives in that browser session, so create an account before you close the tab.",
  },
  {
    q: "Can I write without an internet connection?",
    a: "The editor itself works fine offline — you can keep typing. With an account, though, changes only sync once you're back online, so try not to close the tab until they do.",
  },
  {
    q: "Is it free?",
    a: "Yes. Vates is in beta right now, and there's no paywall.",
  },
  {
    q: "Can I export what I write?",
    a: "Yes — from your workshop settings you can export any story as a plain text file, so your words are never locked in.",
  },
];

function PlusMinus({ open }: { open: boolean }) {
  return (
    <span className="relative flex-shrink-0 w-5 h-5">
      <span className="absolute left-0 top-1/2 w-full h-px -translate-y-1/2 bg-lamp" />
      <motion.span
        animate={{ rotate: open ? 90 : 0, opacity: open ? 0 : 1 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="absolute left-1/2 top-0 w-px h-full -translate-x-1/2 bg-lamp"
      />
    </span>
  );
}

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="relative px-5 sm:px-8 pb-16">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-4">
          <span className="h-px flex-1 bg-parchment/10" />
          <p className="font-mono text-[11px] uppercase tracking-widest text-faint whitespace-nowrap">
            Questions
          </p>
          <span className="h-px flex-1 bg-parchment/10" />
        </div>

        <div>
          {FAQS.map((item, i) => {
            const open = openIndex === i;
            return (
              <motion.div
                key={item.q}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.4, delay: i * 0.05, ease: "easeOut" }}
                className="border-b border-parchment/10"
              >
                <button
                  onClick={() => setOpenIndex(open ? null : i)}
                  className="w-full flex items-center justify-between gap-4 py-5 text-left"
                >
                  <span className="font-serif text-base text-parchment">{item.q}</span>
                  <PlusMinus open={open} />
                </button>
                <AnimatePresence initial={false}>
                  {open && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                      className="overflow-hidden"
                    >
                      <p className="text-sm text-muted leading-relaxed pb-5 pr-0 sm:pr-8">{item.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}