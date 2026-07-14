"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { useAuth } from "@/lib/AuthContext";

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
        <h1 className="font-serif text-2xl mb-10">Settings</h1>

        <form onSubmit={handleSave} className="space-y-8">
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
              min={1}
              value={dailyGoal}
              onChange={(e) => setDailyGoal(Number(e.target.value))}
              className="w-full bg-ink-soft rounded px-4 py-2.5 outline-none border border-parchment/10 focus:border-lamp/40 transition-colors"
            />
            <p className="text-xs text-muted mt-2">
              Used to keep your writing streak going.
            </p>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}
          {saved && <p className="text-xs text-completed">Saved.</p>}

          <div className="flex items-center gap-4">
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
          </div>

          <div className="pt-4 border-t border-parchment/10">
            <p className="text-xs text-muted">
              More settings — like export and theme options — are on the way.
            </p>
          </div>
        </form>
      </main>
    </>
  );
}
