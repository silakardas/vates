"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import ChallengeBanner from "@/components/ChallengeBanner";
import EmberField from "@/components/EmberField";
import FAQ from "@/components/FAQ";
import WordLookupDemo from "@/components/WordLookupDemo";
import EditorTypingDemo from "@/components/EditorTypingDemo";
import StreakDemo from "@/components/StreakDemo";
import StatsCounterDemo from "@/components/StatsCounterDemo";
import { useStories } from "@/lib/StoryContext";
import { useAuth } from "@/lib/AuthContext";
import { randomLine, timeGreeting } from "@/lib/greeting";
import { getTodaysPrompt } from "@/lib/challenges";
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
  const [todaysPrompt, setTodaysPrompt] = useState<string | null>(null);

  const glimpses = [...stories]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 3);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client-only init to avoid SSR hydration mismatch (random line + local time)
    setIntro({ line: randomLine(), greeting: timeGreeting(user?.name) });
  }, [user?.name]);

  useEffect(() => {
    // Computed client-side (not baked in at build time) so the banner
    // rotates automatically based on the visitor's current date.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTodaysPrompt(getTodaysPrompt());
  }, []);

  function handleEnter() {
    if (user) {
      router.push("/workshop");
    } else {
      router.push("/signup");
    }
  }

  return (
    <>
      <EmberField />
      <Header />
      {todaysPrompt && <ChallengeBanner prompt={todaysPrompt} />}
      <main className="relative flex flex-col items-center justify-center text-center px-5 sm:px-8 overflow-hidden text-parchment min-h-[calc(100svh-89px)] sm:min-h-[calc(100svh-121px)]">
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
        <section className="relative px-5 sm:px-8 pb-16">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-4 mb-12">
              <span className="h-px flex-1 bg-parchment/10" />
              <p className="font-mono text-[11px] uppercase tracking-widest text-faint whitespace-nowrap">
                Why write here
              </p>
              <span className="h-px flex-1 bg-parchment/10" />
            </div>

            <div className="flex flex-col gap-14">
              {[
                {
                  n: "01",
                  title: "Nothing but the page",
                  copy: "A distraction-free editor with rich text. No clutter, no noise — just you and what you're writing.",
                  demo: <EditorTypingDemo />,
                  demoWidth: "sm:w-64",
                },
                {
                  n: "02",
                  title: "Map your story",
                  copy: "Save it for good, then sketch a map of its characters and events, and build a moodboard for each one.",
                },
                {
                  n: "03",
                  title: "Look it up, right there",
                  copy: "Double-click any word for a definition, synonyms, and an example sentence — without ever leaving the page.",
                  demo: <WordLookupDemo />,
                  demoWidth: "sm:w-96",
                },
                {
                  n: "04",
                  title: "A reason to return",
                  copy: "A new prompt every day, and a streak that's worth protecting.",
                  demo: <StreakDemo />,
                  demoWidth: "sm:w-64",
                },
                {
                  n: "05",
                  title: "Organize as it grows",
                  copy: "Tag your stories, filter your workshop, and export any of them as a text file whenever you like.",
                },
                {
                  n: "06",
                  title: "Everything, counted",
                  copy: "Total words, streaks, and a map of every day you showed up — all waiting in your workshop.",
                  demo: <StatsCounterDemo />,
                  demoWidth: "sm:w-64",
                },
              ].map((feature, i) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.4, delay: i * 0.05, ease: "easeOut" }}
                  className={`flex flex-col gap-6 ${
                    feature.demo ? "sm:flex-row sm:items-center sm:gap-10" : ""
                  }`}
                >
                  <div className="flex gap-4 flex-1">
                    <span className="font-serif italic text-3xl leading-none text-lamp/25 select-none">
                      {feature.n}
                    </span>
                    <div className="pt-0.5">
                      <h3 className="font-serif text-base text-parchment mb-1">{feature.title}</h3>
                      <p className="text-sm text-muted leading-relaxed">{feature.copy}</p>
                    </div>
                  </div>

                  {feature.demo && (
                    <div className={`w-full flex-shrink-0 ${feature.demoWidth}`}>{feature.demo}</div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {!user && (
        <section className="relative px-5 sm:px-8 pb-24 pt-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-4 mb-14">
              <span className="h-px flex-1 bg-parchment/10" />
              <p className="font-mono text-[11px] uppercase tracking-widest text-faint whitespace-nowrap">
                How it works
              </p>
              <span className="h-px flex-1 bg-parchment/10" />
            </div>

            <div className="relative">
              {/* a wandering ember trail linking the three steps — desktop only */}
              <svg
                className="hidden sm:block absolute left-0 right-0 top-[22px] w-full h-[120px] -z-10"
                viewBox="0 0 100 20"
                preserveAspectRatio="none"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M8,17 C22,17 24,3 42,3 C55,3 50,17 58,17 C72,17 74,3 92,3"
                  stroke="url(#trailGrad)"
                  strokeWidth="0.5"
                  strokeDasharray="0.5 3"
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="trailGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#E8A33D" stopOpacity="0.55" />
                    <stop offset="50%" stopColor="#9088C9" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#E8A33D" stopOpacity="0.55" />
                  </linearGradient>
                </defs>
              </svg>

              <div className="grid gap-12 sm:grid-cols-3">
                {[
                  {
                    icon: (
                      <path d="M12 2c1 4-3 5-3 9a3 3 0 006 0c0-1-1-2-1-3 2 1 3 3 3 5a5 5 0 01-10 0c0-5 4-6 5-11z" />
                    ),
                    title: "Just start",
                    copy: "Open a blank page and write — no account, no setup, nothing between you and the words.",
                    offset: "sm:mt-10",
                  },
                  {
                    icon: (
                      <>
                        <circle cx="5" cy="6" r="2.2" />
                        <circle cx="19" cy="6" r="2.2" />
                        <circle cx="12" cy="19" r="2.2" />
                        <path d="M6.9 7.3L10.5 17M17.1 7.3L13.5 17M7.2 6h9.6" />
                      </>
                    ),
                    title: "Give it shape",
                    copy: "When you're ready, save the story, map who's in it, and gather a moodboard for the feel of it.",
                    offset: "sm:mt-0",
                  },
                  {
                    icon: (
                      <>
                        <rect x="3" y="4" width="18" height="18" rx="2" />
                        <path d="M3 10h18M8 2v4M16 2v4" />
                        <path d="M8 15l2.5 2.5L16 12" />
                      </>
                    ),
                    title: "Return, and return again",
                    copy: "A new prompt each day keeps the streak burning, and your workshop tracks every word you've written.",
                    offset: "sm:mt-10",
                  },
                ].map((step, i) => (
                  <motion.div
                    key={step.title}
                    initial={{ opacity: 0, y: 14 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-40px" }}
                    transition={{ duration: 0.45, delay: i * 0.12, ease: "easeOut" }}
                    className={`relative text-center sm:text-left ${step.offset}`}
                  >
                    <span className="relative inline-flex w-12 h-12 rounded-full items-center justify-center mb-4 mx-auto sm:mx-0 bg-ink border-2 border-lamp/40 shadow-[0_0_22px_rgba(232,163,61,0.18)]">
                      <svg
                        width="19"
                        height="19"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#E8A33D"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        {step.icon}
                      </svg>
                    </span>
                    <p className="font-mono text-[10px] text-faint mb-1.5">0{i + 1}</p>
                    <h3 className="font-serif text-lg text-parchment mb-1.5">{step.title}</h3>
                    <p className="text-sm text-muted leading-relaxed max-w-[220px] mx-auto sm:mx-0">
                      {step.copy}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {!user && <FAQ />}

      {glimpses.length > 0 && (
        <section className="relative px-5 sm:px-8 pb-24 pt-4">
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