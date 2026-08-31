"use client";

import { motion } from "framer-motion";
import { useState } from "react";

// A quiet decorative layer for the story map canvas: a soft twinkling
// starfield plus a handful of drifting fireflies in the app's lamp/plum
// palette. Purely visual — pointer-events-none, sits behind the
// connection lines and node cards.
export default function StoryMapAmbience() {
  // Lazy useState initializers (not useMemo) so Math.random() only ever
  // runs once per mount, not on every render — the same pattern EmberField
  // uses for its embers.
  const [stars] = useState(() =>
    Array.from({ length: 46 }, (_, i) => ({
      id: i,
      top: Math.random() * 100,
      left: Math.random() * 100,
      size: 1 + Math.random() * 1.4,
      delay: Math.random() * 6,
      duration: 3 + Math.random() * 4,
    }))
  );

  const [fireflies] = useState(() =>
    Array.from({ length: 9 }, (_, i) => ({
      id: i,
      top: 8 + Math.random() * 84,
      left: 4 + Math.random() * 92,
      delay: Math.random() * 9,
      duration: 11 + Math.random() * 9,
      driftX: (Math.random() - 0.5) * 90,
      driftY: (Math.random() - 0.5) * 70,
      color: i % 2 === 0 ? "var(--color-lamp)" : "var(--color-plum)",
    }))
  );

  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none rounded-xl"
      aria-hidden="true"
    >
      {stars.map((s) => (
        <motion.span
          key={`star-${s.id}`}
          className="absolute rounded-full bg-parchment"
          style={{ top: `${s.top}%`, left: `${s.left}%`, width: s.size, height: s.size }}
          animate={{ opacity: [0.08, 0.6, 0.08] }}
          transition={{
            duration: s.duration,
            delay: s.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
      {fireflies.map((f) => (
        <motion.span
          key={`firefly-${f.id}`}
          className="absolute rounded-full"
          style={{
            top: `${f.top}%`,
            left: `${f.left}%`,
            width: 3,
            height: 3,
            backgroundColor: f.color,
            boxShadow: `0 0 7px 1.5px ${f.color}`,
          }}
          animate={{
            opacity: [0, 0.85, 0],
            x: [0, f.driftX, 0],
            y: [0, f.driftY, 0],
          }}
          transition={{
            duration: f.duration,
            delay: f.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}