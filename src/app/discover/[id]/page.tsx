"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ReportButton from "@/components/ReportButton";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/AuthContext";
import { relativeTime } from "@/lib/timeAgo";
import type { Chapter } from "@/lib/types";

// Row shape for this page's read — a public/owner-visible story, fetched
// straight from Supabase. Intentionally not the full `Story` type from
// StoryContext: that context only ever holds the signed-in user's own
// stories (owner_id = auth.uid()), and this is a public reading page for
// any is_public story, so it can't go through useStories()/getStory().
type DiscoverStoryRow = {
  id: string;
  owner_id: string;
  title: string;
  type: "oneshot" | "series";
  tags: string[] | null;
  chapters: Chapter[] | null;
  view_count: number | null;
  like_count: number | null;
  is_public: boolean;
};

type Author = {
  id: string;
  name: string;
};

type CommentRow = {
  id: string;
  story_id: string;
  user_id: string;
  body: string;
  created_at: string;
};

export default function DiscoverStoryPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [story, setStory] = useState<DiscoverStoryRow | null>(null);
  const [author, setAuthor] = useState<Author | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);

  const [comments, setComments] = useState<CommentRow[]>([]);
  const [commentAuthors, setCommentAuthors] = useState<Record<string, string>>({});
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [postingComment, setPostingComment] = useState(false);

  // Load the story once we know who (if anyone) is viewing — that's what
  // decides whether this load should count as a view.
  useEffect(() => {
    if (!id || authLoading) return;
    let cancelled = false;
    const supabase = createClient();

    async function load() {
      setLoading(true);
      setNotFound(false);

      // RLS ("stories are public-readable" for is_public=true, or
      // "stories are owner-readable" for the owner regardless of
      // is_public) decides whether this row is actually visible to
      // whoever is asking — an anon visitor, another user, or the owner.
      const { data: storyRow, error: storyError } = await supabase
        .from("stories")
        .select("id, owner_id, title, type, tags, chapters, view_count, like_count, is_public")
        .eq("id", id)
        .maybeSingle();

      if (cancelled) return;

      if (storyError || !storyRow) {
        setStory(null);
        setAuthor(null);
        setLoading(false);
        setNotFound(true);
        return;
      }

      const { data: profileRow } = await supabase
        .from("profiles")
        .select("id, name")
        .eq("id", storyRow.owner_id)
        .maybeSingle();

      if (cancelled) return;

      setStory(storyRow as DiscoverStoryRow);
      setAuthor((profileRow as Author) ?? null);
      setLikeCount(storyRow.like_count ?? 0);
      setLoading(false);

      // Has this visitor already liked it? Only meaningful when signed
      // in — an anon visitor can't have a story_likes row.
      if (user) {
        const { data: likeRow } = await supabase
          .from("story_likes")
          .select("story_id")
          .eq("story_id", storyRow.id)
          .eq("user_id", user.id)
          .maybeSingle();
        if (!cancelled) {
          setLiked(!!likeRow);
        }
      } else {
        setLiked(false);
      }

      // Don't count the owner previewing their own story as a view.
      const isOwner = storyRow.owner_id === user?.id;
      if (!isOwner) {
        const { error: rpcError } = await supabase.rpc("increment_story_view", {
          p_story_id: storyRow.id,
        });
        if (rpcError) {
          console.error("Failed to record view:", rpcError.message);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, authLoading, user?.id]);

  async function handleLike() {
    if (!story) return;
    if (!user) {
      router.push("/login");
      return;
    }

    const supabase = createClient();
    const wasLiked = liked;

    // Optimistic UI: flip the heart and the count immediately, then
    // reconcile with the server; roll back on failure.
    setLiked(!wasLiked);
    setLikeCount((c) => c + (wasLiked ? -1 : 1));

    if (wasLiked) {
      const { error } = await supabase
        .from("story_likes")
        .delete()
        .eq("story_id", story.id)
        .eq("user_id", user.id);
      if (error) {
        console.error("Failed to unlike story:", error.message);
        setLiked(true);
        setLikeCount((c) => c + 1);
      }
    } else {
      const { error } = await supabase
        .from("story_likes")
        .insert({ story_id: story.id, user_id: user.id });
      if (error) {
        console.error("Failed to like story:", error.message);
        setLiked(false);
        setLikeCount((c) => c - 1);
      }
    }
  }

  // Loads (or reloads, after a post/delete) the comment list for the
  // current story. A separate function rather than inlining it in an
  // effect, since posting/deleting need to trigger the same reload.
  async function loadComments(storyId: string) {
    const supabase = createClient();
    setCommentsLoading(true);

    const { data: commentRows, error } = await supabase
      .from("story_comments")
      .select("id, story_id, user_id, body, created_at")
      .eq("story_id", storyId)
      .order("created_at", { ascending: true });

    if (error || !commentRows) {
      console.error("Failed to load comments:", error?.message);
      setComments([]);
      setCommentAuthors({});
      setCommentsLoading(false);
      return;
    }

    // story_comments.user_id points at auth.users, not at profiles, so
    // PostgREST can't embed the author's name in the same query (same
    // reason /discover's story list fetches authors separately).
    const userIds = [...new Set(commentRows.map((c) => c.user_id))];
    let authorMap: Record<string, string> = {};
    if (userIds.length > 0) {
      const { data: profileRows, error: profilesError } = await supabase
        .from("profiles")
        .select("id, name")
        .in("id", userIds);
      if (profilesError) {
        console.error("Failed to load comment authors:", profilesError.message);
      } else {
        authorMap = Object.fromEntries(
          (profileRows ?? []).map((p) => [p.id as string, p.name as string])
        );
      }
    }

    setComments(commentRows as CommentRow[]);
    setCommentAuthors(authorMap);
    setCommentsLoading(false);
  }

  useEffect(() => {
    if (story?.id) loadComments(story.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story?.id]);

  async function handlePostComment() {
    if (!story || !user) return;
    const body = newComment.trim();
    if (!body) return;

    setPostingComment(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("story_comments")
      .insert({ story_id: story.id, user_id: user.id, body });
    setPostingComment(false);

    if (error) {
      console.error("Failed to post comment:", error.message);
      return;
    }
    setNewComment("");
    loadComments(story.id);
  }

  async function handleDeleteComment(commentId: string) {
    const supabase = createClient();
    const { error } = await supabase.from("story_comments").delete().eq("id", commentId);
    if (error) {
      console.error("Failed to delete comment:", error.message);
      return;
    }
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  }

  if (loading) {
    return (
      <>
        <Header />
        <main className="text-parchment px-5 sm:px-8 py-24 text-center">
          <p className="text-muted text-sm">Loading story…</p>
        </main>
        <Footer />
      </>
    );
  }

  if (notFound || !story) {
    return (
      <>
        <Header />
        <main className="text-parchment px-5 sm:px-8 py-24 text-center">
          <p className="text-muted">This story doesn&apos;t exist, or isn&apos;t public.</p>
          <button
            onClick={() => router.push("/discover")}
            className="mt-4 text-lamp font-mono text-sm hover:underline"
          >
            ← Back to Discover
          </button>
        </main>
        <Footer />
      </>
    );
  }

  const isOwner = story.owner_id === user?.id;
  const chapters = story.chapters ?? [];
  const tags = story.tags ?? [];

  return (
    <>
      <Header />
      <main className="text-parchment px-5 py-10 sm:px-8 sm:py-14 max-w-3xl mx-auto">
        <div className="flex items-center justify-between gap-3 mb-6">
          <Link
            href="/discover"
            className="text-muted font-mono text-xs hover:text-lamp transition-colors whitespace-nowrap"
          >
            ← Back to Discover
          </Link>

          {isOwner && (
            <button
              onClick={() => router.push(`/story/${story.id}`)}
              className="text-xs font-mono text-lamp border border-lamp/30 rounded-lg px-3 py-1.5 hover:bg-lamp/5 transition-colors whitespace-nowrap"
            >
              ✎ Edit
            </button>
          )}
        </div>

        <div className="flex items-start justify-between gap-3 mb-3">
          <h1 className="font-serif text-3xl sm:text-4xl">{story.title}</h1>
          <ReportButton storyId={story.id} className="mt-2 flex-shrink-0" />
        </div>

        <div className="flex items-center gap-3 mb-2 flex-wrap">
          <span className="w-7 h-7 rounded-full bg-lamp/20 border border-lamp/40 text-lamp text-xs font-mono flex items-center justify-center overflow-hidden flex-shrink-0">
            {author?.name?.charAt(0).toUpperCase() ?? "?"}
          </span>
          {/* Not linked to a profile page yet — that lands in a later phase. */}
          <span className="text-sm text-muted">{author?.name ?? "Unknown author"}</span>
          <span className="text-faint">·</span>
          <span className="text-xs font-mono text-faint flex items-center gap-1">
            👁 {(story.view_count ?? 0).toLocaleString("en-US")}
          </span>
          <button
            onClick={handleLike}
            aria-pressed={liked}
            className={`text-xs font-mono flex items-center gap-1.5 rounded-full border px-2.5 py-1 transition-colors ${
              liked
                ? "text-crimson border-crimson/40 bg-crimson/10"
                : "text-faint border-parchment/10 hover:text-crimson hover:border-crimson/30"
            }`}
          >
            <span>{liked ? "♥" : "♡"}</span>
            {likeCount.toLocaleString("en-US")}
          </button>
        </div>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            {tags.map((tag) => (
              <span key={tag} className="text-xs font-mono text-muted">
                #{tag}
              </span>
            ))}
          </div>
        )}
        {tags.length === 0 && <div className="mb-8" />}

        <div className="bg-parchment text-[#3A3226] rounded-lg px-6 py-8 sm:px-10 sm:py-12">
          {chapters.length === 0 && (
            <p className="text-[#7A6E58] text-sm">This story has no content yet.</p>
          )}
          {chapters.map((chapter, i) => (
            <div key={chapter.id} className={i > 0 ? "mt-12 pt-8 border-t border-black/10" : ""}>
              {story.type === "series" && (
                <h2 className="font-serif text-xl mb-4 text-[#3A3226]">
                  {chapter.title || `Chapter ${i + 1}`}
                </h2>
              )}
              <div
                className="ProseMirror font-serif text-lg leading-loose max-w-[65ch] mx-auto"
                dangerouslySetInnerHTML={{ __html: chapter.content || "<p></p>" }}
              />
            </div>
          ))}
        </div>

        <section className="mt-10">
          <h2 className="font-serif text-xl mb-4">
            Comments{comments.length > 0 ? ` (${comments.length})` : ""}
          </h2>

          {commentsLoading && (
            <p className="text-muted text-sm mb-6">Loading comments…</p>
          )}

          {!commentsLoading && comments.length === 0 && (
            <p className="text-muted text-sm mb-6">
              No comments yet. Be the first to say something.
            </p>
          )}

          {!commentsLoading && comments.length > 0 && (
            <ul className="space-y-3 mb-6">
              {comments.map((c) => (
                <li
                  key={c.id}
                  className="bg-ink-soft border border-parchment/10 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between gap-3 mb-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-mono text-parchment">
                        {commentAuthors[c.user_id] ?? "Unknown"}
                      </span>
                      <span className="text-xs text-faint">
                        {relativeTime(new Date(c.created_at).getTime())}
                      </span>
                    </div>
                    {isOwner && (
                      <button
                        onClick={() => handleDeleteComment(c.id)}
                        aria-label="Delete comment"
                        className="text-faint hover:text-crimson transition-colors text-xs flex-shrink-0"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-muted leading-relaxed whitespace-pre-wrap mb-2">
                    {c.body}
                  </p>
                  <ReportButton storyId={story.id} commentId={c.id} />
                </li>
              ))}
            </ul>
          )}

          {user ? (
            <div>
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment…"
                rows={3}
                className="w-full bg-ink-soft rounded-lg p-3 text-sm outline-none border border-parchment/10 focus:border-lamp/40 transition-colors placeholder:text-faint resize-none"
              />
              <button
                onClick={handlePostComment}
                disabled={postingComment || !newComment.trim()}
                className="mt-2 text-xs font-mono text-lamp border border-lamp/30 rounded-lg px-3 py-1.5 hover:bg-lamp/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {postingComment ? "Posting…" : "Post comment"}
              </button>
            </div>
          ) : (
            <Link href="/login" className="text-lamp font-mono text-sm hover:underline">
              Log in to comment
            </Link>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}