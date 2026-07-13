"use client";

import { motion } from "framer-motion";
import { ActivityDay } from "@/lib/activity";

const LEVEL_STYLES: Record<ActivityDay["level"], string> = {
  0: "bg-parchment/[0.06]",
  1: "bg-lamp/25",
  2: "bg-lamp/55",
  3: "bg-lamp",
};

export default function ActivityStrip(props: { days: ActivityDay[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {props.days.map((d, i) => (
        <motion.div
          key={d.date.toISOString()}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.25, delay: i * 0.015 }}
          title={d.date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          className={`w-3.5 h-3.5 rounded-sm ${LEVEL_STYLES[d.level]}`}
        />
      ))}
    </div>
  );
}
