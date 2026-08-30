"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import PublicStoryCard from "@/components/PublicStoryCard";
import { createClient } from "@/lib/supabase/client";
import { TagCategory } from "@/lib/types";
import { TAG_CATEGORIES, TagColumns, tagColumnsToStoryTags } from "@/lib/tags";

// Row shape for a publicly-shared story, as read straight from Supabase —
// intentionally not the full `Story` type from StoryContext, since this
// only needs the fields relevant to browsing, and (unlike StoryContext)
// fetches everyone's public stories, not just the current user's own.
type PublicStoryRow = TagColumns & {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  view_count: number | null;
  like_count: number | null;
  word_count: number | null;
  created_at: string;
  published_at: string | null;
};

type SortOption = "newest" | "views" | "likes";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "views", label: "Most viewed" },
  { value: "likes", label: "Most liked" },
];

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.05 } },
};

const cardFade = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" as const } },
};

// The home page's browsable community section — this is the entirety of
// what used to live at /discover, plus sorting, a word-count range, and a
// couple of small stat cards. /discover itself now just redirects here.
export default function DiscoverSection() {
  const [stories, setStories] = useState<PublicStoryRow[]>([]);
  const [authors, setAuthors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  // Captured once per load (not via Date.now() at render time, which the
  // purity rule flags) so "new this week" stays stable across re-renders.
  const [loadedAt, setLoadedAt] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [minWords, setMinWords] = useState("");
  const [maxWords, setMaxWords] = useState("");
  const [selectedTags, setSelectedTags] = useState<Record<TagCategory, string[]>>({
    fandoms: [],
    relationships: [],
    characters: [],
    additionalTags: [],
  });

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    async function load() {
      setLoading(true);

      // Deliberately not going through StoryContext here — that only ever
      // loads the signed-in user's own stories (owner_id = auth.uid()).
      // This needs every publicly-shared story, so it queries Supabase
      // directly with no owner filter, relying on the "stories are
      // public-readable" RLS policy (is_public = true). Runs for every
      // visitor, signed in or not — no auth required.
      const { data: storyRows, error: storiesError } = await supabase
        .from("stories")
        .select(
          "id, owner_id, title, description, fandoms, relationships, tag_characters, additional_tags, tags, view_count, like_count, word_count, created_at, published_at"
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
        setLoadedAt(Date.now());
        setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Story tags, converted once per load (also folds in any pre-migration
  // legacy `tags` values into additionalTags).
  const storyTags = useMemo(() => {
    const map = new Map<string, ReturnType<typeof tagColumnsToStoryTags>>();
    stories.forEach((s) => map.set(s.id, tagColumnsToStoryTags(s)));
    return map;
  }, [stories]);

  // Raw counts per category — the source both the 4 filter chip lists and
  // the "popular tags" stat card are built from.
  const tagCountsByCategory = useMemo(() => {
    const counts: Record<TagCategory, Map<string, number>> = {
      fandoms: new Map(),
      relationships: new Map(),
      characters: new Map(),
      additionalTags: new Map(),
    };
    stories.forEach((s) => {
      const tags = storyTags.get(s.id);
      if (!tags) return;
      TAG_CATEGORIES.forEach(({ key }) => {
        tags[key].forEach((t) => counts[key].set(t, (counts[key].get(t) ?? 0) + 1));
      });
    });
    return counts;
  }, [stories, storyTags]);

  // Popular values per category, for the 4 filter chip lists.
  const tagsByCategory = useMemo(() => {
    const result = {} as Record<TagCategory, string[]>;
    TAG_CATEGORIES.forEach(({ key }) => {
      result[key] = [...tagCountsByCategory[key].entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([tag]) => tag);
    });
    return result;
  }, [tagCountsByCategory]);

  // Small "at a glance" stats: the site's most-used tags overall, and how
  // many stories were shared in the last 7 days. Deliberately just these
  // two — new site, not enough data yet for anything fancier.
  const topTagsOverall = useMemo(() => {
    const combined = new Map<string, number>();
    TAG_CATEGORIES.forEach(({ key }) => {
      tagCountsByCategory[key].forEach((count, tag) => {
        combined.set(tag, (combined.get(tag) ?? 0) + count);
      });
    });
    return [...combined.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([tag]) => tag);
  }, [tagCountsByCategory]);

  const addedThisWeek = useMemo(() => {
    if (loadedAt === null) return 0;
    const cutoff = loadedAt - ONE_WEEK_MS;
    return stories.filter((s) => new Date(s.created_at).getTime() >= cutoff).length;
  }, [stories, loadedAt]);

  function toggleTag(category: TagCategory, tag: string) {
    setSelectedTags((prev) => ({
      ...prev,
      [category]: prev[category].includes(tag)
        ? prev[category].filter((t) => t !== tag)
        : [...prev[category], tag],
    }));
  }

  const totalSelected = TAG_CATEGORIES.reduce(
    (sum, { key }) => sum + selectedTags[key].length,
    0
  );

  const min = minWords.trim() ? Number(minWords) : null;
  const max = maxWords.trim() ? Number(maxWords) : null;
  const q = query.trim().toLowerCase();

  const filtered = stories.filter((s) => {
    const tags = storyTags.get(s.id);
    const matchesQuery =
      !q ||
      s.title.toLowerCase().includes(q) ||
      (authors[s.owner_id]?.toLowerCase().includes(q) ?? false) ||
      (tags?.fandoms.some((t) => t.includes(q)) ?? false) ||
      (tags?.characters.some((t) => t.includes(q)) ?? false);
    // AND across (and within) categories: every selected tag, in every
    // selected category, must be present on the story.
    const matchesTags = TAG_CATEGORIES.every(({ key }) =>
      selectedTags[key].every((t) => tags?.[key].includes(t) ?? false)
    );
    const wordCount = s.word_count ?? 0;
    const matchesWordCount = (min === null || wordCount >= min) && (max === null || wordCount <= max);
    return matchesQuery && matchesTags && matchesWordCount;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "views") return (b.view_count ?? 0) - (a.view_count ?? 0);
    if (sortBy === "likes") return (b.like_count ?? 0) - (a.like_count ?? 0);
    // "newest": published_at if it has one, else created_at.
    const aTime = new Date(a.published_at ?? a.created_at).getTime();
    const bTime = new Date(b.published_at ?? b.created_at).getTime();
    return bTime - aTime;
  });

  return (
    <section id="discover" className="relative px-5 sm:px-8 pb-24 pt-4 scroll-mt-24">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-10">
          <span className="h-px flex-1 bg-parchment/10" />
          <p className="font-mono text-[11px] uppercase tracking-widest text-faint whitespace-nowrap">
            Community
          </p>
          <span className="h-px flex-1 bg-parchment/10" />
        </div>

        <div className="mb-8 text-center sm:text-left">
          <h2 className="font-serif text-3xl mb-2">Discover</h2>
          <p className="text-muted text-sm max-w-xl mx-auto sm:mx-0">
            Stories other writers have chosen to share with the world.
          </p>
        </div>

        {!loading && stories.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            <div className="bg-ink-soft border border-parchment/10 rounded-lg px-4 py-3.5">
              <span className="block font-serif text-xl text-lamp leading-none mb-1.5">
                {addedThisWeek}
              </span>
              <span className="block font-mono text-[10px] uppercase tracking-wide text-faint">
                New stories this week
              </span>
            </div>
            <div className="bg-ink-soft border border-parchment/10 rounded-lg px-4 py-3.5">
              <span className="block font-mono text-[10px] uppercase tracking-wide text-faint mb-2">
                Popular tags
              </span>
              {topTagsOverall.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {topTagsOverall.map((tag) => (
                    <span
                      key={tag}
                      className="text-[11px] font-mono text-muted bg-ink border border-parchment/10 px-2 py-0.5 rounded-full"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-xs text-faint">Not enough tags yet.</span>
              )}
            </div>
          </div>
        )}

        <div className="mb-5">
          <div className="relative max-w-md mx-auto sm:mx-0">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title, fandom, character, or author..."
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

        <div className="mb-8 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mx-auto sm:mx-0">
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-wide text-muted mb-1.5">
              Min words
            </label>
            <input
              type="number"
              min={0}
              value={minWords}
              onChange={(e) => setMinWords(e.target.value)}
              placeholder="0"
              className="w-full bg-ink-soft rounded-lg px-3 py-2 text-sm outline-none border border-parchment/10 focus:border-lamp/40 transition-colors placeholder:text-faint"
            />
          </div>
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-wide text-muted mb-1.5">
              Max words
            </label>
            <input
              type="number"
              min={0}
              value={maxWords}
              onChange={(e) => setMaxWords(e.target.value)}
              placeholder="No limit"
              className="w-full bg-ink-soft rounded-lg px-3 py-2 text-sm outline-none border border-parchment/10 focus:border-lamp/40 transition-colors placeholder:text-faint"
            />
          </div>
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-wide text-muted mb-1.5">
              Sort by
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="w-full bg-ink-soft rounded-lg px-3 py-2 text-sm outline-none border border-parchment/10 focus:border-lamp/40 transition-colors"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {TAG_CATEGORIES.some(({ key }) => tagsByCategory[key].length > 0) && (
          <div className="mb-8 space-y-4">
            {TAG_CATEGORIES.map(({ key, label }) => {
              const options = tagsByCategory[key];
              if (options.length === 0) return null;
              return (
                <div key={key}>
                  <p className="font-mono text-[10px] uppercase tracking-wide text-muted mb-2">
                    {label}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {options.map((tag) => {
                      const active = selectedTags[key].includes(tag);
                      return (
                        <button
                          key={tag}
                          onClick={() => toggleTag(key, tag)}
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
                  </div>
                </div>
              );
            })}
            {totalSelected > 0 && (
              <button
                onClick={() =>
                  setSelectedTags({
                    fandoms: [],
                    relationships: [],
                    characters: [],
                    additionalTags: [],
                  })
                }
                className="text-xs font-mono px-2.5 py-1 text-faint hover:text-crimson transition-colors"
              >
                Clear filters
              </button>
            )}
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

        {!loading && stories.length > 0 && sorted.length === 0 && (
          <p className="text-muted text-sm py-10 text-center">
            No stories match your search or filters.
          </p>
        )}

        {!loading && sorted.length > 0 && (
          <motion.div
            key={`${query}-${sortBy}-${minWords}-${maxWords}-${TAG_CATEGORIES.map(({ key }) => selectedTags[key].join(",")).join("|")}`}
            initial="hidden"
            animate="show"
            variants={stagger}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            {sorted.map((story) => (
              <motion.div key={story.id} variants={cardFade} className="h-full">
                <PublicStoryCard
                  story={{
                    id: story.id,
                    title: story.title,
                    description: story.description,
                    tags: storyTags.get(story.id),
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
      </div>
    </section>
  );
}
