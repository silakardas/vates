"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { signup } = useAuth();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const result = await signup(email, password, name);
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.needsConfirmation) {
      setNeedsConfirmation(true);
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
          {needsConfirmation ? (
            <>
              <h1 className="font-serif text-2xl text-parchment mb-1.5">Check your email</h1>
              <p className="text-muted text-sm leading-relaxed">
                We sent a confirmation link to <strong>{email}</strong>. Click it
                to activate your account, then come back and log in.
              </p>
            </>
          ) : (
          <>
          <h1 className="font-serif text-2xl text-parchment mb-1.5">Start your atelier</h1>
          <p className="text-muted text-sm mb-7">
            A quiet place for your stories, just for you.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-wide text-muted mb-1.5">
                Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="What should we call you?"
                className="w-full bg-ink-soft rounded-lg px-4 py-2.5 text-parchment outline-none border border-parchment/10 focus:border-lamp/40 transition-colors placeholder:text-faint"
              />
            </div>
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
              {submitting ? "Creating…" : "Create account"}
            </motion.button>
          </form>

          <p className="text-center text-[11px] text-faint mt-5 leading-relaxed">
            By creating an account you agree to our{" "}
            <Link href="/terms" className="text-muted hover:text-lamp transition-colors">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-muted hover:text-lamp transition-colors">
              Privacy Policy
            </Link>
            .
          </p>
          </>
          )}
        </div>

        <p className="text-center text-sm text-muted mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-lamp hover:underline">
            Log in
          </Link>
        </p>
      </motion.div>
    </main>
  );
}
