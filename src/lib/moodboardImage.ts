// Shared allowlist for character moodboard uploads. Keep this in sync
// with the `allowed_mime_types` set on the `moodboards` storage bucket
// (see supabase/schema.sql) so client-side and server-side checks agree.
export const ALLOWED_MOODBOARD_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export const MAX_MOODBOARD_BYTES = 5 * 1024 * 1024; // 5MB

export function moodboardExtensionFor(mimeType: string): string | null {
  return ALLOWED_MOODBOARD_TYPES[mimeType] ?? null;
}