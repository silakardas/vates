"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { FollowStatus, getFollowStatus, followAuthor, unfollowAuthor } from "@/lib/follows";

// Follow/unfollow button for an author, shown on /discover/[id] and
// /profile/[username]. Same visual language as FriendButton: renders
// nothing for your own content, or while logged out (following requires
// an account, but reading doesn't).
export default function FollowButton({
  authorId,
  onChange,
}: {
  authorId: string;
  onChange?: () => void;
}) {
  const { user } = useAuth();
  const [status, setStatus] = useState<FollowStatus | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user || user.id === authorId) return;
    let cancelled = false;
    getFollowStatus(user.id, authorId).then((s) => {
      if (!cancelled) setStatus(s);
    });
    return () => {
      cancelled = true;
    };
  }, [user, authorId]);

  if (!user || user.id === authorId || !status) return null;

  async function run(action: () => Promise<{ error?: string }>, optimistic: FollowStatus) {
    const previous = status;
    setStatus(optimistic);
    setBusy(true);
    const { error } = await action();
    if (error) {
      console.error("Failed to update follow status:", error);
      setStatus(previous);
    }
    setBusy(false);
    onChange?.();
  }

  if (status === "following") {
    return (
      <button
        disabled={busy}
        title="Unfollow"
        onClick={() =>
          run(() => unfollowAuthor(user.id, authorId), "not-following")
        }
        className="group text-sm px-4 py-1.5 rounded-full border border-lamp/30 text-lamp hover:bg-crimson/10 hover:border-crimson/30 hover:text-crimson transition-colors disabled:opacity-60"
      >
        {busy ? "…" : <>✓ Following<span className="hidden group-hover:inline"> · Unfollow</span></>}
      </button>
    );
  }

  return (
    <button
      disabled={busy}
      onClick={() => run(() => followAuthor(user.id, authorId), "following")}
      className="text-sm font-semibold px-4 py-1.5 rounded-full bg-lamp/15 border border-lamp/30 text-lamp hover:bg-lamp/25 transition-colors disabled:opacity-60"
    >
      {busy ? "…" : "Follow"}
    </button>
  );
}
