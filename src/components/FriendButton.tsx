"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import {
  FriendStatus,
  getFriendStatus,
  sendFriendRequest,
  respondToFriendRequest,
  removeFriendOrRequest,
} from "@/lib/friends";

// Add/accept/remove friend button for someone else's public profile.
// Renders nothing for your own profile, or while logged out (viewing a
// profile is fine without an account, but acting on it isn't).
export default function FriendButton({
  profileUserId,
  onChange,
}: {
  profileUserId: string;
  onChange?: () => void;
}) {
  const { user } = useAuth();
  const [status, setStatus] = useState<FriendStatus | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user || user.id === profileUserId) return;
    let cancelled = false;
    getFriendStatus(user.id, profileUserId).then((s) => {
      if (!cancelled) setStatus(s);
    });
    return () => {
      cancelled = true;
    };
  }, [user, profileUserId]);

  if (!user || user.id === profileUserId || !status) return null;

  async function run(action: () => Promise<{ error?: string }>) {
    setBusy(true);
    await action();
    if (user) setStatus(await getFriendStatus(user.id, profileUserId));
    setBusy(false);
    onChange?.();
  }

  if (status.kind === "none") {
    return (
      <button
        disabled={busy}
        onClick={() => run(() => sendFriendRequest(user.id, profileUserId))}
        className="text-sm font-semibold px-4 py-1.5 rounded-full bg-lamp/15 border border-lamp/30 text-lamp hover:bg-lamp/25 transition-colors disabled:opacity-60"
      >
        {busy ? "…" : "Add friend"}
      </button>
    );
  }

  if (status.kind === "outgoing") {
    return (
      <button
        disabled={busy}
        onClick={() => run(() => removeFriendOrRequest(status.requestId))}
        className="text-sm px-4 py-1.5 rounded-full border border-parchment/15 text-muted hover:text-crimson hover:border-crimson/30 transition-colors disabled:opacity-60"
      >
        {busy ? "…" : "Request sent · Cancel"}
      </button>
    );
  }

  if (status.kind === "incoming") {
    return (
      <div className="flex items-center gap-2">
        <button
          disabled={busy}
          onClick={() => run(() => respondToFriendRequest(status.requestId, "accepted"))}
          className="text-sm font-semibold px-4 py-1.5 rounded-full bg-lamp text-ink hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          Accept
        </button>
        <button
          disabled={busy}
          onClick={() => run(() => respondToFriendRequest(status.requestId, "declined"))}
          className="text-sm px-4 py-1.5 rounded-full border border-parchment/15 text-muted hover:text-parchment transition-colors disabled:opacity-60"
        >
          Decline
        </button>
      </div>
    );
  }

  // status.kind === "friends"
  return (
    <button
      disabled={busy}
      title="Remove friend"
      onClick={() => run(() => removeFriendOrRequest(status.requestId))}
      className="group text-sm px-4 py-1.5 rounded-full border border-lamp/30 text-lamp hover:bg-crimson/10 hover:border-crimson/30 hover:text-crimson transition-colors disabled:opacity-60"
    >
      {busy ? "…" : <>✓ Friends<span className="hidden group-hover:inline"> · Remove</span></>}
    </button>
  );
}