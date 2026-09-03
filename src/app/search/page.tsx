"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PublicStoryCard from "@/components/PublicStoryCard";
import { tagColumnsToStoryTags } from "@/lib/tags";
import { storyMatchScore } from "@/lib/search";
import { useSearchStories } from "@/lib/useSearchStories";

// Full results page for the site-wide search — where the header search
// box's "Enter" and "See all N results →" land. Unlike the quick
// dropdown (capped at 6) or the Advanced search panel (word-count/tag
// filters, opened from the header), this just lists every public story
// matching the query, ranked the same way (title > author >
// fandom/character > relationship/additional tag) via the shared
// storyMatchScore helper.
function SearchResults() {
  const searchParams = useSearchParams();
  const rawQuery = searchParams.get("q") ?? "";
  const query = rawQuery.trim();
  const q = query.toLowerCase();

  const { stories, authors, loading } = useSearchStories(true);

  const results = q
    ? stories
        .map((s) => ({
          story: s,
          score: storyMatchScore(s, q, authors[s.owner_id]?.username, tagColumnsToStoryTags(s)),
        }))
        .filter(({ score }) => score > 0)
        .sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          const aTime = new Date(a.story.published_at ?? a.story.created_at).getTime();
          const bTime = new Date(b.story.published_at ?? b.story.created_at).getTime();
          return bTime - aTime;
        })
        .map(({ story }) => story)
    : [];

  return (
    <>
      <Header />
      <main className="text-parchment px-5 py-10 sm:px-8 sm:py-14 max-w-5xl mx-auto min-h-[50vh]">
        <h1 className="font-serif text-2xl sm:text-3xl mb-1">
          {query ? <>Results for &ldquo;{query}&rdquo;</> : "Search"}
        </h1>
        {query && !loading && (
          <p className="text-xs font-mono text-faint mb-8">
            {results.length} {results.length === 1 ? "result" : "results"}
          </p>
        )}
        {!query && <p className="text-muted text-sm mb-8">Enter a search above to get started.</p>}

        {query && loading && (
          <p className="text-muted text-sm py-12 text-center">Searching…</p>
        )}

        {query && !loading && results.length === 0 && (
          <p className="text-muted text-sm py-12 text-center">No results found.</p>
        )}

        {query && !loading && results.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {results.map((story) => (
              <PublicStoryCard
                key={story.id}
                story={{
                  id: story.id,
                  title: story.title,
                  description: story.description,
                  tags: tagColumnsToStoryTags(story),
                  viewCount: story.view_count,
                  likeCount: story.like_count,
                }}
                authorUsername={authors[story.owner_id]?.username}
              />
            ))}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}

// useSearchParams needs a Suspense boundary around it (Next.js bails a
// page that reads it into fully client-side rendering otherwise), so the
// actual page content lives in SearchResults and this default export is
// just the boundary.
export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <SearchResults />
    </Suspense>
  );
}
