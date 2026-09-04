import type { Chapter } from "./types";

// A user-given chapter title that's just a restatement of the chapter's
// position ("1", "1.", "Chapter 1", ...) reads as pure noise next to the
// "Chapter N" label every pill already gets — e.g. a chapter titled "1."
// used to render as "1. 1." under the old `{i+1}. {title || "Chapter " +
// (i+1)}` format. This flags exactly those redundant titles so callers
// can hide them instead of showing the repeat.
function isRedundantChapterTitle(title: string, index: number): boolean {
  const trimmed = title.trim();
  if (!trimmed) return true;

  const normalized = trimmed.toLowerCase().replace(/[^a-z0-9]/g, "");
  const n = String(index + 1);
  const redundantForms = [n, `chapter${n}`, `ch${n}`, `chp${n}`, `bolum${n}`, `bölüm${n}`];
  return redundantForms.some((form) => normalized === form.replace(/[^a-z0-9]/g, ""));
}

// Splits a chapter's display label into its structural part ("Chapter N",
// always shown) and its custom part (the writer's own title, only when it
// adds information beyond the chapter number). Used by both the pill
// jump-list and the chapter-page heading so the two never drift apart.
export function chapterLabelParts(
  chapter: Chapter,
  index: number
): { primary: string; secondary: string | null } {
  const primary = `Chapter ${index + 1}`;
  const title = chapter.title ?? "";
  const secondary = isRedundantChapterTitle(title, index) ? null : title.trim();
  return { primary, secondary };
}
