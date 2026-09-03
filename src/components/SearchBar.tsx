"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { tagColumnsToStoryTags } from "@/lib/tags";
import { storyMatchScore, type AuthorInfo, type PublicStoryRow } from "@/lib/search";
import { useSearchStories } from "@/lib/useSearchStories";
import AdvancedSearchPanel, { SearchTab } from "@/components/AdvancedSearchPanel";

// Re-exported so existing imports (AdvancedSearchPanel, etc.) that pull
// these types from "@/components/SearchBar" keep working — the types
// themselves now live in "@/lib/search" alongside the matching logic they
// describe.
export type { AuthorInfo, PublicStoryRow };

const DEBOUNCE_MS = 280;
const MIN_QUERY_LENGTH = 2;
const QUICK_RESULT_LIMIT = 6;

// The site-wide search box. Two instances are rendered from Header: a
// `compact` one embedded in the desktop nav row, and a full-width one
// inside the mobile hamburger menu. Default typing searches public
// stories (title/author/fandom/relationship/character/additional tag);
// "Advanced search" opens a panel with a full story-filter tab and a
// separate user-search tab; Enter jumps to the full /search results page
// — this works for anon visitors too, since public story search never
// required login.
export default function SearchBar({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<SearchTab>("story");
  const [dismissed, setDismissed] = useState(false);

  // Debounce: raw keystrokes settle into `debouncedQuery` after a short
  // pause. Everything below (fetching, filtering, the user search) reacts
  // to the debounced value, never the raw one. Also un-dismisses the
  // dropdown, so typing again after it was closed brings it back.
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
      setDismissed(false);
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const trimmed = debouncedQuery.trim();
  // Below the minimum length, treat the query as if it were empty — no
  // search triggers, and the Story tab just shows/filters everything.
  const activeQuery = trimmed.length >= MIN_QUERY_LENGTH ? trimmed : "";
  const q = activeQuery.toLowerCase();

  // Loads every public story exactly once, the first time it's actually
  // needed — i.e. a real query has been typed. Just opening the Story
  // tab (with an empty query) no longer triggers a fetch on its own:
  // StoryFilterTab doesn't render a grid until there's a query either,
  // so pulling every public story in the background before that would
  // be wasted work.
  const needsStories = activeQuery.length > 0;
  const { stories, authors, loading: storiesLoading } = useSearchStories(needsStories);

  // Quick preview results for the default (non-advanced) dropdown: text
  // match only, ranked by storyMatchScore, newest first as a tie-break.
  const quickResults = q
    ? stories
        .map((s) => ({
          story: s,
          score: storyMatchScore(s, q, authors[s.owner_id]?.username, tagColumnsToStoryTags(s)),
        }))
        .filter(({ score }) => score > 0)
        .sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          const aTime = new Date(a.story.published_at ?? a.story.created_at).getTime();
          const bTime = new Date(b.story.published_at ?? b.story.created_at).getTime();
          return bTime - aTime;
        })
        .map(({ story }) => story)
    : [];

  const quickResultsShown = quickResults.slice(0, QUICK_RESULT_LIMIT);
  const hasMoreResults = quickResults.length > quickResultsShown.length;

  const showQuickDropdown = !advancedOpen && !dismissed && activeQuery.length > 0;

  function openAdvanced(tab: SearchTab) {
    setActiveTab(tab);
    setAdvancedOpen(true);
    setDismissed(false);
  }

  // Enter jumps to the full results page.
  function goToResultsPage() {
    const trimmedNow = query.trim();
    if (!trimmedNow) return;
    setAdvancedOpen(false);
    setDismissed(true);
    router.push(`/search?q=${encodeURIComponent(trimmedNow)}`);
  }

  // The compact (desktop nav) variant keeps the original "position:
  // absolute, top: full" overlay behavior, now anchored to the input
  // itself (right-aligned) instead of a full-width bar under the nav.
  // The non-compact variant lives inside Header's mobile dropdown, which
  // animates its height with `overflow-hidden` — an absolutely
  // positioned overlay there would get clipped, so results/panel just
  // flow inline in the menu instead.
  const overlayBase = compact ? "absolute top-full z-30 pt-2" : "relative pt-2";

  return (
    <div
      className="relative"
      tabIndex={-1}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setAdvancedOpen(false);
          setDismissed(true);
        }
      }}
    >
      <div className="flex items-center gap-2">
        <div className="relative">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setDismissed(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter") goToResultsPage();
            }}
            placeholder={compact ? "Search…" : "Search stories by title, fandom, character, or author..."}
            aria-label="Search"
            className={`bg-ink-soft rounded-lg pl-9 pr-8 outline-none border border-parchment/10 focus:border-lamp/40 transition-colors placeholder:text-faint ${
              compact ? "w-40 lg:w-56 py-2 text-sm" : "w-full py-2.5 text-sm"
            }`}
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-faint text-sm">⌕</span>
          {query && (
            <button
              onClick={() => {
                setQuery("");
                setDebouncedQuery("");
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-faint hover:text-crimson transition-colors text-xs"
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => (advancedOpen ? setAdvancedOpen(false) : openAdvanced(activeTab))}
          aria-expanded={advancedOpen}
          className={`flex-shrink-0 font-mono uppercase tracking-wide rounded-lg border transition-colors whitespace-nowrap ${
            compact ? "text-[10px] px-2 py-2" : "text-xs px-3 py-2.5"
          } ${
            advancedOpen
              ? "bg-lamp/15 border-lamp/40 text-lamp"
              : "border-parchment/10 text-muted hover:text-parchment hover:border-parchment/20"
          }`}
        >
          {compact ? "Advanced" : "Advanced search"}
        </button>
      </div>

      {showQuickDropdown && (
        <div className={`${overlayBase} ${compact ? "right-0 w-80 sm:w-96" : "left-0 right-0"}`}>
          <div className="bg-panel border border-parchment/10 rounded-xl shadow-lg overflow-hidden">
            {storiesLoading && quickResultsShown.length === 0 && (
              <p className="text-muted text-sm py-6 text-center">Searching…</p>
            )}
            {!storiesLoading && quickResultsShown.length === 0 && (
              <p className="text-muted text-sm py-6 text-center">No results found.</p>
            )}
            {quickResultsShown.length > 0 && (
              <ul className="divide-y divide-parchment/10 max-h-[60vh] overflow-y-auto custom-scrollbar">
                {quickResultsShown.map((story) => (
                  <li key={story.id}>
                    <Link
                      href={`/discover/${story.id}`}
                      className="flex items-start justify-between gap-3 px-4 py-3 hover:bg-parchment/5 transition-colors"
                    >
                      <span className="min-w-0">
                        <span className="block text-sm text-parchment truncate">
                          {story.title}
                        </span>
                        <span className="block text-xs font-mono text-faint truncate">
                          by {authors[story.owner_id]?.username ?? "Unknown"}
                        </span>
                      </span>
                      <span className="text-xs font-mono text-faint flex-shrink-0 whitespace-nowrap pt-0.5">
                        👁 {(story.view_count ?? 0).toLocaleString("en-US")}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {hasMoreResults && (
              <button
                onClick={goToResultsPage}
                className="w-full text-center text-xs font-mono uppercase tracking-wide text-lamp py-2.5 border-t border-parchment/10 hover:bg-lamp/5 transition-colors"
              >
                See all {quickResults.length} results →
              </button>
            )}
          </div>
        </div>
      )}

      {advancedOpen && (
        <div className={`${overlayBase} ${compact ? "right-0 w-[26rem] max-w-[90vw]" : "left-0 right-0"}`}>
          <div className="bg-panel border border-parchment/10 rounded-xl shadow-lg p-4 sm:p-5">
            <AdvancedSearchPanel
              query={activeQuery}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              stories={stories}
              authors={authors}
              storiesLoading={storiesLoading}
            />
          </div>
        </div>
      )}
    </div>
  );
}
