"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import ActivityStrip from "@/components/ActivityStrip";
import Footer from "@/components/Footer";
import { useStories } from "@/lib/StoryContext";
import { buildActivity } from "@/lib/activity";
import { ALTERNATE_PROMPTS, PAST_CHALLENGES, THEMES, TODAYS_PROMPT, randomThemePrompt } from "@/lib/challenges";

export default function ChallengePage() {
  const router = useRouter();
  const { stories, createStory, updateChapter } = useStories();
  const streak = stories.reduce((max, s) => Math.max(max, s.streak ?? 0), 0);
  const [prompt, setPrompt] = useState(TODAYS_PROMPT);
  const [promptIndex, setPromptIndex] = useState(-1);
  const [activeTheme, setActiveTheme] = useState<string | null>(null);

  const activity = buildActivity(stories, 28);

  function startFrom(text: string) {
    const story = createStory();
    updateChapter(story.id, story.chapters[0].id, {
      content: `<p><em>"${text}"</em></p><p></p>`,
    });
    router.push(`/story/${story.id}`);
  }

  function handleShuffle() {
    const next = (promptIndex + 1) % ALTERNATE_PROMPTS.length;
    setPromptIndex(next);
    setPrompt(ALTERNATE_PROMPTS[next]);
    setActiveTheme(null);
  }

  function handleThemePick(themeId: string) {
    const random = randomThemePrompt(themeId);
    if (!random) return;
    setPrompt(random);
    setActiveTheme(themeId);
  }

  return (
    <>
      <Header />
      <div className="flex" style={{ minHeight: "calc(100vh - 89px)" }}>
        <main className="flex-1 min-w-0 text-parchment px-8 py-16">
          <div className="max-w-xl mb-16">
            <p className="font-mono text-xs text-lamp uppercase tracking-wide mb-6 flex items-center gap-3">
              Today&apos;s challenge
              <span className="text-faint normal-case">· new prompt daily</span>
            </p>

            <div className="relative bg-ink-soft rounded-2xl px-9 py-10 overflow-hidden mb-6">
              <motion.div
                className="absolute top-0 left-0 h-[3px] bg-gradient-to-r from-lamp via-lamp/40 to-transparent"
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ duration: 0.7, ease: "easeOut" }}
              />

              <AnimatePresence mode="wait">
                <motion.h1
                  key={prompt}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="font-serif italic text-2xl md:text-3xl leading-snug mb-5"
                >
                  &quot;{prompt}&quot;
                </motion.h1>
              </AnimatePresence>

              <p className="text-muted text-sm mb-8">
                No pressure, no word count. Just a spark to write from — start a
                new page and see where it goes.
              </p>

              <div className="flex items-center gap-4 flex-wrap">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => startFrom(prompt)}
                  className="bg-lamp text-ink font-semibold px-6 py-3 rounded-full"
                >
                  Write from this
                </motion.button>
                <button
                  onClick={handleShuffle}
                  className="text-xs font-mono text-muted hover:text-lamp transition-colors"
                >
                  Try a different prompt →
                </button>
              </div>
            </div>

            {streak > 0 && (
              <div className="flex items-center gap-2">
                <span className="font-mono text-2xl text-lamp">{streak}</span>
                <span className="font-mono text-xs text-muted uppercase">
                  {streak === 1 ? "day in a row" : "days in a row"}
                </span>
              </div>
            )}

            <p className="text-xs text-faint leading-relaxed mt-10 max-w-md">
              Every day gets one prompt. It&apos;s here to knock the dust off,
              not to be graded — write for two minutes or two thousand words,
              whichever the day has room for.
            </p>
          </div>

          <div className="max-w-2xl">
            <p className="font-mono text-xs text-muted uppercase tracking-wide mb-5">
              Or browse by theme
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {THEMES.map((theme) => (
                <motion.button
                  key={theme.id}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleThemePick(theme.id)}
                  className={`text-left px-4 py-3.5 rounded-xl border text-sm transition-colors ${
                    activeTheme === theme.id
                      ? "bg-lamp/15 border-lamp/40 text-lamp"
                      : "bg-ink-soft border-parchment/10 text-muted hover:text-parchment hover:border-parchment/20"
                  }`}
                >
                  {theme.label}
                </motion.button>
              ))}
            </div>
          </div>
        </main>

        <aside className="w-80 flex-shrink-0 border-l border-parchment/10 p-6 space-y-8">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-wide text-muted mb-4">
              Last 28 days
            </p>
            <ActivityStrip days={activity} />
          </div>

          <div>
            <p className="font-mono text-[10px] uppercase tracking-wide text-muted mb-4">
              Past prompts
            </p>
            <div className="space-y-1">
              {PAST_CHALLENGES.map((c) => (
                <button
                  key={c.id}
                  onClick={() => startFrom(c.prompt)}
                  className="w-full text-left px-3 py-2.5 rounded-lg text-xs leading-relaxed text-muted hover:bg-ink-soft hover:text-parchment transition-colors border border-transparent hover:border-parchment/10"
                >
                  <span className="block font-mono text-[10px] text-faint mb-1">
                    {c.daysAgo === 1 ? "Yesterday" : `${c.daysAgo} days ago`}
                  </span>
                  &quot;{c.prompt}&quot;
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>
      <Footer />
    </>
  );
}
