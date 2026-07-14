"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import ChallengeBanner from "@/components/ChallengeBanner";
import EmberField from "@/components/EmberField";
import { useStories } from "@/lib/StoryContext";
import { useAuth } from "@/lib/AuthContext";
import { randomLine, timeGreeting } from "@/lib/greeting";
import { totalWordCount } from "@/lib/types";
import Footer from "@/components/Footer";

function excerptFrom(html: string) {
  const text = html.replace(/<[^>]+>/g, "").trim();
  return text.length > 0 ? text.slice(0, 120) : "An empty page, waiting.";
}

export default function Home() {
  const router = useRouter();
  const { createStory, stories } = useStories();
  const { user } = useAuth();
  const [intro, setIntro] = useState<{ line: string; greeting: string } | null>(null);

  const glimpses = [...stories]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 3);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client-only init to avoid SSR hydration mismatch (random line + local time)
    setIntro({ line: randomLine(), greeting: timeGreeting(user?.name) });
  }, [user?.name]);

  function handleEnter() {
    if (user) {
      router.push("/workshop");
    } else {
      router.push("/signup");
    }
  }

  return (
    <>
      <Header />
      <ChallengeBanner
        prompt="Describe your favorite object as if it were a person."
      />
      <main className="relative flex flex-col items-center justify-center text-center px-8 overflow-hidden text-parchment" style={{ minHeight: "calc(100vh - 121px)" }}>
        <EmberField />

        <AnimatePresence>
          {intro && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="relative z-10 max-w-lg"
            >
              <motion.span
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                className="block w-2.5 h-2.5 rounded-full mx-auto mb-8"
                style={{
                  background:
                    "radial-gradient(circle at 35% 30%, #F2BD6B, #E8A33D 60%, #a8571f 100%)",
                  boxShadow: "0 0 24px rgba(232,163,61,0.55)",
                }}
              />

              <p className="font-mono text-xs uppercase tracking-widest text-lamp mb-4">
                {intro.greeting}
              </p>
              <h1 className="font-serif italic text-3xl md:text-4xl leading-snug text-parchment mb-10">
                {intro.line}
              </h1>

              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={handleEnter}
                className="bg-lamp text-ink font-semibold px-8 py-3.5 rounded-full"
              >
                {user ? "Enter your atelier" : "Begin"}
              </motion.button>

              {!user && (
                <p className="mt-5 text-xs text-muted">
                  Already writing here?{" "}
                  <button onClick={() => router.push("/login")} className="text-lamp hover:underline">
                    Log in
                  </button>
                </p>
              )}
              
             {!user && (
  <button
    onClick={() => {
      const story = createStory();
      router.push(`/story/${story.id}`);
    }}
    className="mt-10 block mx-auto text-xs font-mono text-faint hover:text-muted transition-colors"
  >
    or just start writing, no account needed →
  </button>
)}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {!user && (
        <section className="relative px-8 pb-16">
          <div className="max-w-4xl mx-auto bg-ink-soft border border-parchment/10 rounded-2xl px-8 py-9">
            <p className="font-mono text-[10px] uppercase tracking-widest text-faint mb-7 text-center">
              How it works
            </p>
            <div className="grid gap-8 sm:grid-cols-3 sm:divide-x sm:divide-parchment/10">
              {[
                {
                  n: "01",
                  title: "Begin",
                  copy: "Jump straight into the editor — no account needed to try it out.",
                },
                {
                  n: "02",
                  title: "Keep it",
                  copy: "Make a free account to save your stories, characters, and notes for good.",
                },
                {
                  n: "03",
                  title: "Build a habit",
                  copy: "Follow the daily challenge, keep a streak, and watch your words add up.",
                },
              ].map((step, i) => (
                <motion.div
                  key={step.n}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.4, delay: i * 0.08, ease: "easeOut" }}
                  className="sm:px-6 first:sm:pl-0 last:sm:pr-0 text-center sm:text-left"
                >
                  <span className="font-mono text-xs text-lamp block mb-2">{step.n}</span>
                  <h3 className="font-serif text-lg text-parchment mb-1.5">{step.title}</h3>
                  <p className="text-sm text-muted leading-relaxed">{step.copy}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {glimpses.length > 0 && (
        <section className="relative px-8 pb-24 pt-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-4 mb-10">
              <span className="h-px flex-1 bg-parchment/10" />
              <p className="font-mono text-[11px] uppercase tracking-widest text-faint whitespace-nowrap">
                Written here recently
              </p>
              <span className="h-px flex-1 bg-parchment/10" />
            </div>

            <div className="grid gap-6 sm:grid-cols-3">
              {glimpses.map((story, i) => (
                <motion.div
                  key={story.id}
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.5, delay: i * 0.08, ease: "easeOut" }}
                  className="bg-ink-soft border border-parchment/10 rounded-xl px-5 py-5"
                >
                  <p className="text-muted italic text-sm leading-relaxed mb-4">
                    &quot;{excerptFrom(story.chapters[story.chapters.length - 1]?.content ?? "")}&quot;
                  </p>
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-serif text-sm text-parchment truncate">
                      {story.title}
                    </span>
                    <span className="font-mono text-[10px] text-faint whitespace-nowrap">
                      {totalWordCount(story).toLocaleString("en-US")}w
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}
      <Footer />
    </>
  );
}
