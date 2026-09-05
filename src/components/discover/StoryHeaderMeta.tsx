"use client";

import Link from "next/link";
import ReportButton from "@/components/ReportButton";
import FollowButton from "@/components/FollowButton";
import TagChipList from "./TagChipList";
import type { DiscoverStoryRow, StoryAuthor } from "@/lib/useStoryReader";
import type { StoryTags } from "@/lib/types";

export default function StoryHeaderMeta({
  story,
  author,
  isOwner,
  liked,
  likeCount,
  onLike,
  onEdit,
  tags,
  hasAnyTags,
  viewToggle,
}: {
  story: DiscoverStoryRow;
  author: StoryAuthor | null;
  isOwner: boolean;
  liked: boolean;
  likeCount: number;
  onLike: () => void;
  onEdit: () => void;
  tags: StoryTags;
  hasAnyTags: boolean;
  // The link to the *other* reading mode — "Read the whole story on one
  // page" from a chapter page, or "Read chapter by chapter" from the
  // whole-story view. Omitted entirely for oneshots, which only ever
  // have the one view.
  viewToggle: { href: string; label: string } | null;
}) {
  return (
    <>
      <div className="flex items-center justify-between gap-3 mb-6">
        <Link
          href="/"
          className="text-muted font-mono text-xs hover:text-lamp transition-colors whitespace-nowrap"
        >
          ← Back home
        </Link>

        {isOwner && (
          <button
            onClick={onEdit}
            className="text-xs font-mono text-lamp border border-lamp/30 rounded-lg px-3 py-1.5 hover:bg-lamp/5 transition-colors whitespace-nowrap"
          >
            ✎ Edit
          </button>
        )}
      </div>

      {story.cover_image_url && (
        // eslint-disable-next-line @next/next/no-img-element -- user-uploaded, remote Supabase URL
        <img
          src={story.cover_image_url}
          alt=""
          className="w-full max-h-80 object-cover rounded-xl border border-parchment/10 mb-6"
        />
      )}

      <div className="flex items-start justify-between gap-3 mb-3">
        <h1 className="font-serif text-3xl sm:text-4xl">{story.title}</h1>
        <ReportButton storyId={story.id} className="mt-2 flex-shrink-0" />
      </div>

      <div className="flex items-center gap-3 mb-2 flex-wrap">
        <span className="w-7 h-7 rounded-full bg-lamp/20 border border-lamp/40 text-lamp text-xs font-mono flex items-center justify-center overflow-hidden flex-shrink-0">
          {author?.username?.charAt(0).toUpperCase() ?? "?"}
        </span>
        {/* Not linked to a profile page yet — that lands in a later phase. */}
        <span className="text-sm text-muted">{author?.username ?? "Unknown author"}</span>
        {author && !isOwner && <FollowButton authorId={author.id} />}
        <span className="text-faint">·</span>
        <span className="text-xs font-mono text-faint flex items-center gap-1">
          👁 {(story.view_count ?? 0).toLocaleString("en-US")}
        </span>
        <button
          onClick={onLike}
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

      {viewToggle && (
        <div className="mb-4">
          <Link
            href={viewToggle.href}
            className="text-[11px] font-mono uppercase tracking-wide text-faint hover:text-lamp transition-colors"
          >
            {viewToggle.label}
          </Link>
        </div>
      )}

      {hasAnyTags ? <TagChipList tags={tags} /> : <div className="mb-8" />}
    </>
  );
}