// Shared allowlist for avatar uploads. Keep this in sync with the
// `allowed_mime_types` set on the `avatars` storage bucket (see
// supabase/schema.sql) so client-side and server-side checks agree.
export const ALLOWED_AVATAR_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5MB

export function avatarExtensionFor(mimeType: string): string | null {
  return ALLOWED_AVATAR_TYPES[mimeType] ?? null;
}