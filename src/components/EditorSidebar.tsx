"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Story, StoryType } from "@/lib/types";
import { StoryStatus, STATUS_CONFIG } from "@/lib/storyStatus";
import { useStories } from "@/lib/StoryContext";
import { relativeTime } from "@/lib/timeAgo";

const TABS = ["Details", "Characters", "Notes", "Chapters", "History"] as const;
type Tab = (typeof TABS)[number];

export default function EditorSidebar(props: {
  story: Story;
  activeChapterId: string;
  onSelectChapter: (id: string) => void;
}) {
  const [tab, setTab] = useState<Tab>("Details");
  const [tagInput, setTagInput] = useState("");
  const [versionLabel, setVersionLabel] = useState("");
  const {
    updateStory,
    addChapter,
    addTag,
    removeTag,
    addCharacter,
    updateCharacter,
    removeCharacter,
    updateNotes,
    saveVersion,
    restoreVersion,
  } = useStories();
  const { story } = props;
  const activeChapter =
    story.chapters.find((c) => c.id === props.activeChapterId) ?? story.chapters[0];

  function handleAddTag(e: React.FormEvent) {
    e.preventDefault();
    addTag(story.id, tagInput);
    setTagInput("");
  }

  function handleAddChapter() {
    const chapter = addChapter(story.id);
    if (chapter) props.onSelectChapter(chapter.id);
  }

  function handleAddCharacter() {
    addCharacter(story.id);
  }

  function handleSaveVersion() {
    if (!activeChapter) return;
    saveVersion(story.id, activeChapter.id, versionLabel);
    setVersionLabel("");
  }

  function handleRestore(versionId: string) {
    if (!activeChapter) return;
    restoreVersion(story.id, activeChapter.id, versionId);
  }

  return (
    <aside className="w-full max-h-[60vh] border-t lg:max-h-none lg:w-80 lg:flex-shrink-0 lg:border-t-0 lg:border-l border-parchment/10 flex flex-col">
      <div className="grid grid-cols-2 gap-1 p-2 border-b border-parchment/10">
        {TABS.map((t, i) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-2 py-2 text-xs font-mono uppercase tracking-wide rounded-md transition-colors ${
              i === TABS.length - 1 && TABS.length % 2 !== 0 ? "col-span-2" : ""
            } ${
              tab === t
                ? "bg-lamp/15 text-lamp"
                : "text-muted hover:text-parchment hover:bg-ink-soft"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {tab === "Details" && (
          <div className="space-y-6">
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-wide text-muted mb-2">
                Status
              </label>
              <select
                value={story.status}
                onChange={(e) =>
                  updateStory(story.id, { status: e.target.value as StoryStatus })
                }
                className="w-full bg-ink-soft rounded-lg px-3 py-2 text-sm outline-none border border-parchment/10 focus:border-lamp/40 transition-colors"
              >
                {(Object.keys(STATUS_CONFIG) as StoryStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {STATUS_CONFIG[s].label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-mono text-[10px] uppercase tracking-wide text-muted mb-2">
                Description <span className="normal-case text-faint">(optional)</span>
              </label>
              <textarea
                value={story.description ?? ""}
                onChange={(e) => updateStory(story.id, { description: e.target.value })}
                placeholder="A line or two, for your own reference..."
                rows={6}
                className="w-full bg-ink-soft rounded-lg px-3 py-2 text-sm outline-none border border-parchment/10 focus:border-lamp/40 transition-colors resize-none placeholder:text-faint leading-relaxed custom-scrollbar"
              />
            </div>

            <div>
              <label className="block font-mono text-[10px] uppercase tracking-wide text-muted mb-2">
                Type
              </label>
              <div className="flex gap-2">
                {(["oneshot", "series"] as StoryType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => updateStory(story.id, { type: t })}
                    className={`flex-1 text-sm py-2 rounded-lg border transition-colors capitalize ${
                      story.type === t
                        ? "bg-lamp/15 border-lamp/40 text-lamp"
                        : "bg-ink-soft border-parchment/10 text-muted hover:text-parchment"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-mono text-[10px] uppercase tracking-wide text-muted mb-2">
                Tags
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
                {story.tags.length === 0 && (
                  <p className="text-xs text-faint">No tags yet.</p>
                )}
                {story.tags.map((tag) => (
                  <motion.span
                    key={tag}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-1.5 text-xs bg-ink-soft border border-parchment/10 px-2.5 py-1 rounded-full"
                  >
                    #{tag}
                    <button
                      onClick={() => removeTag(story.id, tag)}
                      className="text-faint hover:text-crimson transition-colors"
                      aria-label={`Remove tag ${tag}`}
                    >
                      ✕
                    </button>
                  </motion.span>
                ))}
              </div>
              <form onSubmit={handleAddTag} className="flex gap-2">
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="Add a tag..."
                  className="flex-1 min-w-0 bg-ink-soft rounded-lg px-3 py-1.5 text-sm outline-none border border-parchment/10 focus:border-lamp/40 transition-colors placeholder:text-faint"
                />
                <button
                  type="submit"
                  className="text-xs font-mono text-lamp px-2 hover:underline"
                >
                  Add
                </button>
              </form>
            </div>
          </div>
        )}

        {tab === "Characters" && (
          <div className="space-y-3">
            {story.characters.length === 0 && (
              <p className="text-xs text-faint leading-relaxed mb-1">
                No characters yet. Jot down who&apos;s in this story as you go.
              </p>
            )}
            {story.characters.map((c) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-ink-soft border border-parchment/10 rounded-lg p-3.5 space-y-2"
              >
                <div className="flex items-start gap-2">
                  <input
                    value={c.name}
                    onChange={(e) =>
                      updateCharacter(story.id, c.id, { name: e.target.value })
                    }
                    placeholder="Name"
                    className="flex-1 min-w-0 bg-transparent font-serif text-sm outline-none border-b border-transparent focus:border-lamp/40 transition-colors"
                  />
                  <button
                    onClick={() => removeCharacter(story.id, c.id)}
                    className="text-faint hover:text-crimson transition-colors text-xs mt-0.5"
                    aria-label={`Remove character ${c.name}`}
                  >
                    ✕
                  </button>
                </div>
                <input
                  value={c.role}
                  onChange={(e) =>
                    updateCharacter(story.id, c.id, { role: e.target.value })
                  }
                  placeholder="Role — protagonist, rival, ghost..."
                  className="w-full bg-transparent font-mono text-[10px] uppercase tracking-wide text-lamp outline-none placeholder:text-faint placeholder:normal-case placeholder:tracking-normal"
                />
                <textarea
                  value={c.description}
                  onChange={(e) =>
                    updateCharacter(story.id, c.id, { description: e.target.value })
                  }
                  placeholder="Notes on this character..."
                  rows={3}
                  className="w-full bg-ink rounded-md px-2.5 py-2 text-xs leading-relaxed outline-none border border-parchment/10 focus:border-lamp/40 transition-colors placeholder:text-faint resize-none"
                />
              </motion.div>
            ))}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleAddCharacter}
              className="w-full text-xs font-mono text-lamp border border-dashed border-lamp/30 rounded-lg py-2.5 hover:bg-lamp/5 transition-colors"
            >
              + Add character
            </motion.button>
          </div>
        )}

        {tab === "Notes" && (
          <div className="flex flex-col h-full">
            <p className="font-mono text-[10px] uppercase tracking-wide text-muted mb-2">
              Scratchpad
            </p>
            <textarea
              value={story.notes}
              onChange={(e) => updateNotes(story.id, e.target.value)}
              placeholder="Worldbuilding, plot threads, things to remember..."
              className="w-full flex-1 min-h-[50vh] bg-ink-soft rounded-lg px-3 py-2.5 text-sm leading-relaxed outline-none border border-parchment/10 focus:border-lamp/40 transition-colors placeholder:text-faint resize-none"
            />
          </div>
        )}

        {tab === "History" && activeChapter && (
          <div className="space-y-5">
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-wide text-muted mb-2">
                Save a checkpoint
              </label>
              <div className="flex gap-2">
                <input
                  value={versionLabel}
                  onChange={(e) => setVersionLabel(e.target.value)}
                  placeholder="What changed? (optional)"
                  className="flex-1 min-w-0 bg-ink-soft rounded-lg px-3 py-1.5 text-sm outline-none border border-parchment/10 focus:border-lamp/40 transition-colors placeholder:text-faint"
                />
                <button
                  onClick={handleSaveVersion}
                  className="text-xs font-mono text-lamp px-2 hover:underline"
                >
                  Save
                </button>
              </div>
              <p className="text-[10px] text-faint leading-relaxed mt-2">
                Vates also checkpoints automatically as you write — on big
                edits, or every ten minutes or so.
              </p>
            </div>

            <div>
              <p className="font-mono text-[10px] uppercase tracking-wide text-muted mb-3">
                {activeChapter.versions.length === 0
                  ? "No checkpoints yet"
                  : `${activeChapter.versions.length} checkpoint${
                      activeChapter.versions.length === 1 ? "" : "s"
                    }`}
              </p>
              <div className="space-y-1.5">
                {[...activeChapter.versions].reverse().map((v) => (
                  <motion.div
                    key={v.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-ink-soft border border-parchment/10 rounded-lg px-3 py-2.5"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-mono text-parchment">
                        {relativeTime(v.createdAt)}
                      </span>
                      <span className="text-[10px] font-mono text-faint whitespace-nowrap">
                        {v.wordCount.toLocaleString("en-US")}w
                      </span>
                    </div>
                    {v.label && (
                      <p className="text-[11px] font-mono text-lamp mb-1.5">{v.label}</p>
                    )}
                    <button
                      onClick={() => handleRestore(v.id)}
                      className="text-[11px] font-mono text-muted hover:text-lamp transition-colors"
                    >
                      Restore this version →
                    </button>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "Chapters" && (
          <div>
            {story.type === "oneshot" ? (
              <p className="text-xs text-faint leading-relaxed">
                This is a oneshot — it has a single chapter. Switch to
                &quot;Series&quot; in Details to add more.
              </p>
            ) : (
              <>
                <div className="space-y-1.5 mb-4">
                  {story.chapters.map((c, i) => (
                    <button
                      key={c.id}
                      onClick={() => props.onSelectChapter(c.id)}
                      className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                        c.id === props.activeChapterId
                          ? "bg-lamp/15 text-lamp border border-lamp/30"
                          : "text-muted hover:bg-ink-soft border border-transparent"
                      }`}
                    >
                      <span className="font-mono text-[10px] mr-2 opacity-60">
                        {i + 1}
                      </span>
                      {c.title || "Untitled chapter"}
                    </button>
                  ))}
                </div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleAddChapter}
                  className="w-full text-xs font-mono text-lamp border border-dashed border-lamp/30 rounded-lg py-2.5 hover:bg-lamp/5 transition-colors"
                >
                  + Add chapter
                </motion.button>
              </>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}