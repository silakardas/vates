"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PublicStoryCard from "@/components/PublicStoryCard";
import SearchFilters from "@/components/SearchFilters";
import { tagColumnsToStoryTags } from "@/lib/tags";
import { TagCategory } from "@/lib/types";
import {
  computeTagsByCategory,
  emptyTagSelection,
  filterStories,
  sortStories,
  SortOption,
  TagSelection,
} from "@/lib/search";
import { useSearchStories } from "@/lib/useSearchStories";

// Full results page for the site-wide search — where the header search
// box's "Enter" and "See all N results →" land. Lists every public story
// matching the query (title/author/any tag category), refined by the
// AO3-inspired "Sort and Filter" sidebar (SearchFilters): sort order,
// include/exclude tags per category, and a word-count range. Filtering
// is live — no submit button, unlike AO3 — since the rest of the site's
// search already works that way.
function SearchResults() {
  const searchParams = useSearchParams();
  const rawQuery = searchParams.get("q") ?? "";
  const query = rawQuery.trim();
  const q = query.toLowerCase();

  const { stories, authors, loading } = useSearchStories(true);

  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [includeTags, setIncludeTags] = useState<TagSelection>(emptyTagSelection());
  const [excludeTags, setExcludeTags] = useState<TagSelection>(emptyTagSelection());
  const [minWords, setMinWords] = useState("");
  const [maxWords, setMaxWords] = useState("");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const storyTags = useMemo(() => {
    const map = new Map<string, ReturnType<typeof tagColumnsToStoryTags>>();
    stories.forEach((s) => map.set(s.id, tagColumnsToStoryTags(s)));
    return map;
  }, [stories]);

  const tagsByCategory = useMemo(
    () => computeTagsByCategory(stories, storyTags),
    [stories, storyTags]
  );

  const min = minWords.trim() ? Number(minWords) : null;
  const max = maxWords.trim() ? Number(maxWords) : null;

  const results = useMemo(() => {
    const filtered = filterStories({
      stories,
      storyTags,
      authors,
      q,
      requireQuery: true,
      includeTags,
      excludeTags,
      minWords: min,
      maxWords: max,
    });
    return sortStories(filtered, sortBy);
  }, [stories, storyTags, authors, q, includeTags, excludeTags, min, max, sortBy]);

  function toggleInclude(category: TagCategory, tag: string) {
    setIncludeTags((prev) => ({
      ...prev,
      [category]: prev[category].includes(tag)
        ? prev[category].filter((t) => t !== tag)
        : [...prev[category], tag],
    }));
  }

  function toggleExclude(category: TagCategory, tag: string) {
    setExcludeTags((prev) => ({
      ...prev,
      [category]: prev[category].includes(tag)
        ? prev[category].filter((t) => t !== tag)
        : [...prev[category], tag],
    }));
  }

  function clearFilters() {
    setSortBy("newest");
    setIncludeTags(emptyTagSelection());
    setExcludeTags(emptyTagSelection());
    setMinWords("");
    setMaxWords("");
  }

  const hasActiveFilters =
    sortBy !== "newest" ||
    minWords !== "" ||
    maxWords !== "" ||
    Object.values(includeTags).some((v) => v.length > 0) ||
    Object.values(excludeTags).some((v) => v.length > 0);

  return (
    <>
      <Header />
      <div className="text-parchment px-5 py-10 sm:px-8 sm:py-14 max-w-6xl mx-auto min-h-[50vh]">
        <div className="flex items-start justify-between gap-4 mb-1">
          <h1 className="font-serif text-2xl sm:text-3xl">
            {query ? <>Results for &ldquo;{query}&rdquo;</> : "Search"}
          </h1>
          {query && (
            <button
              type="button"
              onClick={() => setMobileFiltersOpen((v) => !v)}
              className="lg:hidden flex-shrink-0 text-xs font-mono uppercase tracking-wide px-3 py-2 rounded-lg border border-parchment/10 text-muted hover:text-parchment hover:border-parchment/20 transition-colors whitespace-nowrap"
            >
              {mobileFiltersOpen ? "Hide filters" : "Sort and Filter"}
            </button>
          )}
        </div>
        {query && !loading && (
          <p className="text-xs font-mono text-faint mb-8">
            {results.length} {results.length === 1 ? "result" : "results"}
          </p>
        )}
        {!query && <p className="text-muted text-sm mb-8">Enter a search above to get started.</p>}

        {query && (
          <div className="flex flex-col lg:flex-row gap-8">
            <aside className={`${mobileFiltersOpen ? "block" : "hidden"} lg:block lg:w-72 flex-shrink-0`}>
              <div className="lg:sticky lg:top-8">
                <SearchFilters
                  sortBy={sortBy}
                  onSortChange={setSortBy}
                  tagsByCategory={tagsByCategory}
                  includeTags={includeTags}
                  excludeTags={excludeTags}
                  onToggleInclude={toggleInclude}
                  onToggleExclude={toggleExclude}
                  minWords={minWords}
                  maxWords={maxWords}
                  onMinWordsChange={setMinWords}
                  onMaxWordsChange={setMaxWords}
                  onClear={clearFilters}
                  hasActiveFilters={hasActiveFilters}
                />
              </div>
            </aside>

            <div className="flex-1 min-w-0">
              {loading && (
                <p className="text-muted text-sm py-12 text-center">Searching…</p>
              )}

              {!loading && results.length === 0 && (
                <p className="text-muted text-sm py-12 text-center">No results found.</p>
              )}

              {!loading && results.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                  {results.map((story) => (
                    <PublicStoryCard
                      key={story.id}
                      story={{
                        id: story.id,
                        title: story.title,
                        description: story.description,
                        tags: storyTags.get(story.id),
                        viewCount: story.view_count,
                        likeCount: story.like_count,
                      }}
                      authorUsername={authors[story.owner_id]?.username}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}

// useSearchParams needs a Suspense boundary around it (Next.js bails a
// page that reads it into fully client-side rendering otherwise), so the
// actual page content lives in SearchResults and this default export is
// just the boundary.
export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <SearchResults />
    </Suspense>
  );
}
