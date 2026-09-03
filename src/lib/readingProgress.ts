import { createClient } from "@/lib/supabase/client";
import type { Chapter } from "@/lib/types";

export type ReadingProgress = {
  storyId: string;
  chapterId: string | null;
  scrollFraction: number;
  updatedAt: string;
};

// The "Continue reading" card needs enough about the story/author to
// render itself without a second round trip per card — title/type so it
// knows whether to show a chapter label, owner_id so the caller can
// filter out the reader's own stories.
export type ContinueReadingEntry = {
  storyId: string;
  chapterId: string | null;
  scrollFraction: number;
  updatedAt: string;
  story: {
    title: string;
    type: "oneshot" | "series";
    ownerId: string;
  };
  // The specific chapter the reader was on (falls back to the last
  // chapter if chapterId is null/stale — e.g. a oneshot, or a chapter
  // that's since been removed), so the card can show a relevant excerpt.
  chapter: {
    title: string;
    content: string;
  } | null;
  author: {
    username: string;
  };
};

// Fetches this reader's saved position for a single story — used by
// /discover/[id] to auto-scroll back to where they left off.
export async function getReadingProgress(
  userId: string,
  storyId: string
): Promise<ReadingProgress | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("reading_progress")
    .select("story_id, chapter_id, scroll_fraction, updated_at")
    .eq("story_id", storyId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    storyId: data.story_id as string,
    chapterId: data.chapter_id as string | null,
    scrollFraction: data.scroll_fraction as number,
    updatedAt: data.updated_at as string,
  };
}

// Upsert: primary key is (story_id, user_id), so this always overwrites
// the reader's single "last position" row for that story rather than
// accumulating history.
export async function saveReadingProgress(
  userId: string,
  storyId: string,
  chapterId: string | null,
  scrollFraction: number
) {
  const supabase = createClient();
  const { error } = await supabase.from("reading_progress").upsert({
    story_id: storyId,
    user_id: userId,
    chapter_id: chapterId,
    scroll_fraction: Math.max(0, Math.min(1, scrollFraction)),
    updated_at: new Date().toISOString(),
  });
  if (error) {
    console.error("Failed to save reading progress:", error.message);
  }
}

// How many of the reader's most-recently-updated positions to look at
// when picking a "Continue reading" story — small, since only the very
// latest (that isn't the reader's own story) is actually shown.
const RECENT_PROGRESS_LOOKBACK = 5;

// Latest story someone else wrote that this reader was partway through,
// for the homepage/workshop "Continue reading" card. Looks back a
// handful of rows (not just the single latest) so that if the very
// latest happens to be the reader's own story — previewing their own
// work counts as a reading_progress row too — the next most recent
// still surfaces instead of the card just disappearing.
export async function getContinueReading(
  userId: string
): Promise<ContinueReadingEntry | null> {
  const supabase = createClient();

  const { data: progressRows, error } = await supabase
    .from("reading_progress")
    .select("story_id, chapter_id, scroll_fraction, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(RECENT_PROGRESS_LOOKBACK);

  if (error || !progressRows || progressRows.length === 0) return null;

  const storyIds = progressRows.map((p) => p.story_id as string);
  const { data: storyRows } = await supabase
    .from("stories")
    .select("id, title, type, owner_id, chapters")
    .in("id", storyIds);

  const storyById = new Map((storyRows ?? []).map((s) => [s.id as string, s]));

  // Owner filter lives here (not just in the caller) so the very first
  // *readable* entry is what gets returned — the caller doesn't need to
  // know about the lookback/skip logic at all.
  const entry = progressRows.find((p) => {
    const story = storyById.get(p.story_id as string);
    return story && story.owner_id !== userId;
  });
  if (!entry) return null;

  const story = storyById.get(entry.story_id as string)!;

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", story.owner_id as string)
    .maybeSingle();

  const chapters = (story.chapters as Chapter[] | null) ?? [];
  const chapter =
    chapters.find((c) => c.id === entry.chapter_id) ?? chapters[chapters.length - 1] ?? null;

  return {
    storyId: entry.story_id as string,
    chapterId: entry.chapter_id as string | null,
    scrollFraction: entry.scroll_fraction as number,
    updatedAt: entry.updated_at as string,
    story: {
      title: story.title as string,
      type: story.type as "oneshot" | "series",
      ownerId: story.owner_id as string,
    },
    chapter: chapter ? { title: chapter.title, content: chapter.content } : null,
    author: {
      username: (profileRow?.username as string | undefined) ?? "Unknown",
    },
  };
}
