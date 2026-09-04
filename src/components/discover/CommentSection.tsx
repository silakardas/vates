"use client";

import Link from "next/link";
import ReportButton from "@/components/ReportButton";
import { relativeTime } from "@/lib/timeAgo";
import type { CommentRow } from "@/lib/useStoryReader";

export default function CommentsSection({
  storyId,
  isOwner,
  isSignedIn,
  comments,
  commentAuthors,
  commentsLoading,
  newComment,
  onNewCommentChange,
  postingComment,
  onPostComment,
  onDeleteComment,
}: {
  storyId: string;
  isOwner: boolean;
  isSignedIn: boolean;
  comments: CommentRow[];
  commentAuthors: Record<string, string>;
  commentsLoading: boolean;
  newComment: string;
  onNewCommentChange: (value: string) => void;
  postingComment: boolean;
  onPostComment: () => void;
  onDeleteComment: (commentId: string) => void;
}) {
  return (
    <section className="mt-10">
      <h2 className="font-serif text-xl mb-4">
        Comments{comments.length > 0 ? ` (${comments.length})` : ""}
      </h2>

      {commentsLoading && <p className="text-muted text-sm mb-6">Loading comments…</p>}

      {!commentsLoading && comments.length === 0 && (
        <p className="text-muted text-sm mb-6">No comments yet. Be the first to say something.</p>
      )}

      {!commentsLoading && comments.length > 0 && (
        <ul className="space-y-3 mb-6">
          {comments.map((c) => (
            <li key={c.id} className="bg-ink-soft border border-parchment/10 rounded-lg p-4">
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
                    onClick={() => onDeleteComment(c.id)}
                    aria-label="Delete comment"
                    className="text-faint hover:text-crimson transition-colors text-xs flex-shrink-0"
                  >
                    ✕
                  </button>
                )}
              </div>
              <p className="text-sm text-muted leading-relaxed whitespace-pre-wrap mb-2">{c.body}</p>
              <ReportButton storyId={storyId} commentId={c.id} />
            </li>
          ))}
        </ul>
      )}

      {isSignedIn ? (
        <div>
          <textarea
            value={newComment}
            onChange={(e) => onNewCommentChange(e.target.value)}
            placeholder="Add a comment…"
            rows={3}
            className="w-full bg-ink-soft rounded-lg p-3 text-sm outline-none border border-parchment/10 focus:border-lamp/40 transition-colors placeholder:text-faint resize-none"
          />
          <button
            onClick={onPostComment}
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
  );
}
