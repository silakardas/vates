"use client";

import Link from "next/link";

type ChapterStickyBarProps =
  | {
      variant: "scroll";
      currentIndex: number;
      totalChapters: number;
      currentTitle: string;
      hasPrev: boolean;
      hasNext: boolean;
      onPrev: () => void;
      onNext: () => void;
    }
  | {
      variant: "link";
      currentIndex: number;
      totalChapters: number;
      prevHref: string | null;
      nextHref: string | null;
    };

const navButtonClass =
  "text-xs font-mono text-muted hover:text-lamp disabled:opacity-30 disabled:hover:text-muted transition-colors whitespace-nowrap";

// Small sticky bar kept pinned to the top of the reading area so a reader
// deep in a long chapter (or deep in chapter 6 of 9, in the whole-story
// view) doesn't have to scroll back up to the pill list to jump around.
//
// "scroll" variant: whole-story view — tracks whichever chapter is
// currently scrolled into view and jumps between anchors on the same
// page (unchanged from the original single-file page).
//
// "link" variant: per-chapter route — the current chapter is just
// whatever's in the URL, so there's no scroll-tracking to do; this shows
// a plain "Chapter X / Y" indicator and links to the sibling chapter
// routes instead of scrolling.
export default function ChapterStickyBar(props: ChapterStickyBarProps) {
  return (
    <div className="sticky top-0 z-10 -mx-5 sm:-mx-8 mb-6 bg-ink/95 backdrop-blur border-b border-parchment/10 px-5 sm:px-8 py-2.5 flex items-center justify-between gap-3">
      {props.variant === "scroll" ? (
        <button type="button" onClick={props.onPrev} disabled={!props.hasPrev} className={navButtonClass}>
          ← Previous
        </button>
      ) : props.prevHref ? (
        <Link href={props.prevHref} className={navButtonClass}>
          ← Previous
        </Link>
      ) : (
        <span className={`${navButtonClass} opacity-30 pointer-events-none`}>← Previous</span>
      )}

      <span className="text-xs font-mono text-faint truncate text-center">
        {props.variant === "scroll"
          ? `Ch. ${props.currentIndex + 1}/${props.totalChapters} · ${props.currentTitle}`
          : `Chapter ${props.currentIndex + 1} / ${props.totalChapters}`}
      </span>

      {props.variant === "scroll" ? (
        <button type="button" onClick={props.onNext} disabled={!props.hasNext} className={navButtonClass}>
          Next →
        </button>
      ) : props.nextHref ? (
        <Link href={props.nextHref} className={navButtonClass}>
          Next →
        </Link>
      ) : (
        <span className={`${navButtonClass} opacity-30 pointer-events-none`}>Next →</span>
      )}
    </div>
  );
}
