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

export type Story = {
  id: string;
  title: string;
  description?: string;
  type: StoryType;
  chapters: Chapter[];
  tags: string[];
  status: StoryStatus;
  streak?: number;
  lastWriteDate?: string; // "YYYY-MM-DD", last calendar day the streak was bumped
  updatedAt: number; // timestamp, used to find "last edited"
  isPublic: boolean;
  publishedAt?: number;
  characters: Character[];
  events: MapEvent[];
  connections: MapConnection[];
  notes: NoteEntry[]; // titled scratchpad notes for the story
};

export function totalWordCount(story: Story): number {
  return story.chapters.reduce((sum, c) => sum + c.wordCount, 0);
}