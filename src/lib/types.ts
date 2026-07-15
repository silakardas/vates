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

export type Character = {
  id: string;
  name: string;
  role: string; // e.g. "Protagonist", "Love interest" — freeform
  description: string;
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
  characters: Character[];
  notes: string; // freeform HTML/plain text scratchpad for the story
};

export function totalWordCount(story: Story): number {
  return story.chapters.reduce((sum, c) => sum + c.wordCount, 0);
}