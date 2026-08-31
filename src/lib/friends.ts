import { createClient } from "@/lib/supabase/client";

// A single row from public.friend_requests. "pending" until the receiver
// responds; "accepted" rows *are* the friendship (there's no separate
// friendships table — two users are friends iff an accepted row exists
// between them, in either direction).
export type FriendRequestStatus = "pending" | "accepted" | "declined";

export type FriendStatus =
  | { kind: "none" }
  | { kind: "friends"; requestId: string }
  // I sent it, still waiting on them.
  | { kind: "outgoing"; requestId: string }
  // They sent it, waiting on me.
  | { kind: "incoming"; requestId: string };

export type FriendProfile = {
  id: string;
  username: string;
  name: string;
  avatarUrl: string | null;
};

export type IncomingRequest = {
  requestId: string;
  createdAt: string;
  from: FriendProfile;
};

// Where the two users currently stand, from currentUserId's perspective.
// Declined requests are treated the same as no relationship at all, so a
// decline never permanently blocks a future request either way.
export async function getFriendStatus(
  currentUserId: string,
  otherUserId: string
): Promise<FriendStatus> {
  const supabase = createClient();
  const { data } = await supabase
    .from("friend_requests")
    .select("id, sender_id, receiver_id, status")
    .or(
      `and(sender_id.eq.${currentUserId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUserId})`
    )
    .neq("status", "declined")
    .maybeSingle();

  if (!data) return { kind: "none" };
  if (data.status === "accepted") return { kind: "friends", requestId: data.id };
  return data.sender_id === currentUserId
    ? { kind: "outgoing", requestId: data.id }
    : { kind: "incoming", requestId: data.id };
}

// Sends a friend request — unless the other person already sent us a
// pending one, in which case this just accepts theirs instead of creating
// a mirror-image duplicate row.
export async function sendFriendRequest(currentUserId: string, otherUserId: string) {
  const supabase = createClient();

  const { data: incoming } = await supabase
    .from("friend_requests")
    .select("id")
    .eq("sender_id", otherUserId)
    .eq("receiver_id", currentUserId)
    .eq("status", "pending")
    .maybeSingle();

  if (incoming) {
    return respondToFriendRequest(incoming.id, "accepted");
  }

  // A previously-declined request between the same pair blocks a second
  // insert (unique sender/receiver pair), so clear it out first — this
  // request supersedes it.
  await supabase
    .from("friend_requests")
    .delete()
    .eq("sender_id", currentUserId)
    .eq("receiver_id", otherUserId)
    .eq("status", "declined");

  const { error } = await supabase
    .from("friend_requests")
    .insert({ sender_id: currentUserId, receiver_id: otherUserId, status: "pending" });
  return { error: error?.message };
}

export async function respondToFriendRequest(
  requestId: string,
  status: "accepted" | "declined"
) {
  const supabase = createClient();
  const { error } = await supabase
    .from("friend_requests")
    .update({ status, responded_at: new Date().toISOString() })
    .eq("id", requestId);
  return { error: error?.message };
}

// Cancels an outgoing request or removes an existing friendship — both
// are just "delete the row", the only difference is its current status.
export async function removeFriendOrRequest(requestId: string) {
  const supabase = createClient();
  const { error } = await supabase.from("friend_requests").delete().eq("id", requestId);
  return { error: error?.message };
}

export async function listFriends(userId: string): Promise<FriendProfile[]> {
  const supabase = createClient();
  const { data: links } = await supabase
    .from("friend_requests")
    .select("sender_id, receiver_id")
    .eq("status", "accepted")
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);

  if (!links || links.length === 0) return [];

  const otherIds = links.map((r) => (r.sender_id === userId ? r.receiver_id : r.sender_id));
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username, name, avatar_url")
    .in("id", otherIds);

  return (profiles ?? []).map((p) => ({
    id: p.id as string,
    username: p.username as string,
    name: p.name as string,
    avatarUrl: (p.avatar_url as string | null) ?? null,
  }));
}

// How many profiles the global search bar's "Users" tab shows at once —
// a quick-glance list, not a full paginated directory.
const USER_SEARCH_LIMIT = 8;

// Searches profiles by name for the global search bar's "Users" tab.
// Relies on the "profiles are readable by authenticated users" policy
// (see supabase/schema.sql) — id/name/avatar_url are only guaranteed
// visible for every profile, not just ones with a public story, when
// called with a signed-in Supabase client. Callers should only surface
// this to logged-in users.
export async function searchUsers(
  query: string,
  excludeUserId: string
): Promise<FriendProfile[]> {
  const q = query.trim();
  if (!q) return [];

  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, name, avatar_url")
    .ilike("name", `%${q}%`)
    .neq("id", excludeUserId)
    .limit(USER_SEARCH_LIMIT);

  if (error) {
    console.error("Failed to search users:", error.message);
    return [];
  }

  return (data ?? []).map((p) => ({
    id: p.id as string,
    username: p.username as string,
    name: p.name as string,
    avatarUrl: (p.avatar_url as string | null) ?? null,
  }));
}

export async function listIncomingRequests(userId: string): Promise<IncomingRequest[]> {
  const supabase = createClient();
  const { data: requests } = await supabase
    .from("friend_requests")
    .select("id, sender_id, created_at")
    .eq("receiver_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (!requests || requests.length === 0) return [];

  const senderIds = requests.map((r) => r.sender_id);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username, name, avatar_url")
    .in("id", senderIds);

  const byId = new Map((profiles ?? []).map((p) => [p.id as string, p]));

  return requests.map((r) => {
    const sender = byId.get(r.sender_id);
    return {
      requestId: r.id as string,
      createdAt: r.created_at as string,
      from: {
        id: r.sender_id as string,
        username: (sender?.username as string | undefined) ?? r.sender_id,
        name: (sender?.name as string | undefined) ?? "A writer",
        avatarUrl: (sender?.avatar_url as string | null | undefined) ?? null,
      },
    };
  });
}