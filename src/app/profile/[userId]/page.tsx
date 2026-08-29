"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PublicStoryCard from "@/components/PublicStoryCard";
import { createClient } from "@/lib/supabase/client";
import { TagColumns, tagColumnsToStoryTags } from "@/lib/tags";

// Row shape for a publicly-shared story, scoped to one author — same
// fields /discover reads, minus owner_id (we already know it: it's the
// profile we're on).
type PublicStoryRow = TagColumns & {
  id: string;
  title: string;
  description: string | null;
  view_count: number | null;
  like_count: number | null;
  created_at: string;
  published_at: string | null;
};

type ProfileRow = {
  id: string;
  name: string;
  avatar_url: string | null;
  created_at: string;
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.05 } },
};

const cardFade = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" as const } },
};

function formatJoinDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export default function PublicProfilePage() {
  const { userId } = useParams<{ userId: string }>();

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [stories, setStories] = useState<PublicStoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    const supabase = createClient();

    async function load() {
      setLoading(true);
      setNotFound(false);

      // RLS ("profiles are public-readable") only exposes a profile once
      // its owner has at least one is_public story, so a writer with
      // nothing published yet — or a bad :userId — both come back empty
      // here, and both land on the same "not found" state below.
      const { data: profileRow, error: profileError } = await supabase
        .from("profiles")
        .select("id, name, avatar_url, created_at")
        .eq("id", userId)
        .maybeSingle();

      if (cancelled) return;

      if (profileError || !profileRow) {
        setProfile(null);
        setStories([]);
        setLoading(false);
        setNotFound(true);
        return;
      }

      const { data: storyRows, error: storiesError } = await supabase
        .from("stories")
        .select(
          "id, title, description, fandoms, relationships, tag_characters, additional_tags, tags, view_count, like_count, created_at, published_at"
        )
        .eq("owner_id", userId)
        .eq("is_public", true)
        .order("published_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });

      if (cancelled) return;

      if (storiesError) {
        console.error("Failed to load author's public stories:", storiesError.message);
      }

      setProfile(profileRow as ProfileRow);
      setStories((storyRows as PublicStoryRow[]) ?? []);
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (loading) {
    return (
      <>
        <Header />
        <main className="text-parchment px-5 sm:px-8 py-24 text-center">
          <p className="text-muted text-sm">Loading profile…</p>
        </main>
        <Footer />
      </>
    );
  }

  if (notFound || !profile) {
    return (
      <>
        <Header />
        <main className="text-parchment px-5 sm:px-8 py-24 text-center">
          <p className="text-muted">
            This writer doesn&apos;t have a public profile yet.
          </p>
          <Link
            href="/discover"
            className="mt-4 inline-block text-lamp font-mono text-sm hover:underline"
          >
            ← Back to Discover
          </Link>
        </main>
        <Footer />
      </>
    );
  }

  const totalLikes = stories.reduce((sum, s) => sum + (s.like_count ?? 0), 0);
  const totalViews = stories.reduce((sum, s) => sum + (s.view_count ?? 0), 0);

  return (
    <>
      <Header />
      <main className="text-parchment px-5 py-10 sm:px-8 sm:py-14 max-w-5xl mx-auto">
        <Link
          href="/discover"
          className="text-muted font-mono text-xs hover:text-lamp transition-colors"
        >
          ← Back to Discover
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="flex items-center gap-5 mt-6 mb-3"
        >
          <span className="w-20 h-20 rounded-full bg-lamp/15 border border-lamp/30 text-lamp font-serif text-2xl flex items-center justify-center overflow-hidden flex-shrink-0">
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatar_url}
                alt={profile.name}
                className="w-full h-full object-cover"
              />
            ) : (
              profile.name.charAt(0).toUpperCase()
            )}
          </span>
          <div>
            <h1 className="font-serif text-2xl">{profile.name}</h1>
            <p className="text-faint text-xs font-mono mt-1">
              Writing here since {formatJoinDate(profile.created_at)}
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.08, ease: "easeOut" }}
          className="grid grid-cols-3 gap-3 sm:gap-4 max-w-md mb-10"
        >
          <div className="bg-panel border border-parchment/10 rounded-xl px-4 py-4 text-center">
            <p className="font-mono text-2xl text-lamp">{stories.length}</p>
            <p className="text-xs text-muted mt-1">published</p>
          </div>
          <div className="bg-panel border border-parchment/10 rounded-xl px-4 py-4 text-center">
            <p className="font-mono text-2xl text-lamp">{totalLikes.toLocaleString("en-US")}</p>
            <p className="text-xs text-muted mt-1">likes</p>
          </div>
          <div className="bg-panel border border-parchment/10 rounded-xl px-4 py-4 text-center">
            <p className="font-mono text-2xl text-lamp">{totalViews.toLocaleString("en-US")}</p>
            <p className="text-xs text-muted mt-1">views</p>
          </div>
        </motion.div>

        <p className="font-mono text-[10px] uppercase tracking-wide text-faint mb-4">
          Published stories
        </p>

        {stories.length === 0 && (
          <p className="text-muted text-sm py-10 text-center">
            {profile.name} hasn&apos;t published any stories yet.
          </p>
        )}

        {stories.length > 0 && (
          <motion.div
            initial="hidden"
            animate="show"
            variants={stagger}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            {stories.map((story) => (
              <motion.div key={story.id} variants={cardFade} className="h-full">
                <PublicStoryCard
                  story={{
                    id: story.id,
                    title: story.title,
                    description: story.description,
                    tags: tagColumnsToStoryTags(story),
                    viewCount: story.view_count,
                    likeCount: story.like_count,
                  }}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </main>
      <Footer />
    </>
  );
}