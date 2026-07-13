"use client";

import { motion } from "framer-motion";
import { useState } from "react";

export default function EmberField() {
  const [embers] = useState(() =>
    Array.from({ length: 14 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 6,
      duration: 6 + Math.random() * 5,
      size: 2 + Math.random() * 2.5,
      drift: (Math.random() - 0.5) * 40,
    }))
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {embers.map((e) => (
        <motion.span
          key={e.id}
          className="absolute rounded-full bg-lamp"
          style={{
            left: `${e.left}%`,
            bottom: "-10px",
            width: e.size,
            height: e.size,
            boxShadow: "0 0 6px rgba(232,163,61,0.8)",
          }}
          initial={{ opacity: 0, y: 0 }}
          animate={{
            opacity: [0, 0.8, 0],
            y: [0, -280],
            x: [0, e.drift],
          }}
          transition={{
            duration: e.duration,
            delay: e.delay,
            repeat: Infinity,
            ease: "easeOut",
          }}
        />
      ))}
    </div>
  );
}
