"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { FollowProfile } from "@/lib/follows";

export type FollowListTab = "followers" | "following";

// Popup listing a profile's followers/following, tab-switchable, opened
// by tapping the follower/following counts on the profile page. Same
// overlay pattern as SettingsModal (backdrop click / ✕ to close), scaled
// down to a single small panel instead of a full-page layout.
export default function FollowListModal({
  tab,
  onTabChange,
  followers,
  following,
  onClose,
}: {
  tab: FollowListTab;
  onTabChange: (tab: FollowListTab) => void;
  followers: FollowProfile[];
  following: FollowProfile[];
  onClose: () => void;
}) {
  const list = tab === "followers" ? followers : following;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-3 sm:p-6"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 10 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-sm max-h-[80vh] flex flex-col bg-ink border border-parchment/10 rounded-2xl shadow-2xl overflow-hidden text-parchment"
        >
          <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-parchment/10 flex-shrink-0">
            <div className="flex gap-1 bg-panel border border-parchment/10 rounded-full p-1">
              {(["followers", "following"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => onTabChange(t)}
                  className={`text-xs font-mono px-3 py-1.5 rounded-full capitalize transition-colors ${
                    tab === t
                      ? "bg-lamp/15 text-lamp border border-lamp/30"
                      : "text-muted hover:text-parchment border border-transparent"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="w-8 h-8 flex items-center justify-center rounded-full text-faint hover:text-parchment hover:bg-parchment/5 transition-colors flex-shrink-0"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-3">
            {list.length === 0 ? (
              <p className="text-sm text-muted text-center py-8">
                {tab === "followers" ? "No followers yet." : "Not following anyone yet."}
              </p>
            ) : (
              <ul className="space-y-1">
                {list.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/profile/${p.username}`}
                      onClick={onClose}
                      className="flex items-center gap-3 px-2.5 py-2 rounded-lg hover:bg-panel transition-colors"
                    >
                      <span className="w-9 h-9 rounded-full bg-lamp/15 border border-lamp/30 text-lamp text-xs font-mono flex items-center justify-center overflow-hidden flex-shrink-0">
                        {p.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.avatarUrl} alt={p.username} className="w-full h-full object-cover" />
                        ) : (
                          p.username.charAt(0).toUpperCase()
                        )}
                      </span>
                      <span className="text-sm text-parchment truncate">{p.username}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}