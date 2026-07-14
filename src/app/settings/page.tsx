"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import Header from "@/components/Header";
import { useAuth } from "@/lib/AuthContext";

const GOAL_PRESETS = [200, 300, 500, 1000];

export default function SettingsPage() {
  const { user, updateProfile } = useAuth();

  const [name, setName] = useState("");
  const [dailyGoal, setDailyGoal] = useState(300);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setDailyGoal(user.dailyGoal ?? 300);
    }
  }, [user]);

  if (!user) {
    return (
      <>
        <Header />
        <main className="px-8 py-24 text-center">
          <p className="text-muted mb-4">You&apos;re not logged in.</p>
          <Link href="/login" className="text-lamp hover:underline text-sm">
            Go to login →
          </Link>
        </main>
      </>
    );
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    if (!name.trim()) {
      setError("Display name can't be empty.");
      return;
    }
    if (dailyGoal < 1) {
      setError("Daily goal must be at least 1 word.");
      return;
    }

    setSaving(true);
    const result = await updateProfile({ name: name.trim(), dailyGoal });
    setSaving(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <>
      <Header />
      <main className="text-parchment px-8 py-16 max-w-md mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <h1 className="font-serif text-2xl mb-1">Settings</h1>
          <p className="text-sm text-muted mb-10">
            Update how Vates greets you and tracks your writing.
          </p>
        </motion.div>

        <form onSubmit={handleSave} className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05, ease: "easeOut" }}
            className="bg-panel border border-parchment/10 rounded-xl px-6 py-5"
          >
            <p className="font-mono text-[10px] uppercase tracking-widest text-faint mb-4">
              Profile
            </p>
            <label className="block font-mono text-xs text-muted uppercase tracking-wide mb-2">
              Display name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="What should we call you?"
              maxLength={40}
              className="w-full bg-ink-soft rounded-lg px-4 py-2.5 outline-none border border-parchment/10 focus:border-lamp/40 transition-colors placeholder:text-muted/50"
            />
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-muted">Shown on your stories and in the header.</p>
              <p className="text-[10px] font-mono text-faint">{name.length}/40</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
            className="bg-panel border border-parchment/10 rounded-xl px-6 py-5"
          >
            <p className="font-mono text-[10px] uppercase tracking-widest text-faint mb-4">
              Writing goal
            </p>
            <label className="block font-mono text-xs text-muted uppercase tracking-wide mb-2">
              Daily word goal
            </label>
            <input
              type="number"
              min={1}
              value={dailyGoal}
              onChange={(e) => setDailyGoal(Number(e.target.value))}
              className="w-full bg-ink-soft rounded-lg px-4 py-2.5 outline-none border border-parchment/10 focus:border-lamp/40 transition-colors"
            />
            <div className="flex flex-wrap gap-2 mt-3">
              {GOAL_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setDailyGoal(preset)}
                  className={`text-xs font-mono px-3 py-1.5 rounded-full border transition-colors ${
                    dailyGoal === preset
                      ? "bg-lamp/20 border-lamp/50 text-lamp"
                      : "border-parchment/10 text-muted hover:text-parchment hover:border-parchment/20"
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted mt-3">
              Used to keep your writing streak going on the workshop dashboard.
            </p>
          </motion.div>

          {error && <p className="text-xs text-red-400">{error}</p>}
          {saved && <p className="text-xs text-completed">Saved.</p>}

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15, ease: "easeOut" }}
            className="flex items-center gap-4 pt-2"
          >
            <button
              type="submit"
              disabled={saving}
              className="bg-lamp text-ink text-sm font-semibold px-5 py-2.5 rounded-lg disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
            <Link
              href="/account"
              className="text-sm text-muted hover:text-parchment transition-colors"
            >
              Back to account
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2, ease: "easeOut" }}
            className="pt-4 border-t border-parchment/10"
          >
            <p className="text-xs text-muted">
              More settings — like export and theme options — are on the way.
            </p>
          </motion.div>
        </form>
      </main>
    </>
  );
}