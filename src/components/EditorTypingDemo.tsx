"use client";

import { useEffect, useState } from "react";

const LINE = "The rain hadn't stopped since Tuesday.";
const TYPE_MS = 55;
const PAUSE_MS = 1600;
const ERASE_MS = 22;

export default function EditorTypingDemo() {
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<"typing" | "pause" | "erasing">("typing");

  useEffect(() => {
    if (phase === "typing") {
      if (text.length < LINE.length) {
        const t = setTimeout(() => setText(LINE.slice(0, text.length + 1)), TYPE_MS);
        return () => clearTimeout(t);
      }
      const t = setTimeout(() => setPhase("pause"), PAUSE_MS);
      return () => clearTimeout(t);
    }
    if (phase === "pause") {
      const t = setTimeout(() => setPhase("erasing"), 400);
      return () => clearTimeout(t);
    }
    if (text.length > 0) {
      const t = setTimeout(() => setText(text.slice(0, -1)), ERASE_MS);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setPhase("typing"), 500);
    return () => clearTimeout(t);
  }, [text, phase]);

  return (
    <div className="rounded-xl border border-parchment/10 bg-ink-soft px-6 py-7 h-full flex flex-col justify-center">
      <div className="flex gap-1.5 mb-5">
        <span className="w-2 h-2 rounded-full bg-parchment/15" />
        <span className="w-2 h-2 rounded-full bg-parchment/15" />
        <span className="w-2 h-2 rounded-full bg-parchment/15" />
      </div>
      <p className="font-serif text-base text-parchment/90 leading-relaxed min-h-[3.5em]">
        {text}
        <span className="inline-block w-[2px] h-[1.1em] bg-lamp align-middle ml-0.5 animate-pulse" />
      </p>
      <p className="mt-6 font-mono text-[10px] uppercase tracking-widest text-faint">
        just you and the page
      </p>
    </div>
  );
}