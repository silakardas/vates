"use client";

import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { Story, Chapter, Character, ChapterVersion, MapEvent, MapConnection, MoodboardImage, NoteEntry } from "./types";
import { useAuth } from "./AuthContext";
import { createClient } from "@/lib/supabase/client";
import { moodboardExtensionFor, MAX_MOODBOARD_BYTES } from "@/lib/moodboardImage";

// Local (not UTC) calendar date, so a streak doesn't break at midnight UTC
// for users in other timezones.
function getLocalDateString(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Whole-day difference between two "YYYY-MM-DD" strings.
function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  const da = Date.UTC(ay, am - 1, ad);
  const db = Date.UTC(by, bm - 1, bd);
  return Math.round((db - da) / 86_400_000);
}

function newChapter(title: string): Chapter {
  return {
    id: crypto.randomUUID(),
    title,
    content: "<p></p>",
    wordCount: 0,
    versions: [],
  };
}

// Auto-checkpoint tuning: snapshot the previous content when enough has
// changed, without spamming a version on every keystroke.
const AUTO_VERSION_MIN_WORD_DELTA = 200;
const AUTO_VERSION_MIN_GAP_MS = 45 * 1000; // don't snapshot more than once per 45s
const AUTO_VERSION_MAX_GAP_MS = 10 * 60 * 1000; // but always snapshot after 10 idle-free minutes

// How long to wait after the last edit before writing to Supabase.
const PERSIST_DEBOUNCE_MS = 1500;

function newCharacter(): Character {
  return {
    id: crypto.randomUUID(),
    name: "New character",
    role: "",
    description: "",
    moodboard: [],
  };
}

function newNote(): NoteEntry {
  return {
    id: crypto.randomUUID(),
    title: "New note",
    content: "",
    updatedAt: Date.now(),
  };
}

// The `notes` DB column stores either legacy plain text (a single freeform
// scratchpad) or, going forward, a JSON-encoded NoteEntry[]. Normalize both
// into NoteEntry[] so the rest of the app only deals with one shape.
function parseNotes(raw: string | null | undefined): NoteEntry[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((n) => n && typeof n === "object" && typeof n.id === "string")
        .map((n) => ({
          id: n.id,
          title: typeof n.title === "string" ? n.title : "Untitled note",
          content: typeof n.content === "string" ? n.content : "",
          updatedAt: typeof n.updatedAt === "number" ? n.updatedAt : Date.now(),
        }));
    }
  } catch {
    // Not JSON — fall through to legacy plain-text handling below.
  }
  // Legacy scratchpad: a single plain-text string. Wrap it as one note so
  // existing notes aren't lost when a story is opened for the first time
  // after this change.
  return [
    {
      id: crypto.randomUUID(),
      title: "Notes",
      content: raw,
      updatedAt: Date.now(),
    },
  ];
}

function newEvent(): MapEvent {
  return {
    id: crypto.randomUUID(),
    title: "New event",
    description: "",
  };
}

function newStory(): Story {
  return {
    id: crypto.randomUUID(),
    title: "Untitled story",
    description: "",
    type: "oneshot",
    tags: [],
    status: "inProgress",
    updatedAt: Date.now(),
    streak: 0,
    lastWriteDate: undefined,
    chapters: [newChapter("Untitled story")],
    characters: [],
    events: [],
    connections: [],
    notes: [],
  };
}

// Row shape in the `stories` table <-> the app's Story type.
type StoryRow = {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  type: Story["type"];
  tags: string[];
  status: Story["status"];
  streak: number | null;
  last_write_date: string | null;
  notes: string;
  chapters: Chapter[];
  characters: Character[];
  events: MapEvent[] | null;
  connections: MapConnection[] | null;
  updated_at: string;
};

function rowToStory(row: StoryRow): Story {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    type: row.type,
    tags: row.tags ?? [],
    status: row.status,
    streak: row.streak ?? undefined,
    lastWriteDate: row.last_write_date ?? undefined,
    updatedAt: new Date(row.updated_at).getTime(),
    chapters: row.chapters ?? [],
    characters: row.characters ?? [],
    events: row.events ?? [],
    connections: row.connections ?? [],
    notes: parseNotes(row.notes),
  };
}

function storyToRow(story: Story, ownerId: string) {
  return {
    id: story.id,
    owner_id: ownerId,
    title: story.title,
    description: story.description ?? null,
    type: story.type,
    tags: story.tags,
    status: story.status,
    streak: story.streak ?? null,
    last_write_date: story.lastWriteDate ?? null,
    notes: JSON.stringify(story.notes),
    chapters: story.chapters,
    characters: story.characters,
    events: story.events,
    connections: story.connections,
    updated_at: new Date(story.updatedAt).toISOString(),
  };
}

export type SaveStatus = {
  state: "saving" | "saved" | "error";
  error?: string;
  at: number;
};

type StoryContextType = {
  stories: Story[];
  loading: boolean;
  getSaveStatus: (id: string) => SaveStatus | undefined;
  retrySave: (id: string) => void;
  getStory: (id: string) => Story | undefined;
  createStory: () => Story;
  updateStory: (id: string, updates: Partial<Story>) => void;
  addChapter: (storyId: string) => Chapter | undefined;
  updateChapter: (storyId: string, chapterId: string, updates: Partial<Chapter>) => void;
  addTag: (storyId: string, tag: string) => void;
  removeTag: (storyId: string, tag: string) => void;
  addCharacter: (storyId: string) => Character | undefined;
  updateCharacter: (storyId: string, characterId: string, updates: Partial<Character>) => void;
  removeCharacter: (storyId: string, characterId: string) => void;
  addEvent: (storyId: string) => MapEvent | undefined;
  updateEvent: (storyId: string, eventId: string, updates: Partial<MapEvent>) => void;
  removeEvent: (storyId: string, eventId: string) => void;
  toggleConnection: (storyId: string, fromId: string, toId: string) => void;
  uploadMoodboardImage: (
    storyId: string,
    characterId: string,
    file: File
  ) => Promise<{ error?: string }>;
  removeMoodboardImage: (storyId: string, characterId: string, imageId: string) => void;
  addNote: (storyId: string) => NoteEntry | undefined;
  updateNote: (storyId: string, noteId: string, updates: Partial<NoteEntry>) => void;
  removeNote: (storyId: string, noteId: string) => void;
  saveVersion: (storyId: string, chapterId: string, label?: string) => void;
  restoreVersion: (storyId: string, chapterId: string, versionId: string) => void;
};

const StoryContext = createContext<StoryContextType | null>(null);

export function StoryProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  // Debounce timers per story id, so fast typing doesn't spam the DB.
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const deletedIds = useRef<Set<string>>(new Set());
  const [saveStatuses, setSaveStatuses] = useState<Record<string, SaveStatus>>({});

  // Load this user's stories whenever they log in; clear them on logout.
  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!user) {
        setStories([]);
        setSaveStatuses({});
        setLoading(false);
        return;
      }
      setLoading(true);
      const { data, error } = await supabase
        .from("stories")
        .select("*")
        .eq("owner_id", user.id)
        .order("updated_at", { ascending: false });

      if (!cancelled) {
        if (error) {
          console.error("Failed to load stories:", error.message);
          setStories([]);
        } else {
          setStories((data as StoryRow[]).map(rowToStory));
        }
        setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function saveNow(story: Story) {
    if (!user || deletedIds.current.has(story.id)) return;
    const id = story.id;
    setSaveStatuses((prev) => ({ ...prev, [id]: { state: "saving", at: Date.now() } }));
    const { error } = await supabase.from("stories").upsert(storyToRow(story, user.id));
    if (error) {
      console.error("Failed to save story:", error.message);
      setSaveStatuses((prev) => ({
        ...prev,
        [id]: { state: "error", error: error.message, at: Date.now() },
      }));
    } else {
      setSaveStatuses((prev) => ({ ...prev, [id]: { state: "saved", at: Date.now() } }));
    }
  }

  function persist(story: Story) {
    if (!user) return;
    const id = story.id;
    if (saveTimers.current[id]) clearTimeout(saveTimers.current[id]);
    saveTimers.current[id] = setTimeout(() => {
      saveNow(story);
    }, PERSIST_DEBOUNCE_MS);
  }

  function getSaveStatus(id: string) {
    return saveStatuses[id];
  }

  function retrySave(id: string) {
    const story = stories.find((s) => s.id === id);
    if (!story) return;
    if (saveTimers.current[id]) clearTimeout(saveTimers.current[id]);
    saveNow(story);
  }

  function getStory(id: string) {
    return stories.find((s) => s.id === id);
  }

  function createStory(): Story {
    const created = newStory();
    setStories((prev) => [created, ...prev]);
    persist(created);
    return created;
  }

  function updateStory(id: string, updates: Partial<Story>) {
    setStories((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const next = { ...s, ...updates, updatedAt: Date.now() };
        persist(next);
        return next;
      })
    );
  }

  function addChapter(storyId: string): Chapter | undefined {
    let created: Chapter | undefined;
    setStories((prev) =>
      prev.map((s) => {
        if (s.id !== storyId) return s;
        created = newChapter(`Chapter ${s.chapters.length + 1}`);
        const next = { ...s, chapters: [...s.chapters, created], updatedAt: Date.now() };
        persist(next);
        return next;
      })
    );
    return created;
  }

  function updateChapter(storyId: string, chapterId: string, updates: Partial<Chapter>) {
    setStories((prev) =>
      prev.map((s) => {
        if (s.id !== storyId) return s;

        const original = s.chapters.find((c) => c.id === chapterId);
        const contentChanged =
          updates.content !== undefined &&
          original !== undefined &&
          updates.content !== original.content;

        // Bump the streak at most once per calendar day. A gap of exactly
        // one day extends it; anything else (including the very first
        // write) restarts it at 1.
        let streak = s.streak ?? 0;
        let lastWriteDate = s.lastWriteDate;
        if (contentChanged) {
          const today = getLocalDateString();
          if (lastWriteDate !== today) {
            streak =
              lastWriteDate && daysBetween(lastWriteDate, today) === 1
                ? streak + 1
                : 1;
            lastWriteDate = today;
          }
        }

        const next = {
          ...s,
          updatedAt: Date.now(),
          streak,
          lastWriteDate,
          chapters: s.chapters.map((c) => {
            if (c.id !== chapterId) return c;

            let versions = c.versions;
            const hasExistingContent =
              c.content.replace(/<[^>]+>/g, "").trim().length > 0;

            if (contentChanged && hasExistingContent) {
              const last = versions[versions.length - 1];
              const now = Date.now();
              const wordDelta = Math.abs(
                (updates.wordCount ?? c.wordCount) - c.wordCount
              );
              const gapSinceLast = now - (last?.createdAt ?? 0);
              const dueForSnapshot =
                !last ||
                (wordDelta >= AUTO_VERSION_MIN_WORD_DELTA &&
                  gapSinceLast >= AUTO_VERSION_MIN_GAP_MS) ||
                gapSinceLast >= AUTO_VERSION_MAX_GAP_MS;

              if (dueForSnapshot) {
                versions = [
                  ...versions,
                  {
                    id: crypto.randomUUID(),
                    content: c.content,
                    wordCount: c.wordCount,
                    createdAt: now,
                    label: "Auto-saved",
                  },
                ];
              }
            }

            return { ...c, ...updates, versions };
          }),
        };
        persist(next);
        return next;
      })
    );
  }

  function saveVersion(storyId: string, chapterId: string, label?: string) {
    setStories((prev) =>
      prev.map((s) => {
        if (s.id !== storyId) return s;
        const next = {
          ...s,
          chapters: s.chapters.map((c) => {
            if (c.id !== chapterId) return c;
            const version: ChapterVersion = {
              id: crypto.randomUUID(),
              content: c.content,
              wordCount: c.wordCount,
              createdAt: Date.now(),
              label: label?.trim() || undefined,
            };
            return { ...c, versions: [...c.versions, version] };
          }),
        };
        persist(next);
        return next;
      })
    );
  }

  function restoreVersion(storyId: string, chapterId: string, versionId: string) {
    setStories((prev) =>
      prev.map((s) => {
        if (s.id !== storyId) return s;
        const next = {
          ...s,
          updatedAt: Date.now(),
          chapters: s.chapters.map((c) => {
            if (c.id !== chapterId) return c;
            const version = c.versions.find((v) => v.id === versionId);
            if (!version) return c;
            // Keep the current state recoverable instead of discarding it.
            const safetyNet: ChapterVersion = {
              id: crypto.randomUUID(),
              content: c.content,
              wordCount: c.wordCount,
              createdAt: Date.now(),
              label: "Before restore",
            };
            return {
              ...c,
              content: version.content,
              wordCount: version.wordCount,
              versions: [...c.versions, safetyNet],
            };
          }),
        };
        persist(next);
        return next;
      })
    );
  }

  function addTag(storyId: string, tag: string) {
    const clean = tag.trim().toLowerCase();
    if (!clean) return;
    setStories((prev) =>
      prev.map((s) => {
        if (s.id !== storyId || s.tags.includes(clean)) return s;
        const next = { ...s, tags: [...s.tags, clean] };
        persist(next);
        return next;
      })
    );
  }

  function removeTag(storyId: string, tag: string) {
    setStories((prev) =>
      prev.map((s) => {
        if (s.id !== storyId) return s;
        const next = { ...s, tags: s.tags.filter((t) => t !== tag) };
        persist(next);
        return next;
      })
    );
  }

  function addCharacter(storyId: string): Character | undefined {
    let created: Character | undefined;
    setStories((prev) =>
      prev.map((s) => {
        if (s.id !== storyId) return s;
        created = newCharacter();
        const next = { ...s, characters: [...s.characters, created], updatedAt: Date.now() };
        persist(next);
        return next;
      })
    );
    return created;
  }

  function updateCharacter(storyId: string, characterId: string, updates: Partial<Character>) {
    setStories((prev) =>
      prev.map((s) => {
        if (s.id !== storyId) return s;
        const next = {
          ...s,
          updatedAt: Date.now(),
          characters: s.characters.map((c) =>
            c.id === characterId ? { ...c, ...updates } : c
          ),
        };
        persist(next);
        return next;
      })
    );
  }

  function removeCharacter(storyId: string, characterId: string) {
    setStories((prev) =>
      prev.map((s) => {
        if (s.id !== storyId) return s;
        const next = {
          ...s,
          characters: s.characters.filter((c) => c.id !== characterId),
          // Drop any map connections that pointed at this character.
          connections: s.connections.filter(
            (conn) => conn.fromId !== characterId && conn.toId !== characterId
          ),
        };
        persist(next);
        return next;
      })
    );
  }

  function addEvent(storyId: string): MapEvent | undefined {
    let created: MapEvent | undefined;
    setStories((prev) =>
      prev.map((s) => {
        if (s.id !== storyId) return s;
        created = newEvent();
        const next = { ...s, events: [...s.events, created], updatedAt: Date.now() };
        persist(next);
        return next;
      })
    );
    return created;
  }

  function updateEvent(storyId: string, eventId: string, updates: Partial<MapEvent>) {
    setStories((prev) =>
      prev.map((s) => {
        if (s.id !== storyId) return s;
        const next = {
          ...s,
          updatedAt: Date.now(),
          events: s.events.map((e) => (e.id === eventId ? { ...e, ...updates } : e)),
        };
        persist(next);
        return next;
      })
    );
  }

  function removeEvent(storyId: string, eventId: string) {
    setStories((prev) =>
      prev.map((s) => {
        if (s.id !== storyId) return s;
        const next = {
          ...s,
          events: s.events.filter((e) => e.id !== eventId),
          connections: s.connections.filter(
            (conn) => conn.fromId !== eventId && conn.toId !== eventId
          ),
        };
        persist(next);
        return next;
      })
    );
  }

  // Connecting the same pair twice removes the link — a click on either
  // node again toggles it off, so the canvas needs no separate "delete
  // connection" affordance.
  function toggleConnection(storyId: string, fromId: string, toId: string) {
    setStories((prev) =>
      prev.map((s) => {
        if (s.id !== storyId) return s;
        const existing = s.connections.find(
          (c) =>
            (c.fromId === fromId && c.toId === toId) ||
            (c.fromId === toId && c.toId === fromId)
        );
        const next = {
          ...s,
          connections: existing
            ? s.connections.filter((c) => c.id !== existing.id)
            : [...s.connections, { id: crypto.randomUUID(), fromId, toId }],
        };
        persist(next);
        return next;
      })
    );
  }

  async function uploadMoodboardImage(storyId: string, characterId: string, file: File) {
    if (!user) return { error: "Not logged in" };

    const ext = moodboardExtensionFor(file.type);
    if (!ext) {
      return { error: "Please upload a JPG, PNG, WEBP, or GIF image." };
    }
    if (file.size > MAX_MOODBOARD_BYTES) {
      return { error: "Image must be under 5MB." };
    }

    const path = `${user.id}/${characterId}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("moodboards")
      .upload(path, file);
    if (uploadError) return { error: uploadError.message };

    const {
      data: { publicUrl },
    } = supabase.storage.from("moodboards").getPublicUrl(path);

    const image: MoodboardImage = { id: crypto.randomUUID(), url: publicUrl };

    setStories((prev) =>
      prev.map((s) => {
        if (s.id !== storyId) return s;
        const next = {
          ...s,
          updatedAt: Date.now(),
          characters: s.characters.map((c) =>
            c.id === characterId
              ? { ...c, moodboard: [...(c.moodboard ?? []), image] }
              : c
          ),
        };
        persist(next);
        return next;
      })
    );

    return {};
  }

  function removeMoodboardImage(storyId: string, characterId: string, imageId: string) {
    setStories((prev) =>
      prev.map((s) => {
        if (s.id !== storyId) return s;
        const next = {
          ...s,
          characters: s.characters.map((c) =>
            c.id === characterId
              ? { ...c, moodboard: (c.moodboard ?? []).filter((m) => m.id !== imageId) }
              : c
          ),
        };
        persist(next);
        return next;
      })
    );
  }

  function addNote(storyId: string): NoteEntry | undefined {
    let created: NoteEntry | undefined;
    setStories((prev) =>
      prev.map((s) => {
        if (s.id !== storyId) return s;
        created = newNote();
        const next = { ...s, notes: [...s.notes, created], updatedAt: Date.now() };
        persist(next);
        return next;
      })
    );
    return created;
  }

  function updateNote(storyId: string, noteId: string, updates: Partial<NoteEntry>) {
    setStories((prev) =>
      prev.map((s) => {
        if (s.id !== storyId) return s;
        const next = {
          ...s,
          updatedAt: Date.now(),
          notes: s.notes.map((n) =>
            n.id === noteId ? { ...n, ...updates, updatedAt: Date.now() } : n
          ),
        };
        persist(next);
        return next;
      })
    );
  }

  function removeNote(storyId: string, noteId: string) {
    setStories((prev) =>
      prev.map((s) => {
        if (s.id !== storyId) return s;
        const next = { ...s, notes: s.notes.filter((n) => n.id !== noteId), updatedAt: Date.now() };
        persist(next);
        return next;
      })
    );
  }

  return (
    <StoryContext.Provider
      value={{
        stories,
        loading,
        getSaveStatus,
        retrySave,
        getStory,
        createStory,
        updateStory,
        addChapter,
        updateChapter,
        addTag,
        removeTag,
        addCharacter,
        updateCharacter,
        removeCharacter,
        addEvent,
        updateEvent,
        removeEvent,
        toggleConnection,
        uploadMoodboardImage,
        removeMoodboardImage,
        addNote,
        updateNote,
        removeNote,
        saveVersion,
        restoreVersion,
      }}
    >
      {children}
    </StoryContext.Provider>
  );
}

export function useStories() {
  const ctx = useContext(StoryContext);
  if (!ctx) throw new Error("useStories must be used within a StoryProvider");
  return ctx;
}