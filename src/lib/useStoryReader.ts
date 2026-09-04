"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/AuthContext";
import type { Chapter } from "@/lib/types";
import { TAG_CATEGORIES, TagColumns, tagColumnsToStoryTags } from "@/lib/tags";

// Row shape for the public reading routes — a public/owner-visible story,
// fetched straight from Supabase. Intentionally not the full `Story` type
// from StoryContext: that context only ever holds the signed-in user's
// own stories (owner_id = auth.uid()), and these are public reading
// pages for any is_public story, so they can't go through
// useStories()/getStory().
export type DiscoverStoryRow = TagColumns & {
  id: string;
  owner_id: string;
  title: string;
  type: "oneshot" | "series";
  chapters: Chapter[] | null;
  view_count: number | null;
  like_count: number | null;
  is_public: boolean;
};

export type StoryAuthor = {
  id: string;
  username: string;
};

export type CommentRow = {
  id: string;
  story_id: string;
  user_id: string;
  body: string;
  created_at: string;
};

type UseStoryReaderOptions = {
  // Whether this load should count as a public view (the
  // increment_story_view RPC). Takes the freshly-fetched row so callers
  // can decide from fields only known post-fetch (e.g. story.type) — the
  // /discover/[id] redirector, for one, must NOT count a view itself,
  // since the chapter route it redirects to will count its own; counting
  // both would double the view for a single visit.
  shouldCountView?: (story: DiscoverStoryRow) => boolean;
  // Whether to load the comment thread at all. Same reasoning as above:
  // the redirect-only case never renders comments, so there's no reason
  // to fetch them.
  shouldLoadComments?: (story: DiscoverStoryRow) => boolean;
};

const alwaysTrue = () => true;

// Shared data/actions behind both public reading routes — /discover/[id]
// (whole-story view) and /discover/[id]/chapter/[chapterId] (per-chapter
// view). Everything that isn't specific to *how* the content is laid out
// on the page — story/author/tag data, the like button, and the comment
// thread — lives here so neither route re-implements it.
export function useStoryReader(id: string | undefined, options: UseStoryReaderOptions = {}) {
  const { shouldCountView = alwaysTrue, shouldLoadComments = alwaysTrue } = options;
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [story, setStory] = useState<DiscoverStoryRow | null>(null);
  const [author, setAuthor] = useState<StoryAuthor | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);

  const [comments, setComments] = useState<CommentRow[]>([]);
  const [commentAuthors, setCommentAuthors] = useState<Record<string, string>>({});
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [postingComment, setPostingComment] = useState(false);

  const isOwner = story?.owner_id === user?.id;
  const chapters = story?.chapters ?? [];
  const tags = story ? tagColumnsToStoryTags(story) : null;
  const hasAnyTags = tags ? TAG_CATEGORIES.some(({ key }) => tags[key].length > 0) : false;

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
        .select(
          "id, owner_id, title, type, fandoms, relationships, tag_characters, additional_tags, tags, chapters, view_count, like_count, is_public"
        )
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

      const typedStory = storyRow as DiscoverStoryRow;

      const { data: profileRow } = await supabase
        .from("profiles")
        .select("id, username")
        .eq("id", typedStory.owner_id)
        .maybeSingle();

      if (cancelled) return;

      setStory(typedStory);
      setAuthor((profileRow as StoryAuthor) ?? null);
      setLikeCount(typedStory.like_count ?? 0);
      setLoading(false);

      // Has this visitor already liked it? Only meaningful when signed
      // in — an anon visitor can't have a story_likes row.
      if (user) {
        const { data: likeRow } = await supabase
          .from("story_likes")
          .select("story_id")
          .eq("story_id", typedStory.id)
          .eq("user_id", user.id)
          .maybeSingle();
        if (!cancelled) {
          setLiked(!!likeRow);
        }
      } else {
        setLiked(false);
      }

      // Don't count the owner previewing their own story as a view, and
      // let the caller veto counting a view at all (see shouldCountView).
      const isOwnerNow = typedStory.owner_id === user?.id;
      if (!isOwnerNow && shouldCountView(typedStory)) {
        const { error: rpcError } = await supabase.rpc("increment_story_view", {
          p_story_id: typedStory.id,
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

  const handleLike = useCallback(async () => {
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
  }, [story, user, liked, router]);

  // Loads (or reloads, after a post/delete) the comment list for the
  // current story. A separate function rather than inlining it in an
  // effect, since posting/deleting need to trigger the same reload.
  const loadCommentsFor = useCallback(async (storyId: string) => {
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
        .select("id, username")
        .in("id", userIds);
      if (profilesError) {
        console.error("Failed to load comment authors:", profilesError.message);
      } else {
        authorMap = Object.fromEntries(
          (profileRows ?? []).map((p) => [p.id as string, p.username as string])
        );
      }
    }

    setComments(commentRows as CommentRow[]);
    setCommentAuthors(authorMap);
    setCommentsLoading(false);
  }, []);

  useEffect(() => {
    if (story?.id && shouldLoadComments(story)) {
      loadCommentsFor(story.id);
    } else if (story?.id) {
      setCommentsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story?.id]);

  const handlePostComment = useCallback(async () => {
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
    loadCommentsFor(story.id);
  }, [story, user, newComment, loadCommentsFor]);

  const handleDeleteComment = useCallback(async (commentId: string) => {
    const supabase = createClient();
    const { error } = await supabase.from("story_comments").delete().eq("id", commentId);
    if (error) {
      console.error("Failed to delete comment:", error.message);
      return;
    }
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  }, []);

  return {
    router,
    user,
    authLoading,

    story,
    author,
    loading,
    notFound,
    isOwner,
    chapters,
    tags,
    hasAnyTags,

    liked,
    likeCount,
    handleLike,

    comments,
    commentAuthors,
    commentsLoading,
    newComment,
    setNewComment,
    postingComment,
    handlePostComment,
    handleDeleteComment,
  };
}
