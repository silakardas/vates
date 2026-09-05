import type { SupabaseClient } from "@supabase/supabase-js";

// Shared allowlist for story cover uploads — same shape as
// ALLOWED_AVATAR_TYPES (src/lib/avatar.ts) and ALLOWED_MOODBOARD_TYPES
// (src/lib/moodboardImage.ts). Keep in sync with the `allowed_mime_types`
// set on the `story-covers` storage bucket (see supabase/schema.sql).
export const ALLOWED_STORY_COVER_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export const MAX_STORY_COVER_BYTES = 5 * 1024 * 1024; // 5MB

export function storyCoverExtensionFor(mimeType: string): string | null {
  return ALLOWED_STORY_COVER_TYPES[mimeType] ?? null;
}

// Uploads (or replaces) a story's cover image and returns its public URL
// for the caller to persist onto the story (e.g. via StoryContext's
// updateStory(storyId, { coverImageUrl: url })) — this function doesn't
// touch story state itself, it only knows about storage. Validation
// order and error messages follow uploadMoodboardImage in
// StoryContext.tsx.
export async function uploadStoryCover(
  supabase: SupabaseClient,
  ownerId: string,
  storyId: string,
  file: File
): Promise<{ url?: string; error?: string }> {
  const ext = storyCoverExtensionFor(file.type);
  if (!ext) {
    return { error: "Please upload a JPG, PNG, WEBP, or GIF image." };
  }
  if (file.size > MAX_STORY_COVER_BYTES) {
    return { error: "Image must be under 5MB." };
  }

  // A story has exactly one cover, so — unlike moodboard's
  // random-uuid-per-image path (many images allowed) — this uses a
  // fixed path + upsert, closer to avatar.ts's single-slot pattern: a
  // re-upload replaces the existing cover instead of adding to it.
  const path = `${ownerId}/${storyId}/cover.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from("story-covers")
    .upload(path, file, { upsert: true });
  if (uploadError) return { error: uploadError.message };

  const {
    data: { publicUrl },
  } = supabase.storage.from("story-covers").getPublicUrl(path);

  // Cache-bust so a replaced cover shows immediately even though the
  // path (and therefore the URL) is otherwise unchanged.
  return { url: `${publicUrl}?t=${Date.now()}` };
}

// Removes a story's cover file(s) from storage. Lists the story's own
// folder rather than assuming a fixed extension, so it still cleans up
// correctly if the cover was re-uploaded in a different image format at
// some point — same list-then-remove approach as the avatar cleanup in
// src/app/api/account/delete/route.ts.
export async function removeStoryCover(
  supabase: SupabaseClient,
  ownerId: string,
  storyId: string
): Promise<{ error?: string }> {
  const prefix = `${ownerId}/${storyId}`;
  const { data: files, error: listError } = await supabase.storage
    .from("story-covers")
    .list(prefix);
  if (listError) return { error: listError.message };

  if (files?.length) {
    const { error: removeError } = await supabase.storage
      .from("story-covers")
      .remove(files.map((f) => `${prefix}/${f.name}`));
    if (removeError) return { error: removeError.message };
  }

  return {};
}