import { TAG_CATEGORIES, TagColumns, tagColumnsToStoryTags } from "@/lib/tags";

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
