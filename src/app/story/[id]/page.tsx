"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useStories } from "@/lib/StoryContext";
import { totalWordCount } from "@/lib/types";
import Header from "@/components/Header";
import Editor from "@/components/Editor";
import EditorSidebar from "@/components/EditorSidebar";
import { STATUS_CONFIG } from "@/lib/storyStatus";
import type { SaveStatus } from "@/lib/StoryContext";

function SaveIndicator({
  status,
  onRetry,
}: {
  status: SaveStatus | undefined;
  onRetry: () => void;
}) {
  if (!status) {
    return <span className="text-faint">not saved yet</span>;
  }
  if (status.state === "saving") {
    return <span className="text-faint">saving…</span>;
  }
  if (status.state === "error") {
    return (
      <span className="text-red-400 flex items-center gap-2">
        couldn&apos;t save{status.error ? `: ${status.error}` : ""}
        <button
          onClick={onRetry}
          className="underline hover:text-red-300 transition-colors"
        >
          retry
        </button>
      </span>
    );
  }
  return <span className="text-faint">saved</span>;
}

export default function StoryPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { getStory, updateStory, updateChapter, getSaveStatus, retrySave } = useStories();
  const story = getStory(id);
  const saveStatus = getSaveStatus(id);
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);

  if (!story) {
    return (
      <>
        <Header />
        <main className="text-parchment px-5 sm:px-8 py-24 text-center">
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
      <div
        className="flex flex-col lg:flex-row lg:h-[calc(100vh-89px)] lg:overflow-hidden"
        style={{ minHeight: "calc(100vh - 89px)" }}
      >
        <main className="flex-1 min-w-0 lg:min-h-0 lg:overflow-hidden text-parchment px-4 py-6 sm:px-8 sm:py-10 flex flex-col">
          <div className="flex items-center justify-between mb-4 sm:mb-6 gap-3">
            <button
              onClick={() => router.push("/workshop")}
              className="text-muted font-mono text-xs hover:text-lamp transition-colors whitespace-nowrap"
            >
              ← Back to workshop
            </button>

            <button
              onClick={() => router.push(`/story/${story.id}/map`)}
              className="text-xs font-mono text-lamp border border-lamp/30 rounded-lg px-3 py-1.5 hover:bg-lamp/5 transition-colors whitespace-nowrap"
            >
              ✧ Story map
            </button>
          </div>

          <div className="mb-2">
            <input
              value={story.title}
              onChange={(e) => updateStory(story.id, { title: e.target.value })}
              className={`font-serif text-2xl sm:text-3xl bg-transparent outline-none border-b border-transparent focus:border-lamp/40 transition-colors w-full ${
                story.title.toLowerCase().includes("vates") ? "title-vates-glow" : ""
              }`}
            />
          </div>
          <div className="flex items-center gap-3 mb-6 sm:mb-8 flex-wrap">
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

          <div className="flex-1 lg:min-h-0">
            <Editor
              content={currentChapter?.content ?? "<p></p>"}
              onChange={(html, wordCount) =>
                updateChapter(story.id, currentChapter.id, { content: html, wordCount })
              }
            />
          </div>

          <p className="mt-4 text-xs font-mono text-muted flex items-center gap-2 flex-wrap">
            {totalWordCount(story).toLocaleString("en-US")} words total ·{" "}
            <SaveIndicator status={saveStatus} onRetry={() => retrySave(story.id)} />
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