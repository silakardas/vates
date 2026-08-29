import { StoryTags, TagCategory } from "./types";

// Single source of truth for the 4 tag categories — their storage key,
// display label, and input placeholder — so the editor sidebar and the
// /discover filters stay in sync without repeating this list everywhere.
// Order here is also the display order (AO3-style: fandom, relationship,
// character, then everything else).
export const TAG_CATEGORIES: {
  key: TagCategory;
  label: string;
  placeholder: string;
}[] = [
  { key: "fandoms", label: "Fandom", placeholder: "Add a fandom..." },
  { key: "relationships", label: "Relationship", placeholder: "Add a relationship..." },
  { key: "characters", label: "Character", placeholder: "Add a character..." },
  { key: "additionalTags", label: "Additional Tags", placeholder: "Add a tag..." },
];

export function emptyStoryTags(): StoryTags {
  return { fandoms: [], relationships: [], characters: [], additionalTags: [] };
}

// Combines two string arrays, keeping `primary`'s order and dropping any
// `legacy` entries already present in it.
function mergeUnique(primary: string[], legacy: string[]): string[] {
  if (legacy.length === 0) return primary;
  const seen = new Set(primary);
  const merged = [...primary];
  for (const t of legacy) {
    if (!seen.has(t)) {
      seen.add(t);
      merged.push(t);
    }
  }
  return merged;
}

// Shape of the tag-related columns as read straight from Supabase. Shared
// by StoryContext's own row type and by the read-only public pages
// (discover, profile, homepage spotlight) that query `stories` directly.
// `tags` is the old pre-migration single-array column: still selected so
// any story that hasn't been re-saved since the category split doesn't
// lose its tags, but never written to again.
export type TagColumns = {
  fandoms: string[] | null;
  relationships: string[] | null;
  tag_characters: string[] | null;
  additional_tags: string[] | null;
  tags?: string[] | null;
};

export function tagColumnsToStoryTags(row: TagColumns): StoryTags {
  return {
    fandoms: row.fandoms ?? [],
    relationships: row.relationships ?? [],
    characters: row.tag_characters ?? [],
    // Legacy flat tags had no category, so folding them into
    // "Additional Tags" is the closest lossless home for them.
    additionalTags: mergeUnique(row.additional_tags ?? [], row.tags ?? []),
  };
}

export function flattenStoryTags(tags: StoryTags): string[] {
  return [...tags.fandoms, ...tags.relationships, ...tags.characters, ...tags.additionalTags];
}