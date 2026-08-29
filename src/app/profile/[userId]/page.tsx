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
  // Generated column (see schema.sql) — always derived server-side from
  // this same story's chapters, so it's exactly as private as the story
  // itself: only ever fetched here because the query below already
  // filters is_public = true. A draft's word count never reaches this
  // page, published or not.
  word_count: number | null;
};

type ProfileRow = {
  id: string;
  name: string;
  avatar_url: string | null;
  created_at: string;
};

// From the profile_writer_identity view (see schema.sql), which only
// ever returns a row when that writer has show_writer_identity = true —
// so getting a row back at all IS the opt-in check, enforced at the
// database level, not just by this page choosing not to render it.
type WriterIdentityRow = {
  id: string;
  bio: string | null;
  favorite_genre: string | null;
  recurring_universe: string | null;
  favorite_line: string | null;
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
  const [writerIdentity, setWriterIdentity] = useState<WriterIdentityRow | null>(null);
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

      // owner_id = userId here always means "the profile we're on", not
      // "the logged-in visitor" — this filter (plus is_public = true) is
      // unconditional, so even the writer looking at their own public
      // profile page only ever sees their published stories here.
      // Drafts belong on /account and /workshop, never on this page.
      const { data: storyRows, error: storiesError } = await supabase
        .from("stories")
        .select(
          "id, title, description, fandoms, relationships, tag_characters, additional_tags, tags, view_count, like_count, created_at, published_at, word_count"
        )
        .eq("owner_id", userId)
        .eq("is_public", true)
        .order("published_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });

      if (cancelled) return;

      if (storiesError) {
        console.error("Failed to load author's public stories:", storiesError.message);
      }

      // Separate fetch, not a join: profile_writer_identity is a view
      // that only returns a row when the writer opted in (see
      // schema.sql), so a missing row here just means "keep this
      // section hidden" — not an error.
      const { data: identityRow, error: identityError } = await supabase
        .from("profile_writer_identity")
        .select("id, bio, favorite_genre, recurring_universe, favorite_line")
        .eq("id", userId)
        .maybeSingle();

      if (cancelled) return;

      if (identityError) {
        console.error("Failed to load writer identity:", identityError.message);
      }

      setProfile(profileRow as ProfileRow);
      setStories((storyRows as PublicStoryRow[]) ?? []);
      setWriterIdentity((identityRow as WriterIdentityRow) ?? null);
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
  // Published-only by construction: `stories` here only ever holds rows
  // from the is_public = true query above, so this sum can never include
  // a draft's word count.
  const totalWords = stories.reduce((sum, s) => sum + (s.word_count ?? 0), 0);

  const hasWriterIdentity =
    !!writerIdentity &&
    (writerIdentity.bio || writerIdentity.favorite_genre || writerIdentity.recurring_universe || writerIdentity.favorite_line);

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
            {hasWriterIdentity && writerIdentity?.bio && (
              <p className="text-muted text-sm italic mt-2 max-w-md">
                &quot;{writerIdentity.bio}&quot;
              </p>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.08, ease: "easeOut" }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 max-w-xl mb-10"
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
          <div className="bg-panel border border-parchment/10 rounded-xl px-4 py-4 text-center">
            <p className="font-mono text-2xl text-lamp">{totalWords.toLocaleString("en-US")}</p>
            <p className="text-xs text-muted mt-1">words written</p>
          </div>
        </motion.div>

        {hasWriterIdentity && (writerIdentity?.favorite_genre || writerIdentity?.recurring_universe) && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.12, ease: "easeOut" }}
            className="mb-10"
          >
            <p className="font-mono text-[10px] uppercase tracking-wide text-faint mb-4">
              Writer identity
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
              {writerIdentity?.favorite_genre && (
                <div className="bg-panel border border-parchment/10 rounded-xl px-5 py-4">
                  <p className="text-[10px] font-mono text-faint uppercase tracking-wide mb-1">
                    Favorite genre
                  </p>
                  <p className="font-serif text-parchment truncate" title={writerIdentity.favorite_genre}>
                    {writerIdentity.favorite_genre}
                  </p>
                </div>
              )}
              {writerIdentity?.recurring_universe && (
                <div className="bg-panel border border-parchment/10 rounded-xl px-5 py-4">
                  <p className="text-[10px] font-mono text-faint uppercase tracking-wide mb-1">
                    Recurring universe
                  </p>
                  <p className="font-serif text-parchment truncate" title={writerIdentity.recurring_universe}>
                    {writerIdentity.recurring_universe}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {hasWriterIdentity && writerIdentity?.favorite_line && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.16, ease: "easeOut" }}
            className="mb-10 max-w-xl"
          >
            <p className="font-mono text-[10px] uppercase tracking-wide text-faint mb-4">
              Meaningful moments
            </p>
            <div className="bg-panel border border-parchment/10 rounded-xl px-6 py-6">
              <p className="text-[10px] font-mono text-faint uppercase tracking-wide mb-2">
                Favorite line
              </p>
              <p className="font-serif text-lg text-parchment italic leading-relaxed">
                &quot;{writerIdentity.favorite_line}&quot;
              </p>
            </div>
          </motion.div>
        )}

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