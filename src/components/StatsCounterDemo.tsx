"use client";

import { useEffect, useState } from "react";

const TARGET = 4218;
const DURATION_MS = 1800;
const PAUSE_MS = 2200;
const BARS = [40, 65, 30, 80, 55, 90, 45];

export default function StatsCounterDemo() {
  const [count, setCount] = useState(0);
  const [grown, setGrown] = useState(false);

  useEffect(() => {
    let raf: number;
    const start = performance.now();

    function tick(now: number) {
      const progress = Math.min(1, (now - start) / DURATION_MS);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * TARGET));
      if (progress < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        setGrown(true);
      }
    }
    raf = requestAnimationFrame(tick);

    const reset = setTimeout(() => {
      setCount(0);
      setGrown(false);
    }, DURATION_MS + PAUSE_MS);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(reset);
    };
  }, []);

  return (
    <div className="rounded-xl border border-parchment/10 bg-ink-soft px-6 py-7 h-full flex flex-col justify-center items-center text-center">
      <p className="font-serif text-3xl text-parchment tabular-nums">
        {count.toLocaleString("en-US")}
      </p>
      <p className="font-mono text-[10px] uppercase tracking-widest text-faint mb-5">
        words written
      </p>
      <div className="flex items-end gap-1 h-10">
        {BARS.map((h, i) => (
          <span
            key={i}
            className="w-2 rounded-t-sm bg-lamp/60 transition-all ease-out"
            style={{
              height: grown ? `${h}%` : "6%",
              transitionDuration: "700ms",
              transitionDelay: `${i * 60}ms`,
            }}
          />
        ))}
      </div>
      <p className="mt-6 font-mono text-[10px] uppercase tracking-widest text-faint">
        every day, counted
      </p>
    </div>
  );
}