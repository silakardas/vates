"use client";

import Link from "next/link";
import { StoryTags } from "@/lib/types";

// Presentational card for a single publicly-shared story. Pulled out of
// /discover so /profile/[userId] and the homepage's "Community spotlight"
// section can render the exact same card without copy-pasting the markup.
export type PublicStoryCardData = {
  id: string;
  title: string;
  description?: string | null;
  tags?: StoryTags | null;
  viewCount?: number | null;
  likeCount?: number | null;
};

export default function PublicStoryCard({
  story,
  authorName,
  authorId,
}: {
  story: PublicStoryCardData;
  // Both optional: /profile/[userId] already shows the author once at
  // the top of the page, so it skips this line entirely.
  authorName?: string;
  authorId?: string;
}) {
  const description = story.description?.trim() || null;
  const fandoms = story.tags?.fandoms ?? [];
  // Fandom gets its own featured line (AO3-style), so everything else is
  // shown together as plain chips underneath.
  const otherTags = [
    ...(story.tags?.relationships ?? []),
    ...(story.tags?.characters ?? []),
    ...(story.tags?.additionalTags ?? []),
  ];

  return (
    // The whole card is clickable (goes to the story), but the author
    // name is its own link to /profile/[authorId] — and anchors can't
    // nest — so this uses the "stretched link" pattern: an absolutely
    // positioned anchor covers the card, everything else is
    // pointer-events-none *except* the author line, which sits above
    // it (relative z-10) and handles its own clicks.
    <div className="group relative flex flex-col h-full bg-ink-soft border border-parchment/10 rounded-xl p-5 hover:border-lamp/30 transition-colors">
      <Link
        href={`/discover/${story.id}`}
        className="absolute inset-0 rounded-xl"
        aria-label={story.title}
      />
      <div className="flex items-start justify-between gap-2 mb-1.5 pointer-events-none">
        <h3 className="font-serif text-lg group-hover:text-lamp transition-colors">
          {story.title}
        </h3>
        <span className="text-xs font-mono text-faint flex items-center gap-2 flex-shrink-0 pt-1 whitespace-nowrap">
          <span>👁 {(story.viewCount ?? 0).toLocaleString("en-US")}</span>
          <span>♥ {(story.likeCount ?? 0).toLocaleString("en-US")}</span>
        </span>
      </div>
      {authorName && (
        <p className="relative z-10 text-xs font-mono text-faint mb-2 w-fit">
          by{" "}
          {authorId ? (
            <Link href={`/profile/${authorId}`} className="hover:text-lamp transition-colors">
              {authorName}
            </Link>
          ) : (
            authorName
          )}
        </p>
      )}
      {fandoms.length > 0 && (
        <p className="text-[11px] font-mono uppercase tracking-wide text-lamp mb-2 pointer-events-none truncate">
          {fandoms.join(" · ")}
        </p>
      )}
      {description && (
        <p className="text-sm text-muted leading-relaxed line-clamp-3 mb-3 pointer-events-none">
          {description}
        </p>
      )}
      {otherTags.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-auto pt-2 pointer-events-none">
          {otherTags.map((tag) => (
            <span key={tag} className="text-xs font-mono text-muted">
              #{tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}