"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { TagColumns, tagColumnsToStoryTags } from "@/lib/tags";
import AdvancedSearchPanel, { SearchTab } from "@/components/AdvancedSearchPanel";

// Row shape for a publicly-shared story, as read straight from Supabase —
// intentionally not the full `Story` type from StoryContext, since this
// only needs the fields relevant to browsing, and (unlike StoryContext)
// fetches everyone's public stories, not just the current user's own.
// Shared with AdvancedSearchPanel's "Story" tab, which does the heavier
// word-count/tag filtering over the same rows.
export type PublicStoryRow = TagColumns & {
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

const DEBOUNCE_MS = 280;
const MIN_QUERY_LENGTH = 2;
const QUICK_RESULT_LIMIT = 6;

// Scores how well a story matches a (lowercased) query — title beats
// author beats fandom/character tag — so the quick dropdown can list its
// best matches first instead of just filtering. 0 means "no match".
function storyMatchScore(
  story: PublicStoryRow,
  q: string,
  authorName: string | undefined,
  tags: ReturnType<typeof tagColumnsToStoryTags> | undefined
): number {
  if (!q) return 0;
  if (story.title.toLowerCase().includes(q)) return 3;
  if (authorName?.toLowerCase().includes(q)) return 2;
  if (tags?.fandoms.some((t) => t.includes(q)) || tags?.characters.some((t) => t.includes(q))) {
    return 1;
  }
  return 0;
}

// The site-wide search bar. Rendered from Header, so it appears on every
// page that renders <Header /> — this is what replaced the old
// DiscoverSection (which only ever lived on the homepage). Default typing
// searches public stories (title/author/fandom/character), same logic
// DiscoverSection used to have; "Advanced search" opens a panel with a
// full story-filter tab and a separate user-search tab.
export default function SearchBar() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<SearchTab>("story");
  const [dismissed, setDismissed] = useState(false);

  const [stories, setStories] = useState<PublicStoryRow[]>([]);
  const [authors, setAuthors] = useState<Record<string, string>>({});
  const [storiesLoading, setStoriesLoading] = useState(false);
  const storiesRequestedRef = useRef(false);

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
  // needed — a real search, or opening the Story tab to browse by its
  // filters — rather than on every page load just because the bar (and
  // therefore this component) is always mounted in the Header.
  useEffect(() => {
    const needsStories = activeQuery.length > 0 || (advancedOpen && activeTab === "story");
    if (!needsStories || storiesRequestedRef.current) return;
    storiesRequestedRef.current = true;

    let cancelled = false;
    const supabase = createClient();

    async function load() {
      setStoriesLoading(true);

      // Same query DiscoverSection used to run: every publicly-shared
      // story, no owner filter, relying on the "stories are
      // public-readable" RLS policy. Works for anon visitors too.
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
        setStoriesLoading(false);
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
        setStoriesLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [activeQuery, advancedOpen, activeTab]);

  // Quick preview results for the default (non-advanced) dropdown: text
  // match only, ranked by storyMatchScore, newest first as a tie-break.
  const quickResults = q
    ? stories
        .map((s) => ({
          story: s,
          score: storyMatchScore(s, q, authors[s.owner_id], tagColumnsToStoryTags(s)),
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

  return (
    <div
      className="relative px-4 sm:px-8 py-3 border-b border-parchment/10 bg-ink-soft/40"
      tabIndex={-1}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setAdvancedOpen(false);
          setDismissed(true);
        }
      }}
    >
      <div className="max-w-3xl mx-auto flex items-center gap-2">
        <div className="relative flex-1">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setDismissed(false)}
            placeholder="Search stories by title, fandom, character, or author..."
            aria-label="Search"
            className="w-full bg-ink-soft rounded-lg pl-9 pr-8 py-2.5 text-sm outline-none border border-parchment/10 focus:border-lamp/40 transition-colors placeholder:text-faint"
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
          className={`flex-shrink-0 text-xs font-mono uppercase tracking-wide px-3 py-2.5 rounded-lg border transition-colors whitespace-nowrap ${
            advancedOpen
              ? "bg-lamp/15 border-lamp/40 text-lamp"
              : "border-parchment/10 text-muted hover:text-parchment hover:border-parchment/20"
          }`}
        >
          Advanced search
        </button>
      </div>

      {showQuickDropdown && (
        <div className="absolute left-0 right-0 top-full z-30 px-4 sm:px-8 pt-2">
          <div className="max-w-3xl mx-auto bg-panel border border-parchment/10 rounded-xl shadow-lg overflow-hidden">
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
                          by {authors[story.owner_id] ?? "Unknown"}
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
                onClick={() => openAdvanced("story")}
                className="w-full text-center text-xs font-mono uppercase tracking-wide text-lamp py-2.5 border-t border-parchment/10 hover:bg-lamp/5 transition-colors"
              >
                See all {quickResults.length} results →
              </button>
            )}
          </div>
        </div>
      )}

      {advancedOpen && (
        <div className="absolute left-0 right-0 top-full z-30 px-4 sm:px-8 pt-2">
          <div className="max-w-3xl mx-auto bg-panel border border-parchment/10 rounded-xl shadow-lg p-4 sm:p-5">
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