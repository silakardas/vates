import { TAG_CATEGORIES, TagColumns, tagColumnsToStoryTags } from "@/lib/tags";
import { StoryTags, TagCategory } from "@/lib/types";

// Row shape for a publicly-shared story, as read straight from Supabase —
// intentionally not the full `Story` type from StoryContext, since this
// only needs the fields relevant to browsing, and (unlike StoryContext)
// fetches everyone's public stories, not just the current user's own.
// Shared by SearchBar's quick dropdown, AdvancedSearchPanel's "Story" tab,
// and the /search results page — all three filter/rank the same rows.
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

export type AuthorInfo = { username: string };

// Scores how well a story matches a (lowercased) query — title beats
// author beats fandom/character beats relationship/additional tag — so
// callers can rank their best matches first instead of just filtering.
// 0 means "no match". Checks all four TAG_CATEGORIES, not just
// fandoms/characters, so a hit on a relationship or additional tag still
// surfaces the story (just ranked below the more prominent fields).
export function storyMatchScore(
  story: PublicStoryRow,
  q: string,
  authorUsername: string | undefined,
  tags: ReturnType<typeof tagColumnsToStoryTags> | undefined
): number {
  if (!q) return 0;
  if (story.title.toLowerCase().includes(q)) return 5;
  if (authorUsername?.toLowerCase().includes(q)) return 4;
  if (tags?.fandoms.some((t) => t.toLowerCase().includes(q))) return 3;
  if (tags?.characters.some((t) => t.toLowerCase().includes(q))) return 3;
  if (tags?.relationships.some((t) => t.toLowerCase().includes(q))) return 2;
  if (tags?.additionalTags.some((t) => t.toLowerCase().includes(q))) return 2;
  return 0;
}

// Convenience boolean wrapper around storyMatchScore, for callers (like
// AdvancedSearchPanel's word-count/tag filtering) that only need a
// match/no-match check rather than a rank.
export function matchesStoryQuery(
  story: PublicStoryRow,
  q: string,
  authorUsername: string | undefined,
  tags: ReturnType<typeof tagColumnsToStoryTags> | undefined
): boolean {
  return storyMatchScore(story, q, authorUsername, tags) > 0;
}

// Re-exported so callers that already have a TagColumns row can build the
// `tags` argument above without a separate import.
export { TAG_CATEGORIES, tagColumnsToStoryTags };

// ---- Shared filter/sort building blocks -------------------------------
// Everything below powers the /search page's AO3-style "Sort and Filter"
// sidebar: sort options, an include/exclude tag selection shape, and the
// filtering + sorting functions themselves — kept here so the sidebar
// component and the page that owns its state aren't duplicating the same
// story-matching rules the rest of search already uses.

export type SortOption = "newest" | "views" | "likes";

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "views", label: "Most viewed" },
  { value: "likes", label: "Most liked" },
];

// One string[] per tag category — used for both "tags to include" and
// "tags to exclude" selections.
export type TagSelection = Record<TagCategory, string[]>;

export function emptyTagSelection(): TagSelection {
  return { fandoms: [], relationships: [], characters: [], additionalTags: [] };
}

// Popular tag values per category across a set of stories, most-used
// first — the options list for each Include/Exclude checkbox box.
export function computeTagsByCategory(
  stories: PublicStoryRow[],
  storyTags: Map<string, StoryTags>
): Record<TagCategory, string[]> {
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
  const result = {} as Record<TagCategory, string[]>;
  TAG_CATEGORIES.forEach(({ key }) => {
    result[key] = [...counts[key].entries()].sort((a, b) => b[1] - a[1]).map(([tag]) => tag);
  });
  return result;
}

// Filters stories by query text, include/exclude tag selections, and a
// word-count range, in one pass. `requireQuery: true` means an empty
// query yields zero matches (used everywhere search results are shown,
// so picking filters alone never renders a grid on its own).
export function filterStories(options: {
  stories: PublicStoryRow[];
  storyTags: Map<string, StoryTags>;
  authors: Record<string, AuthorInfo>;
  q: string; // already trimmed + lowercased
  requireQuery: boolean;
  includeTags: TagSelection;
  excludeTags: TagSelection;
  minWords: number | null;
  maxWords: number | null;
}): PublicStoryRow[] {
  const { stories, storyTags, authors, q, requireQuery, includeTags, excludeTags, minWords, maxWords } =
    options;

  return stories.filter((s) => {
    const tags = storyTags.get(s.id);
    const matchesQuery = requireQuery
      ? q.length > 0 && matchesStoryQuery(s, q, authors[s.owner_id]?.username, tags)
      : !q || matchesStoryQuery(s, q, authors[s.owner_id]?.username, tags);
    if (!matchesQuery) return false;

    // Include: every selected tag, in every category, must be present.
    const matchesInclude = TAG_CATEGORIES.every(({ key }) =>
      includeTags[key].every((t) => tags?.[key].includes(t) ?? false)
    );
    if (!matchesInclude) return false;

    // Exclude: none of the selected tags, in any category, may be present.
    const matchesExclude = TAG_CATEGORIES.every(({ key }) =>
      excludeTags[key].every((t) => !(tags?.[key].includes(t) ?? false))
    );
    if (!matchesExclude) return false;

    const wordCount = s.word_count ?? 0;
    if (minWords !== null && wordCount < minWords) return false;
    if (maxWords !== null && wordCount > maxWords) return false;

    return true;
  });
}

export function sortStories(stories: PublicStoryRow[], sortBy: SortOption): PublicStoryRow[] {
  return [...stories].sort((a, b) => {
    if (sortBy === "views") return (b.view_count ?? 0) - (a.view_count ?? 0);
    if (sortBy === "likes") return (b.like_count ?? 0) - (a.like_count ?? 0);
    // "newest": published_at if it has one, else created_at.
    const aTime = new Date(a.published_at ?? a.created_at).getTime();
    const bTime = new Date(b.published_at ?? b.created_at).getTime();
    return bTime - aTime;
  });
}
