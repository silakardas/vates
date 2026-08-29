"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import ContinueCard from "@/components/ContinueCard";
import StoryRow from "@/components/StoryRow";
import WorkshopStats from "@/components/WorkshopStats";
import Footer from "@/components/Footer";
import { useStories } from "@/lib/StoryContext";
import { totalWordCount } from "@/lib/types";

const PAGE_SIZE = 5;

function excerptFrom(html: string) {
  const text = html.replace(/<[^>]+>/g, "").trim();
  return text.length > 0 ? text.slice(0, 140) : "An empty page, waiting.";
}

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
};

const rowFade = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" as const } },
};

export default function Workshop() {
  const router = useRouter();
  const { stories, createStory } = useStories();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const sorted = [...stories].sort((a, b) => b.updatedAt - a.updatedAt);
  const [latest, ...rest] = sorted;

  const q = query.trim().toLowerCase();
  const filtered = q ? rest.filter((s) => s.title.toLowerCase().includes(q)) : rest;

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function handleQueryChange(value: string) {
    setQuery(value);
    setPage(1);
  }

  function handleNewStory() {
    const story = createStory();
    router.push(`/story/${story.id}`);
  }

  return (
    <>
      <Header />
      <div className="flex flex-col lg:flex-row" style={{ minHeight: "calc(100vh - 89px)" }}>
        <main className="flex-1 min-w-0 text-parchment px-5 py-10 sm:px-8 sm:py-14 space-y-10 sm:space-y-14">
          <div>
            <p className="font-mono text-xs text-muted uppercase tracking-wide mb-6">
              Welcome back
            </p>

            {latest ? (
              <ContinueCard
                id={latest.id}
                title={latest.title}
                excerpt={excerptFrom(latest.chapters[latest.chapters.length - 1]?.content ?? "")}
                wordCount={totalWordCount(latest)}
                streak={latest.streak}
                status={latest.status}
              />
            ) : (
              <p className="text-muted">You haven&apos;t written anything yet.</p>
            )}
          </div>

          <section>
            <div className="flex items-center justify-between mb-2 gap-4 flex-wrap">
              <h2 className="font-serif text-xl">Your stories</h2>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleNewStory}
                className="text-lamp text-sm font-mono"
              >
                + New
              </motion.button>
            </div>

            {rest.length > 0 && (
              <p className="text-xs font-mono text-faint mb-6">
                {filtered.length} {filtered.length === 1 ? "story" : "stories"}
                {query && ` matching "${query}"`}
              </p>
            )}

            <motion.div key={currentPage} initial="hidden" animate="show" variants={stagger}>
              {rest.length === 0 && (
                <p className="text-muted text-sm py-6">
                  Nothing else here yet — everything you start will show up in this list.
                </p>
              )}
              {rest.length > 0 && filtered.length === 0 && (
                <p className="text-muted text-sm py-6">
                  No stories match &quot;{query}&quot;.
                </p>
              )}
              {pageItems.map((story) => (
                <motion.div key={story.id} variants={rowFade}>
                  <StoryRow
                    id={story.id}
                    title={story.title}
                    description={story.description}
                    type={story.type}
                    chapterCount={story.chapters.length}
                    wordCount={totalWordCount(story)}
                    streak={story.streak}
                    tags={story.tags}
                    status={story.status}
                    updatedAt={story.updatedAt}
                  />
                </motion.div>
              ))}
            </motion.div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-2">
                <button
                  onClick={() => setPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="text-xs font-mono text-muted hover:text-lamp disabled:opacity-30 disabled:hover:text-muted transition-colors"
                >
                  ← Previous
                </button>
                <span className="text-xs font-mono text-faint">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="text-xs font-mono text-muted hover:text-lamp disabled:opacity-30 disabled:hover:text-muted transition-colors"
                >
                  Next →
                </button>
              </div>
            )}
          </section>
        </main>

        <WorkshopStats stories={stories} query={query} onQueryChange={handleQueryChange} />
      </div>
      <Footer />
    </>
  );
}