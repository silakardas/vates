"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PublicStoryCard from "@/components/PublicStoryCard";
import FollowButton from "@/components/FollowButton";
import FollowListModal, { FollowListTab } from "@/components/FollowListModal";
import { createClient } from "@/lib/supabase/client";
import {
  FollowProfile,
  getFollowerCount,
  getFollowingCount,
  listFollowers,
  listFollowing,
} from "@/lib/follows";
import { useAuth } from "@/lib/AuthContext";
import { useStories } from "@/lib/StoryContext";
import { useSettingsModal } from "@/lib/SettingsModalContext";
import { TagColumns, tagColumnsToStoryTags } from "@/lib/tags";
import { totalWritingDays } from "@/lib/activity";

// This used to be a straight copy-paste of the homepage (it never even
// read the userId param), which is why visiting anyone's "Public
// profile" just showed the homepage instead. This is the real thing:
// identity + writer-identity fields (if the writer opted in), friends,
// and their published stories.

// Old links/bookmarks used /profile/[uuid]. Recognizing the shape here
// lets load() fall back to an id lookup and redirect to the canonical
// /profile/[username] URL, instead of those links just 404ing.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type ProfileRow = {
  id: string;
  username: string;
  avatar_url: string | null;
  created_at: string;
};

type WriterIdentity = {
  bio: string | null;
  favorite_line: string | null;
};

type ProfileStoryRow = TagColumns & {
  id: string;
  title: string;
  description: string | null;
  view_count: number | null;
  like_count: number | null;
  word_count: number | null;
  published_at: string | null;
  created_at: string;
};

function formatJoinDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export default function PublicProfilePage() {
  const { username: routeParam } = useParams<{ username: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { stories: ownStories } = useStories();
  const { openSettings } = useSettingsModal();

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [identity, setIdentity] = useState<WriterIdentity | null>(null);
  const [stories, setStories] = useState<ProfileStoryRow[]>([]);
  const [followers, setFollowers] = useState<FollowProfile[]>([]);
  const [following, setFollowing] = useState<FollowProfile[]>([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [followModalTab, setFollowModalTab] = useState<FollowListTab | null>(null);

  const isOwnProfile = !!profile && user?.id === profile.id;

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    // routeParam is normally a username, but a handful of old links out
    // there still point at the UUID we used to route on — look those up
    // by id instead, and bounce to the canonical username URL.
    const lookupColumn = UUID_RE.test(routeParam) ? "id" : "username";

    const { data: profileRow } = await supabase
      .from("profiles")
      .select("id, username, avatar_url, created_at")
      .eq(lookupColumn, routeParam)
      .maybeSingle();

    if (!profileRow) {
      setProfile(null);
      setNotFound(true);
      setLoading(false);
      return;
    }

    if (lookupColumn === "id") {
      router.replace(`/profile/${(profileRow as ProfileRow).username}`);
      return;
    }

    setNotFound(false);
    setProfile(profileRow as ProfileRow);

    const { data: identityRow } = await supabase
      .from("profile_writer_identity")
      .select("bio, favorite_line")
      .eq("id", profileRow.id)
      .maybeSingle();
    setIdentity((identityRow as WriterIdentity) ?? null);

    const { data: storyRows } = await supabase
      .from("stories")
      .select(
        "id, title, description, fandoms, relationships, tag_characters, additional_tags, tags, view_count, like_count, word_count, published_at, created_at"
      )
      .eq("owner_id", profileRow.id)
      .eq("is_public", true)
      .order("published_at", { ascending: false, nullsFirst: false });
    setStories((storyRows as ProfileStoryRow[]) ?? []);

    const [followerList, followingList, followerTotal, followingTotal] = await Promise.all([
      listFollowers(profileRow.id),
      listFollowing(profileRow.id),
      getFollowerCount(profileRow.id),
      getFollowingCount(profileRow.id),
    ]);
    setFollowers(followerList);
    setFollowing(followingList);
    setFollowerCount(followerTotal);
    setFollowingCount(followingTotal);

    setLoading(false);
  }, [routeParam, router, user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const totalWords = stories.reduce((sum, s) => sum + (s.word_count ?? 0), 0);
  // Total distinct days written on, across every story — not the
  // longest single-story streak (that's WorkshopStats' "Best streak").
  // Private writing-habit stat (draft-inclusive), so it's only ever
  // computed from the signed-in user's own StoryContext, and only shown
  // on their own profile — never derived from another writer's
  // published-only story rows.
  const writingDays = isOwnProfile ? totalWritingDays(ownStories) : 0;

  if (loading) {
    return (
      <>
        <Header />
        <main className="px-5 sm:px-8 py-24 text-center">
          <p className="text-muted text-sm">Loading profile…</p>
        </main>
      </>
    );
  }

  if (notFound || !profile) {
    return (
      <>
        <Header />
        <main className="px-5 sm:px-8 py-24 text-center">
          <p className="text-muted mb-4">This writer couldn&apos;t be found.</p>
          <Link href="/" className="text-lamp hover:underline text-sm">
            ← Back home
          </Link>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="px-5 sm:px-8 py-16 max-w-4xl mx-auto text-parchment">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="flex flex-col sm:flex-row sm:items-center gap-5 mb-3"
        >
          <div className="w-24 h-24 rounded-full bg-lamp/15 border border-lamp/30 text-lamp font-serif text-3xl flex items-center justify-center overflow-hidden flex-shrink-0">
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt={profile.username} className="w-full h-full object-cover" />
            ) : (
              profile.username.charAt(0).toUpperCase()
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3 mb-1">
              <h1 className="font-serif text-2xl text-parchment">@{profile.username}</h1>
              {isOwnProfile ? (
                <button
                  onClick={() => openSettings()}
                  className="text-xs font-mono text-faint hover:text-muted transition-colors border border-parchment/10 rounded-full px-3 py-1"
                >
                  Edit profile
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <FollowButton
                    authorId={profile.id}
                    onChange={() => getFollowerCount(profile.id).then(setFollowerCount)}
                  />
                </div>
              )}
            </div>
            <p className="text-faint text-xs font-mono">
              Writing here since {formatJoinDate(profile.created_at)}
              {" · "}
              <button
                onClick={() => setFollowModalTab("followers")}
                className="hover:text-lamp transition-colors"
              >
                {followerCount.toLocaleString("en-US")}{" "}
                {followerCount === 1 ? "follower" : "followers"}
              </button>
            </p>
            {identity?.bio && (
              <p className="text-muted text-sm italic mt-2 max-w-md">&quot;{identity.bio}&quot;</p>
            )}
          </div>
        </motion.div>

        <div
          className={`grid gap-3 sm:gap-4 my-10 w-full ${
            isOwnProfile ? "max-w-2xl grid-cols-3 sm:grid-cols-5" : "max-w-lg grid-cols-2 sm:grid-cols-4"
          }`}
        >
          <div className="bg-panel border border-parchment/10 rounded-xl px-3 py-4 text-center">
            <p className="font-mono text-2xl text-lamp">{stories.length}</p>
            <p className="text-xs text-muted mt-1">published</p>
          </div>
          <div className="bg-panel border border-parchment/10 rounded-xl px-3 py-4 text-center">
            <p className="font-mono text-2xl text-lamp">{totalWords.toLocaleString("en-US")}</p>
            <p className="text-xs text-muted mt-1">words</p>
          </div>
          <button
            onClick={() => setFollowModalTab("followers")}
            className="bg-panel border border-parchment/10 rounded-xl px-3 py-4 text-center hover:border-lamp/30 transition-colors"
          >
            <p className="font-mono text-2xl text-lamp">{followerCount}</p>
            <p className="text-xs text-muted mt-1">followers</p>
          </button>
          <button
            onClick={() => setFollowModalTab("following")}
            className="bg-panel border border-parchment/10 rounded-xl px-3 py-4 text-center hover:border-lamp/30 transition-colors"
          >
            <p className="font-mono text-2xl text-lamp">{followingCount}</p>
            <p className="text-xs text-muted mt-1">following</p>
          </button>
          {isOwnProfile && (
            <div className="bg-panel border border-parchment/10 rounded-xl px-3 py-4 text-center">
              <p className="font-mono text-2xl text-lamp">{writingDays || "—"}</p>
              <p className="text-xs text-muted mt-1">writing days</p>
            </div>
          )}
        </div>

        {identity?.favorite_line ? (
          <div className="mb-12">
            <p className="font-mono text-[10px] uppercase tracking-wide text-faint mb-4">
              Favorite line
            </p>
            <div className="bg-panel border border-parchment/10 rounded-xl px-6 py-6">
              <p className="font-serif text-lg text-parchment italic leading-relaxed">
                &quot;{identity.favorite_line}&quot;
              </p>
            </div>
          </div>
        ) : (
          isOwnProfile && (
            <div className="mb-12">
              <p className="font-mono text-[10px] uppercase tracking-wide text-faint mb-4">
                Favorite line
              </p>
              <div className="bg-panel border border-parchment/10 rounded-xl px-6 py-6 text-center">
                <p className="text-sm text-muted mb-2">
                  Save a line you wrote that still means something to you.
                </p>
                <button
                  onClick={() => openSettings("Profile")}
                  className="text-lamp text-sm hover:underline"
                >
                  Add it in Settings →
                </button>
              </div>
            </div>
          )
        )}

        <div>
          <p className="font-mono text-[10px] uppercase tracking-wide text-faint mb-4">
            Published stories
          </p>
          {stories.length === 0 ? (
            <p className="text-sm text-muted">
              {isOwnProfile
                ? "You haven't published any stories yet."
                : `${profile.username} hasn't published any stories yet.`}
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {stories.map((story) => (
                <PublicStoryCard
                  key={story.id}
                  story={{
                    id: story.id,
                    title: story.title,
                    description: story.description,
                    tags: tagColumnsToStoryTags(story),
                    viewCount: story.view_count,
                    likeCount: story.like_count,
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </main>
      {followModalTab && (
        <FollowListModal
          tab={followModalTab}
          onTabChange={setFollowModalTab}
          followers={followers}
          following={following}
          onClose={() => setFollowModalTab(null)}
        />
      )}
      <Footer />
    </>
  );
}