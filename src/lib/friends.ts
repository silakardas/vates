import { createClient } from "@/lib/supabase/client";

// The "friends" (mutual, request/accept) relationship system has been
// replaced by one-way follows (see follows.ts). All that's left here is
// the general-purpose user search used by the global search bar's
// "Users" tab — it's just a profile lookup and isn't tied to either
// relationship system.

export type FriendProfile = {
  id: string;
  username: string;
  avatarUrl: string | null;
};

// How many profiles the global search bar's "Users" tab shows at once —
// a quick-glance list, not a full paginated directory.
const USER_SEARCH_LIMIT = 8;

// Searches profiles by username for the global search bar's "Users" tab.
// Relies on the "profiles are readable by authenticated users" policy
// (see supabase/schema.sql) — id/username/avatar_url are only guaranteed
// visible for every profile, not just ones with a public story, when
// called with a signed-in Supabase client. Callers should only surface
// this to logged-in users.
export async function searchUsers(
  query: string,
  excludeUserId: string
): Promise<FriendProfile[]> {
  // Usernames are always lowercase (enforced by the format constraint in
  // schema.sql), so normalize the query the same way — makes the match
  // deterministic instead of leaning on ILIKE's case folding, and means
  // "@Haşme" vs "haşme" behave identically.
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, avatar_url")
    .ilike("username", `%${q}%`)
    .neq("id", excludeUserId)
    .limit(USER_SEARCH_LIMIT);

  if (error) {
    console.error("Failed to search users:", error.message);
    return [];
  }

  return (data ?? []).map((p) => ({
    id: p.id as string,
    username: p.username as string,
    avatarUrl: (p.avatar_url as string | null) ?? null,
  }));
}