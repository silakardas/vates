"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import StoryHeaderMeta from "@/components/discover/StoryHeaderMeta";
import ChapterPillNav from "@/components/discover/ChapterPillNav";
import ChapterStickyBar from "@/components/discover/ChapterStickyBar";
import CommentsSection from "@/components/discover/CommentsSection";
import { useStoryReader } from "@/lib/useStoryReader";
import { chapterLabelParts } from "@/lib/chapterLabel";
import { getReadingProgress, saveReadingProgress } from "@/lib/readingProgress";

// Same debounce window used by the whole-story view (and by StoryContext's
// own autosave) — see the note there for why it isn't shared as an import.
const READING_PROGRESS_DEBOUNCE_MS = 1500;

export default function ChapterReaderPage() {
  const { id, chapterId } = useParams<{ id: string; chapterId: string }>();
  const router = useRouter();

  const {
    story,
    author,
    loading,
    notFound,
    isOwner,
    chapters,
    tags,
    hasAnyTags,
    liked,
    likeCount,
    handleLike,
    comments,
    commentAuthors,
    commentsLoading,
    newComment,
    setNewComment,
    postingComment,
    handlePostComment,
    handleDeleteComment,
    user,
  } = useStoryReader(id);

  const chapterIndex = chapters.findIndex((c) => c.id === chapterId);
  const chapter = chapterIndex >= 0 ? chapters[chapterIndex] : null;
  const chapterNotFound = !loading && !!story && chapters.length > 0 && !chapter;

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restoredKeyRef = useRef<string | null>(null);
  const [progressReady, setProgressReady] = useState(false);
  // Only a signed-in reader looking at someone else's story ever has a
  // saved position to restore — everyone else can render immediately.
  const needsProgressRestore = !!story && !!chapter && !!user && !isOwner;

  // Tracks scroll position on *this* chapter's page and persists it
  // (debounced) to reading_progress. Unlike the whole-story view, the
  // current chapter is already fixed by the URL, so this only needs to
  // track how far down the page the reader has scrolled — not which
  // chapter is in view.
  useEffect(() => {
    if (!story || !chapter || !user || isOwner) return;
    const storyId = story.id;
    const currentChapterId = chapter.id;
    const userId = user.id;

    function computeFraction() {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollable <= 0) return 0;
      return Math.max(0, Math.min(1, window.scrollY / scrollable));
    }

    function persist(fraction: number) {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        saveReadingProgress(userId, storyId, currentChapterId, fraction);
      }, READING_PROGRESS_DEBOUNCE_MS);
    }

    let ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        persist(computeFraction());
        ticking = false;
      });
    }

    window.addEventListener("scroll", onScroll, { passive: true });

    function flush() {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveReadingProgress(userId, storyId, currentChapterId, computeFraction());
    }
    function onVisibilityChange() {
      if (document.visibilityState === "hidden") flush();
    }
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      flush();
    };
  }, [story, chapter, user, isOwner]);

  // Restores the reader's saved scroll position, but only when it was
  // saved against *this exact chapter* — if their last saved position
  // points at a different chapter, they've navigated here deliberately
  // (via the pill list or prev/next), so starting at the top is correct.
  useEffect(() => {
    if (!needsProgressRestore || !story || !chapter || !user) return;
    const key = `${story.id}:${chapter.id}`;
    if (restoredKeyRef.current === key) return;
    restoredKeyRef.current = key;

    let cancelled = false;
    const timer = setTimeout(async () => {
      const progress = await getReadingProgress(user.id, story.id);
      if (!cancelled && progress?.chapterId === chapter.id) {
        const scrollable = document.documentElement.scrollHeight - window.innerHeight;
        if (scrollable > 0) {
          window.scrollTo({ top: progress.scrollFraction * scrollable, behavior: "auto" });
        }
      }
      if (!cancelled) setProgressReady(true);
    }, 120);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [needsProgressRestore, story, chapter, user]);

  if (loading || (needsProgressRestore && !progressReady)) {
    return (
      <>
        <Header />
        <main className="text-parchment px-5 sm:px-8 py-24 text-center">
          <p className="text-muted text-sm">Loading story…</p>
        </main>
        <Footer />
      </>
    );
  }

  if (notFound || !story || !tags) {
    return (
      <>
        <Header />
        <main className="text-parchment px-5 sm:px-8 py-24 text-center">
          <p className="text-muted">This story doesn&apos;t exist, or isn&apos;t public.</p>
          <button
            onClick={() => router.push("/")}
            className="mt-4 text-lamp font-mono text-sm hover:underline"
          >
            ← Back home
          </button>
        </main>
        <Footer />
      </>
    );
  }

  if (chapterNotFound || !chapter) {
    return (
      <>
        <Header />
        <main className="text-parchment px-5 sm:px-8 py-24 text-center">
          <p className="text-muted">That chapter doesn&apos;t exist.</p>
          <button
            onClick={() => router.push(`/discover/${story.id}`)}
            className="mt-4 text-lamp font-mono text-sm hover:underline"
          >
            ← Back to {story.title}
          </button>
        </main>
        <Footer />
      </>
    );
  }

  // Only worth a jump-list/sticky-bar once there's more than one chapter
  // to move between — matches the whole-story view's own rule.
  const showChapterNav = story.type === "series" && chapters.length > 1;
  const hasPrevChapter = chapterIndex > 0;
  const hasNextChapter = chapterIndex < chapters.length - 1;
  const prevHref = hasPrevChapter ? `/discover/${story.id}/chapter/${chapters[chapterIndex - 1].id}` : null;
  const nextHref = hasNextChapter ? `/discover/${story.id}/chapter/${chapters[chapterIndex + 1].id}` : null;

  const { primary: chapterPrimaryLabel, secondary: chapterSecondaryLabel } = chapterLabelParts(
    chapter,
    chapterIndex
  );

  return (
    <>
      <Header />
      <main className="text-parchment px-5 py-10 sm:px-8 sm:py-14 max-w-3xl mx-auto">
        <StoryHeaderMeta
          story={story}
          author={author}
          isOwner={isOwner}
          liked={liked}
          likeCount={likeCount}
          onLike={handleLike}
          onEdit={() => router.push(`/story/${story.id}`)}
          tags={tags}
          hasAnyTags={hasAnyTags}
          viewToggle={{
            href: `/discover/${story.id}?view=all`,
            label: "Read the whole story on one page →",
          }}
        />

        {showChapterNav && (
          <ChapterPillNav
            variant="link"
            chapters={chapters}
            activeChapterId={chapter.id}
            hrefFor={(c) => `/discover/${story.id}/chapter/${c.id}`}
          />
        )}

        {/* Simpler than the whole-story view's sticky bar: the current
            chapter is already fixed by the URL, so this is just a plain
            "Chapter X / Y" indicator plus prev/next links — no
            scroll-based "which chapter is in view" tracking needed. */}
        {showChapterNav && (
          <ChapterStickyBar
            variant="link"
            currentIndex={chapterIndex}
            totalChapters={chapters.length}
            prevHref={prevHref}
            nextHref={nextHref}
          />
        )}

        <div className="bg-parchment text-[#3A3226] rounded-lg px-6 py-8 sm:px-10 sm:py-12">
          <div className="mb-6 pb-6 border-b border-black/10">
            <p className="font-mono text-[10px] uppercase tracking-wide text-[#9A8E76] mb-1">
              {chapterPrimaryLabel}
            </p>
            {chapterSecondaryLabel && (
              <h2 className="font-serif text-2xl text-[#3A3226]">{chapterSecondaryLabel}</h2>
            )}
          </div>

          <div
            className="ProseMirror font-serif text-lg leading-loose max-w-[65ch] mx-auto"
            dangerouslySetInnerHTML={{ __html: chapter.content || "<p></p>" }}
          />

          {showChapterNav && (
            <div className="flex items-center justify-between gap-3 mt-8 pt-6 border-t border-black/10 max-w-[65ch] mx-auto">
              {prevHref ? (
                <Link
                  href={prevHref}
                  className="text-sm font-mono text-[#7A6E58] hover:text-[#3A3226] transition-colors"
                >
                  ← Previous chapter
                </Link>
              ) : (
                <span />
              )}
              {nextHref ? (
                <Link
                  href={nextHref}
                  className="text-sm font-mono text-[#7A6E58] hover:text-[#3A3226] transition-colors"
                >
                  Next chapter →
                </Link>
              ) : (
                <span />
              )}
            </div>
          )}
        </div>

        <CommentsSection
          storyId={story.id}
          isOwner={isOwner}
          isSignedIn={!!user}
          comments={comments}
          commentAuthors={commentAuthors}
          commentsLoading={commentsLoading}
          newComment={newComment}
          onNewCommentChange={setNewComment}
          postingComment={postingComment}
          onPostComment={handlePostComment}
          onDeleteComment={handleDeleteComment}
        />
      </main>
      <Footer />
    </>
  );
}
