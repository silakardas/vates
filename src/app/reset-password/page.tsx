"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  // The recovery link only attaches a session a moment after the page
  // loads (Supabase parses it from the URL client-side), so we wait for
  // that PASSWORD_RECOVERY event before showing the form. Otherwise a
  // stale/missing link would silently fail on submit instead of telling
  // the user upfront.
  const [ready, setReady] = useState(false);
  const [linkInvalid, setLinkInvalid] = useState(false);
  const { updatePassword } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    let resolved = false;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        // Some Supabase versions fire SIGNED_IN instead of
        // PASSWORD_RECOVERY once the recovery token is exchanged.
        resolved = true;
        setReady(true);
      }
    });

    // If a session is already present (e.g. link already processed on
    // load) treat the link as valid right away; otherwise give the
    // recovery event a few seconds to arrive before giving up.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        resolved = true;
        setReady(true);
      }
    });

    const timeout = setTimeout(() => {
      if (!resolved) setLinkInvalid(true);
    }, 4000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setSubmitting(true);
    const result = await updatePassword(newPassword);
    setSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }
    setSuccess(true);
    setTimeout(() => router.push("/workshop"), 1500);
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
          {linkInvalid ? (
            <>
              <h1 className="font-serif text-2xl text-parchment mb-1.5">Link expired</h1>
              <p className="text-muted text-sm leading-relaxed">
                This reset link is invalid or has expired. Please request a
                new one.
              </p>
              <Link
                href="/forgot-password"
                className="inline-block mt-5 text-lamp hover:underline text-sm"
              >
                Request a new link
              </Link>
            </>
          ) : success ? (
            <>
              <h1 className="font-serif text-2xl text-parchment mb-1.5">Password updated</h1>
              <p className="text-muted text-sm leading-relaxed">
                Taking you back to your workshop…
              </p>
            </>
          ) : !ready ? (
            <>
              <h1 className="font-serif text-2xl text-parchment mb-1.5">One moment</h1>
              <p className="text-muted text-sm leading-relaxed">
                Verifying your reset link…
              </p>
            </>
          ) : (
            <>
              <h1 className="font-serif text-2xl text-parchment mb-1.5">Choose a new password</h1>
              <p className="text-muted text-sm mb-7">
                Pick something you&apos;ll remember this time.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-wide text-muted mb-1.5">
                    New password
                  </label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-ink-soft rounded-lg px-4 py-2.5 text-parchment outline-none border border-parchment/10 focus:border-lamp/40 transition-colors placeholder:text-faint"
                  />
                </div>
                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-wide text-muted mb-1.5">
                    Confirm password
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
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
                  {submitting ? "Saving…" : "Save new password"}
                </motion.button>
              </form>
            </>
          )}
        </div>
      </motion.div>
    </main>
  );
}