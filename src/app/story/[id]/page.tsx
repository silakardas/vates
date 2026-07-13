"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useStories } from "@/lib/StoryContext";
import { totalWordCount } from "@/lib/types";
import Header from "@/components/Header";
import Editor from "@/components/Editor";
import EditorSidebar from "@/components/EditorSidebar";
import { STATUS_CONFIG } from "@/lib/storyStatus";

export default function StoryPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { getStory, updateStory, updateChapter } = useStories();
  const story = getStory(id);
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);

  if (!story) {
    return (
      <>
        <Header />
        <main className="text-parchment px-8 py-24 text-center">
          <p className="text-muted">This story doesn&apos;t exist (yet).</p>
          <button
            onClick={() => router.push("/workshop")}
            className="mt-4 text-lamp font-mono text-sm hover:underline"
          >
            ← Back to workshop
          </button>
        </main>
      </>
    );
  }

  const currentChapter =
    story.chapters.find((c) => c.id === activeChapterId) ?? story.chapters[0];
  const status = STATUS_CONFIG[story.status];

  return (
    <>
      <Header />
      <div className="flex" style={{ minHeight: "calc(100vh - 89px)" }}>
        <main className="flex-1 min-w-0 text-parchment px-8 py-10 flex flex-col">
          <button
            onClick={() => router.push("/workshop")}
            className="text-muted font-mono text-xs hover:text-lamp transition-colors mb-6 self-start"
          >
            ← Back to workshop
          </button>

          <div className="mb-2">
            <input
              value={story.title}
              onChange={(e) => updateStory(story.id, { title: e.target.value })}
              className="font-serif text-3xl bg-transparent outline-none border-b border-transparent focus:border-lamp/40 transition-colors w-full"
            />
          </div>
          <div className="flex items-center gap-3 mb-8">
            <span className={`text-xs font-mono ${status.color} whitespace-nowrap`}>
              ● {status.label}
            </span>
            <span className="text-xs font-mono text-faint capitalize">{story.type}</span>
            {story.type === "series" && (
              <span className="text-xs font-mono text-faint">
                {currentChapter?.title}
              </span>
            )}
          </div>

          {story.type === "series" && (
            <input
              value={currentChapter?.title ?? ""}
              onChange={(e) =>
                updateChapter(story.id, currentChapter.id, { title: e.target.value })
              }
              placeholder="Chapter title"
              className="font-serif text-lg bg-transparent outline-none border-b border-transparent focus:border-lamp/40 transition-colors w-full max-w-md mb-4 text-muted focus:text-parchment"
            />
          )}

          <div className="flex-1">
            <Editor
              content={currentChapter?.content ?? "<p></p>"}
              onChange={(html, wordCount) =>
                updateChapter(story.id, currentChapter.id, { content: html, wordCount })
              }
            />
          </div>

          <p className="mt-4 text-xs font-mono text-muted">
            {totalWordCount(story).toLocaleString("en-US")} words total · saved to this
            session
          </p>
        </main>

        <EditorSidebar
          story={story}
          activeChapterId={currentChapter?.id ?? ""}
          onSelectChapter={setActiveChapterId}
        />
      </div>
    </>
  );
}
