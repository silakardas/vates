"use client";

import Link from "next/link";
import type { Chapter } from "@/lib/types";
import { chapterLabelParts } from "@/lib/chapterLabel";

type ChapterPillNavProps =
  | {
      variant: "scroll";
      chapters: Chapter[];
      onSelect: (chapterId: string) => void;
    }
  | {
      variant: "link";
      chapters: Chapter[];
      activeChapterId: string;
      hrefFor: (chapter: Chapter, index: number) => string;
    };

// Bölüm seçici piller. Each pill shows the structural "Chapter N" label
// plus the writer's own chapter title as a muted secondary bit — but only
// when that title actually adds something beyond the number (see
// chapterLabelParts), so a chapter titled "1." no longer renders as the
// redundant "1. 1.".
//
// Two variants share this one component: "scroll" (whole-story view —
// pills scroll to an in-page anchor) and "link" (per-chapter route —
// pills are real links to /discover/[id]/chapter/[chapterId]).
export default function ChapterPillNav(props: ChapterPillNavProps) {
  return (
    <div className="mb-6">
      <p className="font-mono text-[10px] uppercase tracking-wide text-faint mb-2">Chapters</p>
      <div className="flex flex-wrap gap-2">
        {props.chapters.map((chapter, i) => {
          const { primary, secondary } = chapterLabelParts(chapter, i);
          const label = (
            <>
              {primary}
              {secondary && <span className="text-faint"> · {secondary}</span>}
            </>
          );

          if (props.variant === "scroll") {
            return (
              <button
                key={chapter.id}
                type="button"
                onClick={() => props.onSelect(chapter.id)}
                className="text-xs font-mono px-2.5 py-1 rounded-full border border-parchment/10 text-muted hover:text-parchment hover:border-parchment/20 transition-colors"
              >
                {label}
              </button>
            );
          }

          const isActive = chapter.id === props.activeChapterId;
          return (
            <Link
              key={chapter.id}
              href={props.hrefFor(chapter, i)}
              aria-current={isActive ? "page" : undefined}
              className={`text-xs font-mono px-2.5 py-1 rounded-full border transition-colors ${
                isActive
                  ? "text-lamp border-lamp/40 bg-lamp/10"
                  : "border-parchment/10 text-muted hover:text-parchment hover:border-parchment/20"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
