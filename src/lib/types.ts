import { StoryStatus } from "./storyStatus";

export type ChapterVersion = {
  id: string;
  content: string;
  wordCount: number;
  createdAt: number;
  label?: string; // e.g. a user note, or "Auto-saved" / "Before restore"
};

export type Chapter = {
  id: string;
  title: string;
  content: string; // HTML content from the editor
  wordCount: number;
  versions: ChapterVersion[];
};

export type StoryType = "oneshot" | "series";

export type MoodboardImage = {
  id: string;
  url: string;
  caption?: string;
};

export type Character = {
  id: string;
  name: string;
  role: string; // e.g. "Protagonist", "Love interest" — freeform
  description: string;
  x?: number; // position on the story map canvas
  y?: number;
  moodboard?: MoodboardImage[];
  // Opt-in: show this character's moodboard on the public story page.
  // Undefined/false = private (default) — the moodboard stays workshop-only
  // unless the writer explicitly turns this on. No separate DB column:
  // characters is already a jsonb array, so this just rides along.
  showMoodboardPublicly?: boolean;
};

// A plot point / scene the writer wants to track and link to characters
// (or to other events) on the story map.
export type MapEvent = {
  id: string;
  title: string;
  description: string;
  x?: number;
  y?: number;
};

// A link between two map nodes. Each end is a node id — either a
// Character.id or a MapEvent.id — since both live on the same canvas.
export type MapConnection = {
  id: string;
  fromId: string;
  toId: string;
};

export type NoteEntry = {
  id: string;
  title: string;
  content: string;
  updatedAt: number;
};

// AO3-style tag categories, kept simple: no separate tags table, just the
// existing jsonb-array pattern split four ways instead of one.
export type TagCategory = "fandoms" | "relationships" | "characters" | "additionalTags";

export type StoryTags = {
  fandoms: string[];
  relationships: string[];
  characters: string[];
  additionalTags: string[];
};

export type Story = {
  id: string;
  title: string;
  description?: string;
  type: StoryType;
  chapters: Chapter[];
  tags: StoryTags;
  status: StoryStatus;
  streak?: number;
  lastWriteDate?: string; // "YYYY-MM-DD", last calendar day the streak was bumped
  updatedAt: number; // timestamp, used to find "last edited"
  pinned?: boolean; // pinned to the top of the workshop list
  isPublic: boolean;
  publishedAt?: number;
  coverImageUrl?: string; // optional — set via src/lib/storyCover.ts
  characters: Character[];
  events: MapEvent[];
  connections: MapConnection[];
  notes: NoteEntry[]; // titled scratchpad notes for the story
};

export function totalWordCount(story: Story): number {
  return story.chapters.reduce((sum, c) => sum + c.wordCount, 0);
}