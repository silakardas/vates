"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type LookupResult = {
  word: string;
  definition?: string;
  example?: string;
  synonyms: string[];
  notFound?: boolean;
};

export default function WordLookup(props: {
  word: string;
  x: number;
  y: number;
  onClose: () => void;
}) {
  const [result, setResult] = useState<LookupResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchLookup() {
      const word = props.word.toLowerCase().trim();
      if (!word) return;

      let definition: string | undefined;
      let example: string | undefined;
      let synonyms: string[] = [];
      let notFound = false;

      try {
        const defRes = await fetch(
          `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`
        );
        if (defRes.ok) {
          const data = await defRes.json();
          const meanings = data?.[0]?.meanings ?? [];

          // The first definition of the first meaning rarely has an
          // "example" field filled in, so the sentence was missing most
          // of the time. Use it for the definition text, but scan every
          // definition across every meaning to find the first one that
          // actually has an example sentence attached.
          definition = meanings[0]?.definitions?.[0]?.definition;

          for (const meaning of meanings) {
            const withExample = meaning?.definitions?.find(
              (d: { example?: string }) => d.example
            );
            if (withExample) {
              example = withExample.example;
              break;
            }
          }
        } else {
          notFound = true;
        }
      } catch {
        notFound = true;
      }

      try {
        const synRes = await fetch(
          `https://api.datamuse.com/words?rel_syn=${encodeURIComponent(word)}&max=5`
        );
        if (synRes.ok) {
          const data = await synRes.json();
          synonyms = data.map((d: { word: string }) => d.word);
        }
        // rel_syn only matches strict WordNet synsets, so it comes back empty
        // for most everyday words. Fall back to the much broader "means like"
        // constraint so the panel still has something useful to show.
        if (synonyms.length === 0) {
          const mlRes = await fetch(
            `https://api.datamuse.com/words?ml=${encodeURIComponent(word)}&max=6`
          );
          if (mlRes.ok) {
            const data = await mlRes.json();
            synonyms = data
              .map((d: { word: string }) => d.word)
              .filter((w: string) => w.toLowerCase() !== word)
              .slice(0, 5);
          }
        }
      } catch {
        // synonyms are best-effort
      }

      if (!cancelled) {
        setResult({ word, definition, example, synonyms, notFound: notFound && synonyms.length === 0 });
        setLoading(false);
      }
    }

    fetchLookup();
    return () => {
      cancelled = true;
    };
  }, [props.word]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: -6 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: -6 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        className="fixed z-50 w-64 bg-ink border border-lamp/30 rounded-lg p-4 shadow-2xl"
        style={{ top: props.y + 12, left: Math.min(props.x, window.innerWidth - 280) }}
      >
        <div className="flex items-start justify-between mb-1">
          <span className="font-serif text-lg text-lamp">{props.word}</span>
          <button
            onClick={props.onClose}
            className="text-muted hover:text-parchment text-xs font-mono transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {loading && (
          <div className="flex items-center gap-1.5 py-1">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-muted"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
              />
            ))}
          </div>
        )}

        {!loading && result && (
          <>
            {result.definition && (
              <p className="text-xs text-muted mb-3">{result.definition}</p>
            )}

            {result.synonyms.length > 0 && (
              <>
                <p className="text-[10px] font-mono uppercase tracking-wide text-muted mb-1.5">
                  Synonyms
                </p>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {result.synonyms.map((s, i) => (
                    <motion.span
                      key={s}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05 }}
                      className="text-xs text-parchment bg-parchment/10 px-2 py-1 rounded-full"
                    >
                      {s}
                    </motion.span>
                  ))}
                </div>
              </>
            )}

            {result.example && (
              <p className="text-xs italic text-muted border-l-2 border-plum pl-2">
                &quot;{result.example}&quot;
              </p>
            )}

            {!result.definition && result.synonyms.length === 0 && (
              <p className="text-xs text-muted">
                No results for this word.
              </p>
            )}
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}