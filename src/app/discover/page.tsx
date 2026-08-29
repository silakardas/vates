"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PublicStoryCard from "@/components/PublicStoryCard";
import { createClient } from "@/lib/supabase/client";

// Row shape for a publicly-shared story, as read straight from Supabase —
// intentionally not the full `Story` type from StoryContext, since this
// page only needs the fields relevant to browsing, and (unlike
// StoryContext) fetches everyone's public stories, not just the current
// user's own.
type PublicStoryRow = {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  tags: string[] | null;
  view_count: number | null;
  like_count: number | null;
  created_at: string;
  published_at: string | null;
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.05 } },
};

const cardFade = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" as const } },
};

export default function DiscoverPage() {
  const [stories, setStories] = useState<PublicStoryRow[]>([]);
  const [authors, setAuthors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    async function load() {
      setLoading(true);

      // Deliberately not going through StoryContext here — that only ever
      // loads the signed-in user's own stories (owner_id = auth.uid()).
      // This page needs every publicly-shared story, so it queries
      // Supabase directly with no owner filter, relying on the
      // "stories are public-readable" RLS policy (is_public = true).
      const { data: storyRows, error: storiesError } = await supabase
        .from("stories")
        .select(
          "id, owner_id, title, description, tags, view_count, like_count, created_at, published_at"
        )
        .eq("is_public", true)
        .order("published_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });

      if (cancelled) return;

      if (storiesError || !storyRows) {
        console.error("Failed to load public stories:", storiesError?.message);
        setStories([]);
        setAuthors({});
        setLoading(false);
        return;
      }

      const ownerIds = [...new Set(storyRows.map((s) => s.owner_id))];
      let authorMap: Record<string, string> = {};

      if (ownerIds.length > 0) {
        const { data: profileRows, error: profilesError } = await supabase
          .from("profiles")
          .select("id, name")
          .in("id", ownerIds);

        if (profilesError) {
          console.error("Failed to load authors:", profilesError.message);
        } else {
          authorMap = Object.fromEntries(
            (profileRows ?? []).map((p) => [p.id as string, p.name as string])
          );
        }
      }

      if (!cancelled) {
        setStories(storyRows as PublicStoryRow[]);
        setAuthors(authorMap);
        setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const allTags = useMemo(() => {
    const counts = new Map<string, number>();
    stories.forEach((s) => (s.tags ?? []).forEach((t) => counts.set(t, (counts.get(t) ?? 0) + 1)));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([tag]) => tag);
  }, [stories]);

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  const q = query.trim().toLowerCase();
  const filtered = stories.filter((s) => {
    const matchesQuery = !q || s.title.toLowerCase().includes(q);
    const tags = s.tags ?? [];
    const matchesTags = selectedTags.every((t) => tags.includes(t));
    return matchesQuery && matchesTags;
  });

  return (
    <>
      <Header />
      <main className="text-parchment px-5 py-10 sm:px-8 sm:py-14 max-w-5xl mx-auto">
        <div className="mb-8">
          <p className="font-mono text-xs text-muted uppercase tracking-wide mb-2">
            Community
          </p>
          <h1 className="font-serif text-3xl mb-2">Discover</h1>
          <p className="text-muted text-sm max-w-xl">
            Stories other writers have chosen to share with the world.
          </p>
        </div>

        <div className="mb-6">
          <div className="relative max-w-md">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title..."
              className="w-full bg-ink-soft rounded-lg pl-9 pr-8 py-2.5 text-sm outline-none border border-parchment/10 focus:border-lamp/40 transition-colors placeholder:text-faint"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-faint text-sm">
              ⌕
            </span>
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-faint hover:text-crimson transition-colors text-xs"
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {allTags.length > 0 && (
          <div className="mb-8">
            <div className="flex flex-wrap gap-2">
              {allTags.map((tag) => {
                const active = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`text-xs font-mono px-2.5 py-1 rounded-full border transition-colors ${
                      active
                        ? "bg-lamp/15 border-lamp/40 text-lamp"
                        : "bg-ink-soft border-parchment/10 text-muted hover:text-parchment hover:border-parchment/20"
                    }`}
                  >
                    #{tag}
                  </button>
                );
              })}
              {selectedTags.length > 0 && (
                <button
                  onClick={() => setSelectedTags([])}
                  className="text-xs font-mono px-2.5 py-1 text-faint hover:text-crimson transition-colors"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>
        )}

        {loading && (
          <p className="text-muted text-sm py-10 text-center">Loading stories…</p>
        )}

        {!loading && stories.length === 0 && (
          <p className="text-muted text-sm py-10 text-center">
            No stories have been shared to the community yet.
          </p>
        )}

        {!loading && stories.length > 0 && filtered.length === 0 && (
          <p className="text-muted text-sm py-10 text-center">
            No stories match your search or filters.
          </p>
        )}

        {!loading && filtered.length > 0 && (
          <motion.div
            key={`${query}-${selectedTags.join(",")}`}
            initial="hidden"
            animate="show"
            variants={stagger}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            {filtered.map((story) => (
              <motion.div key={story.id} variants={cardFade} className="h-full">
                <PublicStoryCard
                  story={{
                    id: story.id,
                    title: story.title,
                    description: story.description,
                    tags: story.tags,
                    viewCount: story.view_count,
                    likeCount: story.like_count,
                  }}
                  authorName={authors[story.owner_id]}
                  authorId={story.owner_id}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </main>
      <Footer />
    </>
  );
}