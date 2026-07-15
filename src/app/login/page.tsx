"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { setRememberMe } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    // Must be set before login() so the session lands in the right storage.
    setRememberMe(remember);
    const { error } = await login(email, password);
    setSubmitting(false);
    if (error) {
      setError(error);
      return;
    }
    router.push("/workshop");
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-16">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-sm"
      >
        <Link href="/" className="flex items-center gap-2.5 justify-center mb-10">
          <span
            className="brand-flicker w-2.5 h-2.5 rounded-full"
            style={{
              background:
                "radial-gradient(circle at 35% 30%, #F2BD6B, #E8A33D 60%, #a8571f 100%)",
            }}
          />
          <span className="font-serif text-2xl text-parchment">vates</span>
        </Link>

        <div className="bg-panel border border-parchment/10 rounded-2xl px-8 py-9">
          <h1 className="font-serif text-2xl text-parchment mb-1.5">Welcome back</h1>
          <p className="text-muted text-sm mb-7">
            Your stories have been waiting.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-wide text-muted mb-1.5">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-ink-soft rounded-lg px-4 py-2.5 text-parchment outline-none border border-parchment/10 focus:border-lamp/40 transition-colors placeholder:text-faint"
              />
            </div>
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-wide text-muted mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-ink-soft rounded-lg px-4 py-2.5 text-parchment outline-none border border-parchment/10 focus:border-lamp/40 transition-colors placeholder:text-faint"
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-muted select-none cursor-pointer">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="w-4 h-4 rounded border-parchment/20 bg-ink-soft accent-lamp"
              />
              Remember me
            </label>

            {error && (
              <p className="text-xs text-red-400 leading-relaxed">{error}</p>
            )}

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              type="submit"
              disabled={submitting}
              className="w-full bg-lamp text-ink font-semibold py-2.5 rounded-lg mt-2 disabled:opacity-60"
            >
              {submitting ? "Logging in…" : "Log in"}
            </motion.button>
          </form>
        </div>

        <p className="text-center text-sm text-muted mt-6">
          New here?{" "}
          <Link href="/signup" className="text-lamp hover:underline">
            Create an account
          </Link>
        </p>

        <p className="text-center text-[11px] text-faint mt-3">
          <Link href="/terms" className="hover:text-muted transition-colors">
            Terms
          </Link>
          {" · "}
          <Link href="/privacy" className="hover:text-muted transition-colors">
            Privacy
          </Link>
        </p>
      </motion.div>
    </main>
  );
}