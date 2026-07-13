"use client";

import { useState } from "react";
import Header from "@/components/Header";

export default function SettingsPage() {
  const [name, setName] = useState("");
  const [dailyGoal, setDailyGoal] = useState(300);

  return (
    <>
      <Header />
      <main className="text-parchment px-8 py-16 max-w-md mx-auto">
        <h1 className="font-serif text-2xl mb-10">Settings</h1>

        <div className="space-y-8">
          <div>
            <label className="block font-mono text-xs text-muted uppercase tracking-wide mb-2">
              Display name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="What should we call you?"
              className="w-full bg-ink-soft rounded px-4 py-2.5 outline-none border border-parchment/10 focus:border-lamp/40 transition-colors placeholder:text-muted/50"
            />
          </div>

          <div>
            <label className="block font-mono text-xs text-muted uppercase tracking-wide mb-2">
              Daily word goal
            </label>
            <input
              type="number"
              value={dailyGoal}
              onChange={(e) => setDailyGoal(Number(e.target.value))}
              className="w-full bg-ink-soft rounded px-4 py-2.5 outline-none border border-parchment/10 focus:border-lamp/40 transition-colors"
            />
            <p className="text-xs text-muted mt-2">
              Used to keep your writing streak going.
            </p>
          </div>

          <div className="pt-4 border-t border-parchment/10">
            <p className="text-xs text-muted">
              More settings — like account, export, and theme options — are on
              the way.
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
