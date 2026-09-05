"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import StoryHeaderMeta from "@/components/discover/StoryHeaderMeta";
import ChapterPillNav from "@/components/discover/ChapterPillNav";
import ChapterStickyBar from "@/components/discover/ChapterStickyBar";
import CommentsSection from "@/components/discover/CommentsSection";
import CharacterMoodboards from "@/components/discover/CharacterMoodboards";
import { useStoryReader } from "@/lib/useStoryReader";
import { getReadingProgress, saveReadingProgress } from "@/lib/readingProgress";

// Same debounce window StoryContext uses for autosaving story edits
// (PERSIST_DEBOUNCE_MS) — kept as its own constant here rather than
// importing that one, since it's a coincidence that the numbers match,
// not a shared contract between the two features.
const READING_PROGRESS_DEBOUNCE_MS = 1500;

function DiscoverStoryPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  // ?view=all is the escape hatch back to the original "every chapter on
  // one page" reading experience for a series — see the redirect effect
  // below for the default (per-chapter) behavior.
  const viewAll = searchParams.get("view") === "all";

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
  } = useStoryReader(id, {
    // A series visited without ?view=all never actually renders its
    // content here — it's redirected to a chapter route below, which
    // will count its own view. Counting one here too would double it.
    shouldCountView: (s) => s.type === "oneshot" || viewAll,
    shouldLoadComments: (s) => s.type === "oneshot" || viewAll,
  });

  // Whether this render is just a pit-stop on the way to a chapter route.
  // A series with zero chapters yet has nowhere to redirect to, so it
  // falls through to the normal "no content yet" render below instead.
  const shouldRedirectToChapter = !!story && story.type === "series" && !viewAll && chapters.length > 0;

  // Which chapter is currently in view, for the sticky chapter-nav bar
  // and for reading-progress tracking below (whole-story view only).
  // Index into `chapters`, not a chapter id, since "previous"/"next" are
  // naturally index math.
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);

  const readingPositionRef = useRef<{ chapterId: string; scrollFraction: number } | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restoredRef = useRef(false);

  // Series, no ?view=all: send the reader straight to a chapter route —
  // their saved position if they have one and it still points at a real
  // chapter, otherwise the first chapter.
  useEffect(() => {
    if (!shouldRedirectToChapter || !story) return;
    let cancelled = false;

    (async () => {
      let targetChapterId = chapters[0].id;
      if (user) {
        const progress = await getReadingProgress(user.id, story.id);
        if (progress?.chapterId && chapters.some((c) => c.id === progress.chapterId)) {
          targetChapterId = progress.chapterId;
        }
      }
      if (!cancelled) {
        router.replace(`/discover/${story.id}/chapter/${targetChapterId}`);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldRedirectToChapter, story?.id, user?.id]);

  // Tracks which chapter is in view and how far through it the reader
  // has scrolled, persisting it (debounced) to reading_progress. Reuses
  // one rAF-throttled scroll listener for both the sticky chapter-nav
  // bar's "current chapter" and the actual progress save, rather than
  // two separate listeners. Only relevant to the whole-story view — the
  // per-chapter route (src/app/discover/[id]/chapter/[chapterId]) has
  // its own, simpler single-chapter version of this.
  useEffect(() => {
    if (shouldRedirectToChapter || !story || chapters.length === 0) return;
    const storyId = story.id;

    function computePosition() {
      const scrollY = window.scrollY;
      let index = 0;
      for (let i = 0; i < chapters.length; i++) {
        const el = document.getElementById(`chapter-${chapters[i].id}`);
        if (!el) continue;
        const top = el.getBoundingClientRect().top + scrollY;
        if (scrollY >= top - 4) index = i;
      }

      setCurrentChapterIndex(index);

      // Reading-progress persistence is only meaningful for a signed-in
      // reader looking at someone else's story — there's no "continue
      // reading" card for your own drafts (that's what ContinueCard is
      // for), and an anon visitor has nowhere to save a position to.
      if (!user || isOwner) return;

      const chapter = chapters[index];
      const el = document.getElementById(`chapter-${chapter.id}`);
      let fraction = 0;
      if (el) {
        const top = el.getBoundingClientRect().top + scrollY;
        const height = el.offsetHeight || 1;
        fraction = Math.max(0, Math.min(1, (scrollY - top) / height));
      }

      readingPositionRef.current = { chapterId: chapter.id, scrollFraction: fraction };

      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        saveReadingProgress(user.id, storyId, chapter.id, fraction);
      }, READING_PROGRESS_DEBOUNCE_MS);
    }

    let ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        computePosition();
        ticking = false;
      });
    }

    // Restoring the saved scroll position (see the effect below) fires
    // its own scroll, which would otherwise immediately get treated as
    // "new" reading progress and overwrite the very position it just
    // restored — computePosition() only kicks in for real user scrolling
    // after that restore has had a chance to run.
    computePosition();
    window.addEventListener("scroll", onScroll, { passive: true });

    // Best-effort flush when the tab is hidden/closed, since the
    // debounce timer might not fire in time otherwise.
    function flush() {
      if (!user || isOwner) return;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      const pos = readingPositionRef.current;
      if (pos) saveReadingProgress(user.id, storyId, pos.chapterId, pos.scrollFraction);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldRedirectToChapter, story?.id, chapters.length, user?.id, isOwner]);

  // Restores the reader's last position once, the first time this story
  // (and this specific reader) are both known.
  useEffect(() => {
    if (shouldRedirectToChapter || !story || !user || isOwner || chapters.length === 0) return;
    if (restoredRef.current) return;
    restoredRef.current = true;

    let cancelled = false;
    const timer = setTimeout(async () => {
      const progress = await getReadingProgress(user.id, story.id);
      if (cancelled || !progress) return;

      const chapterId = progress.chapterId ?? chapters[chapters.length - 1]?.id;
      const el = chapterId ? document.getElementById(`chapter-${chapterId}`) : null;
      if (!el) return;

      const top = el.getBoundingClientRect().top + window.scrollY;
      const height = el.offsetHeight || 1;
      window.scrollTo({
        top: top + progress.scrollFraction * height,
        behavior: "auto",
      });
    }, 120);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldRedirectToChapter, story?.id, user?.id, isOwner, chapters.length]);

  if (loading || shouldRedirectToChapter) {
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

  // Only worth a jump-list once there's more than one chapter to jump
  // between — a oneshot (or a series with a single chapter so far) just
  // reads top to bottom.
  const showChapterNav = story.type === "series" && chapters.length > 1;

  function scrollToChapter(chapterId: string) {
    const el = document.getElementById(`chapter-${chapterId}`);
    if (!el) return;
    // Falls back to an instant jump instead of framer-motion's own
    // reduced-motion handling, since this is a plain DOM scroll, not a
    // <motion.*> animation.
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });
  }

  // These just move the reader between anchors already on the page, the
  // same way the chapter pill-list above does.
  const hasPrevChapter = currentChapterIndex > 0;
  const hasNextChapter = currentChapterIndex < chapters.length - 1;

  function goToPrevChapter() {
    if (!hasPrevChapter) return;
    scrollToChapter(chapters[currentChapterIndex - 1].id);
  }

  function goToNextChapter() {
    if (!hasNextChapter) return;
    scrollToChapter(chapters[currentChapterIndex + 1].id);
  }

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
          viewToggle={
            story.type === "series"
              ? { href: `/discover/${story.id}`, label: "Read chapter by chapter" }
              : null
          }
        />

        {showChapterNav && (
          <ChapterPillNav
            variant="scroll"
            chapters={chapters}
            onSelect={scrollToChapter}
          />
        )}

        {/* Small sticky bar tracking whichever chapter is currently in
            view (see the scroll-tracking effect above), so a reader deep
            in chapter 6 doesn't have to scroll back up to the pill list
            to jump around. Kept deliberately compact — a full title bar
            here would compete with the page's own title for attention. */}
        {showChapterNav && (
          <ChapterStickyBar
            variant="scroll"
            currentIndex={currentChapterIndex}
            totalChapters={chapters.length}
            currentTitle={
              chapters[currentChapterIndex]?.title || `Chapter ${currentChapterIndex + 1}`
            }
            hasPrev={hasPrevChapter}
            hasNext={hasNextChapter}
            onPrev={goToPrevChapter}
            onNext={goToNextChapter}
          />
        )}

        <div className="bg-parchment text-[#3A3226] rounded-lg px-6 py-8 sm:px-10 sm:py-12">
          {chapters.length === 0 && (
            <p className="text-[#7A6E58] text-sm">This story has no content yet.</p>
          )}
          {chapters.map((chapter, i) => (
            <div
              key={chapter.id}
              id={`chapter-${chapter.id}`}
              className={`scroll-mt-16 ${i > 0 ? "mt-12 pt-8 border-t border-black/10" : ""}`}
            >
              {story.type === "series" && (
                <h2 className="font-serif text-xl mb-4 text-[#3A3226]">
                  {chapter.title || `Chapter ${i + 1}`}
                </h2>
              )}
              <div
                className="ProseMirror font-serif text-lg leading-loose max-w-[65ch] mx-auto"
                dangerouslySetInnerHTML={{ __html: chapter.content || "<p></p>" }}
              />
              {showChapterNav && (
                <div className="flex items-center justify-between gap-3 mt-8 pt-6 border-t border-black/10 max-w-[65ch] mx-auto">
                  <button
                    type="button"
                    onClick={() => i > 0 && scrollToChapter(chapters[i - 1].id)}
                    disabled={i === 0}
                    className="text-sm font-mono text-[#7A6E58] hover:text-[#3A3226] disabled:opacity-0 disabled:pointer-events-none transition-colors"
                  >
                    ← Previous chapter
                  </button>
                  <button
                    type="button"
                    onClick={() => i < chapters.length - 1 && scrollToChapter(chapters[i + 1].id)}
                    disabled={i === chapters.length - 1}
                    className="text-sm font-mono text-[#7A6E58] hover:text-[#3A3226] disabled:opacity-0 disabled:pointer-events-none transition-colors"
                  >
                    Next chapter →
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        <CharacterMoodboards characters={story.characters} />

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

// useSearchParams needs a Suspense boundary around it (Next.js bails a
// page that reads it into fully client-side rendering otherwise), so the
// actual page content lives in DiscoverStoryPage and this default export
// is just the boundary — same pattern as /search.
export default function DiscoverStoryPageBoundary() {
  return (
    <Suspense fallback={null}>
      <DiscoverStoryPage />
    </Suspense>
  );
}