"use client";

import { useState } from "react";
import Link from "next/link";
import ReportButton from "@/components/ReportButton";
import { relativeTime } from "@/lib/timeAgo";
import type { CommentRow } from "@/lib/useStoryReader";

// Bir yorumun ait olduğu "kök" yorumun id'si — üst seviye bir yorum
// için kendi id'si, bir cevap için parent_comment_id'si. Reply linki
// hangi yoruma tıklanırsa tıklansın (üst yorum ya da bir cevap) her
// zaman bunu hedefler, böylece cevaba-cevap da aynı üst yoruma bağlanır
// ve tek seviyeden derine inilmez (AO3/Reddit'teki gibi).
function threadRootId(comment: CommentRow): string {
  return comment.parent_comment_id ?? comment.id;
}

function CommentAuthorLine({
  comment,
  commentAuthors,
  isOwner,
  onDeleteComment,
}: {
  comment: CommentRow;
  commentAuthors: Record<string, string>;
  isOwner: boolean;
  onDeleteComment: (commentId: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 mb-1.5">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-mono text-parchment">
          {commentAuthors[comment.user_id] ?? "Unknown"}
        </span>
        <span className="text-xs text-faint">
          {relativeTime(new Date(comment.created_at).getTime())}
        </span>
      </div>
      {isOwner && (
        <button
          onClick={() => onDeleteComment(comment.id)}
          aria-label="Delete comment"
          className="text-faint hover:text-crimson transition-colors text-xs flex-shrink-0"
        >
          ✕
        </button>
      )}
    </div>
  );
}

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
  onPostComment: (parentCommentId?: string, bodyOverride?: string) => void | Promise<void>;
  onDeleteComment: (commentId: string) => void;
}) {
  // Reply kutusu her an sadece tek bir yorumun altında açık olabilir.
  // Anahtar, tıklanan yorumun kendi id'si (kutunun görünür olarak
  // hangi yorumun altında açıldığı) — gönderim hedefi ayrı olarak
  // threadRootId ile hesaplanıyor.
  const [openReplyFor, setOpenReplyFor] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);

  const topLevel = comments.filter((c) => !c.parent_comment_id);
  const repliesByRoot = new Map<string, CommentRow[]>();
  for (const c of comments) {
    if (c.parent_comment_id) {
      const list = repliesByRoot.get(c.parent_comment_id) ?? [];
      list.push(c);
      repliesByRoot.set(c.parent_comment_id, list);
    }
  }

  async function submitReply(rootId: string) {
    const body = replyText.trim();
    if (!body) return;
    setSubmittingReply(true);
    await onPostComment(rootId, body);
    setSubmittingReply(false);
    setReplyText("");
    setOpenReplyFor(null);
  }

  function toggleReplyBox(commentId: string) {
    if (openReplyFor === commentId) {
      setOpenReplyFor(null);
      setReplyText("");
    } else {
      setOpenReplyFor(commentId);
      setReplyText("");
    }
  }

  function ReplyBox({ rootId }: { rootId: string }) {
    return (
      <div className="mt-2">
        <textarea
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          placeholder="Write a reply…"
          rows={2}
          autoFocus
          className="w-full bg-ink rounded-lg p-2.5 text-xs outline-none border border-parchment/10 focus:border-lamp/40 transition-colors placeholder:text-faint resize-none"
        />
        <div className="flex items-center gap-2 mt-1.5">
          <button
            onClick={() => submitReply(rootId)}
            disabled={submittingReply || !replyText.trim()}
            className="text-xs font-mono text-lamp border border-lamp/30 rounded-lg px-2.5 py-1 hover:bg-lamp/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submittingReply ? "Posting…" : "Reply"}
          </button>
          <button
            onClick={() => {
              setOpenReplyFor(null);
              setReplyText("");
            }}
            className="text-xs font-mono text-faint hover:text-muted transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

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
          {topLevel.map((c) => {
            const replies = repliesByRoot.get(c.id) ?? [];
            return (
              <li key={c.id} className="bg-ink-soft border border-parchment/10 rounded-lg p-4">
                <CommentAuthorLine
                  comment={c}
                  commentAuthors={commentAuthors}
                  isOwner={isOwner}
                  onDeleteComment={onDeleteComment}
                />
                <p className="text-sm text-muted leading-relaxed whitespace-pre-wrap mb-2">{c.body}</p>
                <div className="flex items-center gap-3">
                  <ReportButton storyId={storyId} commentId={c.id} />
                  {isSignedIn && (
                    <button
                      onClick={() => toggleReplyBox(c.id)}
                      className="text-xs font-mono text-faint hover:text-lamp transition-colors"
                    >
                      Reply
                    </button>
                  )}
                </div>
                {openReplyFor === c.id && <ReplyBox rootId={threadRootId(c)} />}

                {replies.length > 0 && (
                  <ul className="mt-3 space-y-3 pl-4 border-l border-parchment/10">
                    {replies.map((r) => (
                      <li key={r.id}>
                        <CommentAuthorLine
                          comment={r}
                          commentAuthors={commentAuthors}
                          isOwner={isOwner}
                          onDeleteComment={onDeleteComment}
                        />
                        <p className="text-sm text-muted leading-relaxed whitespace-pre-wrap mb-2">
                          {r.body}
                        </p>
                        <div className="flex items-center gap-3">
                          <ReportButton storyId={storyId} commentId={r.id} />
                          {isSignedIn && (
                            <button
                              onClick={() => toggleReplyBox(r.id)}
                              className="text-xs font-mono text-faint hover:text-lamp transition-colors"
                            >
                              Reply
                            </button>
                          )}
                        </div>
                        {openReplyFor === r.id && <ReplyBox rootId={threadRootId(r)} />}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
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
            onClick={() => onPostComment()}
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