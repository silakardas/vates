"use client";

import { totalWordCount } from "@/lib/types";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { useAuth } from "@/lib/AuthContext";
import { useStories } from "@/lib/StoryContext";

function formatJoinDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export default function AccountPage() {
  const { user, logout } = useAuth();
  const { stories } = useStories();
  const router = useRouter();

  if (!user) {
    return (
      <>
        <Header />
        <main className="px-8 py-24 text-center">
          <p className="text-muted mb-4">You&apos;re not logged in.</p>
          <Link href="/login" className="text-lamp hover:underline text-sm">
            Go to login →
          </Link>
        </main>
      </>
    );
  }

  const totalWords = stories.reduce((sum, s) => sum + totalWordCount(s), 0);
  const inProgress = stories.filter((s) => s.status === "inProgress").length;

  function handleLogout() {
    logout();
    router.push("/");
  }

  return (
    <>
      <Header />
      <main className="px-8 py-16 max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="flex items-center gap-5 mb-12"
        >
          <div className="w-16 h-16 rounded-full bg-lamp/15 border border-lamp/30 text-lamp font-serif text-2xl flex items-center justify-center">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="font-serif text-2xl text-parchment">{user.name}</h1>
            <p className="text-muted text-sm">{user.email}</p>
            <p className="text-faint text-xs font-mono mt-1">
              Writing here since {formatJoinDate(user.joinedAt)}
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
          className="grid grid-cols-3 gap-4 mb-12"
        >
          <div className="bg-panel border border-parchment/10 rounded-xl px-5 py-4 text-center">
            <p className="font-mono text-2xl text-lamp">{stories.length}</p>
            <p className="text-xs text-muted mt-1">stories</p>
          </div>
          <div className="bg-panel border border-parchment/10 rounded-xl px-5 py-4 text-center">
            <p className="font-mono text-2xl text-lamp">
              {totalWords.toLocaleString("en-US")}
            </p>
            <p className="text-xs text-muted mt-1">words written</p>
          </div>
          <div className="bg-panel border border-parchment/10 rounded-xl px-5 py-4 text-center">
            <p className="font-mono text-2xl text-lamp">{inProgress}</p>
            <p className="text-xs text-muted mt-1">in progress</p>
          </div>
        </motion.div>

        <div className="flex items-center gap-6">
          <Link href="/settings" className="text-sm text-muted hover:text-parchment transition-colors">
            Preferences
          </Link>
          <button
            onClick={handleLogout}
            className="text-sm text-crimson hover:underline"
          >
            Log out
          </button>
        </div>
      </main>
    </>
  );
}
