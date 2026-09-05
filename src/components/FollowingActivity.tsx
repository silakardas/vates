"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { getFollowedAuthorsRecentStories, FollowedAuthorStory } from "@/lib/follows";
import PublicStoryCard from "@/components/PublicStoryCard";

// Stand-in for a full notification system (bell icon, real-time push,
// etc. — out of scope for now, per the prompt): just the most recent
// public stories from writers this reader follows, newest published
// first. Lives in the Workshop (the signed-in "your stuff" dashboard)
// rather than the homepage, for the same reason ContinueCard/
// ContinueReadingCard do — the homepage's own "Written here recently"
// section is a public, logged-out-friendly spotlight of the whole site,
// not a personalized feed, so a "who you follow" list belongs next to
// the other personal modules instead. Renders nothing if the reader
// doesn't follow anyone yet, or nobody they follow has published
// recently — this is a bonus glance, not something that needs its own
// empty state.
export default function FollowingActivity() {
  const { user } = useAuth();
  const [stories, setStories] = useState<FollowedAuthorStory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setStories([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    getFollowedAuthorsRecentStories(user.id).then((result) => {
      if (!cancelled) {
        setStories(result);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (loading || stories.length === 0) return null;

  return (
    <section className="mt-14">
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <h2 className="font-serif text-xl">New from writers you follow</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {stories.map((story) => (
          <PublicStoryCard
            key={story.id}
            story={{
              id: story.id,
              title: story.title,
              viewCount: story.viewCount,
              likeCount: story.likeCount,
              coverImageUrl: story.coverImageUrl,
            }}
            authorUsername={story.author.username}
          />
        ))}
      </div>
    </section>
  );
}