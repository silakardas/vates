"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PublicStoryCard from "@/components/PublicStoryCard";
import FriendButton from "@/components/FriendButton";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/AuthContext";
import { useSettingsModal } from "@/lib/SettingsModalContext";
import {
  FriendProfile,
  IncomingRequest,
  listFriends,
  listIncomingRequests,
  respondToFriendRequest,
} from "@/lib/friends";
import { TagColumns, tagColumnsToStoryTags } from "@/lib/tags";

// This used to be a straight copy-paste of the homepage (it never even
// read the userId param), which is why visiting anyone's "Public
// profile" just showed the homepage instead. This is the real thing:
// identity + writer-identity fields (if the writer opted in), friends,
// and their published stories.

type ProfileRow = {
  id: string;
  name: string;
  avatar_url: string | null;
  created_at: string;
};

type WriterIdentity = {
  bio: string | null;
  favorite_genre: string | null;
  recurring_universe: string | null;
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
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const { openSettings } = useSettingsModal();

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [identity, setIdentity] = useState<WriterIdentity | null>(null);
  const [stories, setStories] = useState<ProfileStoryRow[]>([]);
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [incoming, setIncoming] = useState<IncomingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const isOwnProfile = user?.id === userId;

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    const { data: profileRow } = await supabase
      .from("profiles")
      .select("id, name, avatar_url, created_at")
      .eq("id", userId)
      .maybeSingle();

    if (!profileRow) {
      setProfile(null);
      setNotFound(true);
      setLoading(false);
      return;
    }
    setNotFound(false);
    setProfile(profileRow as ProfileRow);

    const { data: identityRow } = await supabase
      .from("profile_writer_identity")
      .select("bio, favorite_genre, recurring_universe, favorite_line")
      .eq("id", userId)
      .maybeSingle();
    setIdentity((identityRow as WriterIdentity) ?? null);

    const { data: storyRows } = await supabase
      .from("stories")
      .select(
        "id, title, description, fandoms, relationships, tag_characters, additional_tags, tags, view_count, like_count, word_count, published_at, created_at"
      )
      .eq("owner_id", userId)
      .eq("is_public", true)
      .order("published_at", { ascending: false, nullsFirst: false });
    setStories((storyRows as ProfileStoryRow[]) ?? []);

    const [friendList, incomingList] = await Promise.all([
      listFriends(userId),
      user?.id === userId ? listIncomingRequests(userId) : Promise.resolve([]),
    ]);
    setFriends(friendList);
    setIncoming(incomingList);

    setLoading(false);
  }, [userId, user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleRespond(requestId: string, status: "accepted" | "declined") {
    await respondToFriendRequest(requestId, status);
    load();
  }

  const totalWords = stories.reduce((sum, s) => sum + (s.word_count ?? 0), 0);

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
              <img src={profile.avatar_url} alt={profile.name} className="w-full h-full object-cover" />
            ) : (
              profile.name.charAt(0).toUpperCase()
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3 mb-1">
              <h1 className="font-serif text-2xl text-parchment">{profile.name}</h1>
              {isOwnProfile ? (
                <button
                  onClick={() => openSettings()}
                  className="text-xs font-mono text-faint hover:text-muted transition-colors border border-parchment/10 rounded-full px-3 py-1"
                >
                  Edit profile
                </button>
              ) : (
                <FriendButton profileUserId={profile.id} onChange={load} />
              )}
            </div>
            <p className="text-faint text-xs font-mono">
              Writing here since {formatJoinDate(profile.created_at)}
            </p>
            {identity?.bio && (
              <p className="text-muted text-sm italic mt-2 max-w-md">&quot;{identity.bio}&quot;</p>
            )}
          </div>
        </motion.div>

        <div className="grid grid-cols-3 gap-3 sm:gap-4 my-10 max-w-md">
          <div className="bg-panel border border-parchment/10 rounded-xl px-4 py-4 text-center">
            <p className="font-mono text-2xl text-lamp">{stories.length}</p>
            <p className="text-xs text-muted mt-1">published</p>
          </div>
          <div className="bg-panel border border-parchment/10 rounded-xl px-4 py-4 text-center">
            <p className="font-mono text-2xl text-lamp">{totalWords.toLocaleString("en-US")}</p>
            <p className="text-xs text-muted mt-1">words</p>
          </div>
          <div className="bg-panel border border-parchment/10 rounded-xl px-4 py-4 text-center">
            <p className="font-mono text-2xl text-lamp">{friends.length}</p>
            <p className="text-xs text-muted mt-1">friends</p>
          </div>
        </div>

        {(identity?.favorite_genre || identity?.recurring_universe) && (
          <div className="mb-12">
            <p className="font-mono text-[10px] uppercase tracking-wide text-faint mb-4">
              Writer identity
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {identity.favorite_genre && (
                <div className="bg-panel border border-parchment/10 rounded-xl px-5 py-4">
                  <p className="text-[10px] font-mono text-faint uppercase tracking-wide mb-1">
                    Favorite genre
                  </p>
                  <p className="font-serif text-parchment truncate">{identity.favorite_genre}</p>
                </div>
              )}
              {identity.recurring_universe && (
                <div className="bg-panel border border-parchment/10 rounded-xl px-5 py-4">
                  <p className="text-[10px] font-mono text-faint uppercase tracking-wide mb-1">
                    Recurring universe
                  </p>
                  <p className="font-serif text-parchment truncate">{identity.recurring_universe}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {identity?.favorite_line && (
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
        )}

        {isOwnProfile && incoming.length > 0 && (
          <div className="mb-12">
            <p className="font-mono text-[10px] uppercase tracking-wide text-faint mb-4">
              Friend requests
            </p>
            <div className="space-y-2">
              {incoming.map((req) => (
                <div
                  key={req.requestId}
                  className="flex items-center justify-between gap-3 bg-panel border border-parchment/10 rounded-xl px-4 py-3"
                >
                  <Link href={`/profile/${req.from.id}`} className="flex items-center gap-3 min-w-0 group">
                    <span className="w-9 h-9 rounded-full bg-lamp/15 border border-lamp/30 text-lamp text-xs font-mono flex items-center justify-center overflow-hidden flex-shrink-0">
                      {req.from.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={req.from.avatarUrl}
                          alt={req.from.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        req.from.name.charAt(0).toUpperCase()
                      )}
                    </span>
                    <span className="text-sm text-parchment truncate group-hover:text-lamp transition-colors">
                      {req.from.name}
                    </span>
                  </Link>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleRespond(req.requestId, "accepted")}
                      className="text-xs font-semibold px-3 py-1.5 rounded-full bg-lamp text-ink"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleRespond(req.requestId, "declined")}
                      className="text-xs px-3 py-1.5 rounded-full border border-parchment/15 text-muted hover:text-parchment transition-colors"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {friends.length > 0 && (
          <div className="mb-12">
            <p className="font-mono text-[10px] uppercase tracking-wide text-faint mb-4">Friends</p>
            <div className="flex flex-wrap gap-3">
              {friends.map((f) => (
                <Link
                  key={f.id}
                  href={`/profile/${f.id}`}
                  className="flex items-center gap-2 bg-panel border border-parchment/10 rounded-full pl-1.5 pr-3.5 py-1.5 hover:border-lamp/30 transition-colors"
                >
                  <span className="w-7 h-7 rounded-full bg-lamp/15 border border-lamp/30 text-lamp text-[10px] font-mono flex items-center justify-center overflow-hidden flex-shrink-0">
                    {f.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={f.avatarUrl} alt={f.name} className="w-full h-full object-cover" />
                    ) : (
                      f.name.charAt(0).toUpperCase()
                    )}
                  </span>
                  <span className="text-xs text-muted">{f.name}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div>
          <p className="font-mono text-[10px] uppercase tracking-wide text-faint mb-4">
            Published stories
          </p>
          {stories.length === 0 ? (
            <p className="text-sm text-muted">
              {isOwnProfile
                ? "You haven't published any stories yet."
                : `${profile.name} hasn't published any stories yet.`}
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
      <Footer />
    </>
  );
}