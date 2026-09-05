import { createClient } from "@/lib/supabase/client";

// One-way "follow" relationship: unlike friend_requests, there's no
// pending/accepted state — a row in author_follows simply means
// follower_id is following followed_id. No approval needed from the
// followed side.
export type FollowStatus = "following" | "not-following";

export type FollowProfile = {
  id: string;
  username: string;
  avatarUrl: string | null;
};

export type FollowedAuthorStory = {
  id: string;
  title: string;
  publishedAt: string | null;
  viewCount: number | null;
  likeCount: number | null;
  coverImageUrl: string | null;
  author: {
    id: string;
    username: string;
  };
};

// Whether currentUserId currently follows otherUserId.
export async function getFollowStatus(
  currentUserId: string,
  otherUserId: string
): Promise<FollowStatus> {
  const supabase = createClient();
  const { data } = await supabase
    .from("author_follows")
    .select("follower_id")
    .eq("follower_id", currentUserId)
    .eq("followed_id", otherUserId)
    .maybeSingle();

  return data ? "following" : "not-following";
}

export async function followAuthor(currentUserId: string, otherUserId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("author_follows")
    .insert({ follower_id: currentUserId, followed_id: otherUserId });
  return { error: error?.message };
}

export async function unfollowAuthor(currentUserId: string, otherUserId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("author_follows")
    .delete()
    .eq("follower_id", currentUserId)
    .eq("followed_id", otherUserId);
  return { error: error?.message };
}

// How many people follow this author. A plain count query rather than a
// denormalized counter column (unlike stories.like_count) — it's only
// read once per profile page view, not on every card in a list, so the
// extra trigger/column isn't worth the complexity here.
export async function getFollowerCount(userId: string): Promise<number> {
  const supabase = createClient();
  const { count, error } = await supabase
    .from("author_follows")
    .select("follower_id", { count: "exact", head: true })
    .eq("followed_id", userId);

  if (error) {
    console.error("Failed to count followers:", error.message);
    return 0;
  }
  return count ?? 0;
}

// How many other writers this user follows — used on their own profile,
// mirrors getFollowerCount but filtered the other direction.
export async function getFollowingCount(userId: string): Promise<number> {
  const supabase = createClient();
  const { count, error } = await supabase
    .from("author_follows")
    .select("followed_id", { count: "exact", head: true })
    .eq("follower_id", userId);

  if (error) {
    console.error("Failed to count following:", error.message);
    return 0;
  }
  return count ?? 0;
}

// Profile list (not just a count) of everyone following userId — used on
// the profile page's "Followers" section, mirrors friends.ts's old
// listFriends but one-directional.
export async function listFollowers(userId: string): Promise<FollowProfile[]> {
  const supabase = createClient();
  const { data: links } = await supabase
    .from("author_follows")
    .select("follower_id")
    .eq("followed_id", userId);

  if (!links || links.length === 0) return [];

  const followerIds = links.map((l) => l.follower_id as string);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username, avatar_url")
    .in("id", followerIds);

  return (profiles ?? []).map((p) => ({
    id: p.id as string,
    username: p.username as string,
    avatarUrl: (p.avatar_url as string | null) ?? null,
  }));
}

// Profile list of everyone userId follows — used on the profile page's
// "Following" section.
export async function listFollowing(userId: string): Promise<FollowProfile[]> {
  const supabase = createClient();
  const { data: links } = await supabase
    .from("author_follows")
    .select("followed_id")
    .eq("follower_id", userId);

  if (!links || links.length === 0) return [];

  const followedIds = links.map((l) => l.followed_id as string);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username, avatar_url")
    .in("id", followedIds);

  return (profiles ?? []).map((p) => ({
    id: p.id as string,
    username: p.username as string,
    avatarUrl: (p.avatar_url as string | null) ?? null,
  }));
}

// How many of the people currentUserId follows have recently published
// stories — the lightweight "notifications" stand-in described in the
// prompt: the most recent public stories from followed authors, newest
// published first. Limit keeps this a small "what's new" glance, not a
// full paginated feed.
const FOLLOWED_STORIES_LIMIT = 6;

export async function getFollowedAuthorsRecentStories(
  currentUserId: string
): Promise<FollowedAuthorStory[]> {
  const supabase = createClient();

  const { data: follows } = await supabase
    .from("author_follows")
    .select("followed_id")
    .eq("follower_id", currentUserId);

  if (!follows || follows.length === 0) return [];

  const followedIds = follows.map((f) => f.followed_id as string);

  const { data: storyRows, error } = await supabase
    .from("stories")
    .select("id, title, owner_id, published_at, view_count, like_count, cover_image_url")
    .in("owner_id", followedIds)
    .eq("is_public", true)
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(FOLLOWED_STORIES_LIMIT);

  if (error || !storyRows) {
    console.error("Failed to load followed authors' stories:", error?.message);
    return [];
  }

  const { data: profileRows } = await supabase
    .from("profiles")
    .select("id, username")
    .in("id", followedIds);

  const authorById = new Map(
    (profileRows ?? []).map((p) => [p.id as string, p.username as string])
  );

  return storyRows.map((s) => ({
    id: s.id as string,
    title: s.title as string,
    publishedAt: s.published_at as string | null,
    viewCount: s.view_count as number | null,
    likeCount: s.like_count as number | null,
    coverImageUrl: s.cover_image_url as string | null,
    author: {
      id: s.owner_id as string,
      username: authorById.get(s.owner_id as string) ?? "Unknown",
    },
  }));
}