"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Story, StoryTags, StoryType, TagCategory } from "@/lib/types";
import { StoryStatus, STATUS_CONFIG } from "@/lib/storyStatus";
import { useStories } from "@/lib/StoryContext";
import { relativeTime } from "@/lib/timeAgo";
import { TAG_CATEGORIES, tagColumnsToStoryTags } from "@/lib/tags";
import { computeTagsByCategory } from "@/lib/search";
import { useSearchStories } from "@/lib/useSearchStories";
import PublishReviewModal from "./PublishReviewModal";

const TABS = ["Details", "Characters", "Notes", "Chapters", "History"] as const;
type Tab = (typeof TABS)[number];

export default function EditorSidebar(props: {
  story: Story;
  activeChapterId: string;
  onSelectChapter: (id: string) => void;
}) {
  const [tab, setTab] = useState<Tab>("Details");
  const [tagInputs, setTagInputs] = useState<Record<TagCategory, string>>({
    fandoms: "",
    relationships: "",
    characters: "",
    additionalTags: "",
  });
  const [versionLabel, setVersionLabel] = useState("");
  const [showPublishReview, setShowPublishReview] = useState(false);
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  const {
    updateStory,
    togglePublic,
    addChapter,
    addTag,
    removeTag,
    addCharacter,
    updateCharacter,
    removeCharacter,
    addNote,
    updateNote,
    removeNote,
    saveVersion,
    restoreVersion,
  } = useStories();
  const { story } = props;
  const activeChapter =
    story.chapters.find((c) => c.id === props.activeChapterId) ?? story.chapters[0];

  // Tag autocomplete: reuses the same popular-tags-per-category data the
  // search bar/filters already compute, rather than inventing a second
  // way to fetch and count public stories' tags.
  const { stories: publicStories } = useSearchStories(true);
  const publicStoryTags = useMemo(() => {
    const map = new Map<string, StoryTags>();
    publicStories.forEach((s) => map.set(s.id, tagColumnsToStoryTags(s)));
    return map;
  }, [publicStories]);
  const tagSuggestionsByCategory = useMemo(
    () => computeTagsByCategory(publicStories, publicStoryTags),
    [publicStories, publicStoryTags]
  );

  function handleAddTag(e: React.FormEvent, category: TagCategory) {
    e.preventDefault();
    addTag(story.id, category, tagInputs[category]);
    setTagInputs((prev) => ({ ...prev, [category]: "" }));
  }

  function handleAddChapter() {
    const chapter = addChapter(story.id);
    if (chapter) props.onSelectChapter(chapter.id);
  }

  function toggleNoteExpanded(noteId: string) {
    setExpandedNotes((prev) => {
      const next = new Set(prev);
      if (next.has(noteId)) next.delete(noteId);
      else next.add(noteId);
      return next;
    });
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

  // Going private → public opens the review step first (description +
  // tags, the same fields a reader sees on /discover). Going public →
  // private (unpublish) needs no review, so it still toggles instantly.
  function handleShareToggle() {
    if (story.isPublic) {
      togglePublic(story.id);
    } else {
      setShowPublishReview(true);
    }
  }

  return (
    <aside className="w-full max-h-[60vh] border-t lg:max-h-none lg:min-h-0 lg:w-80 lg:flex-shrink-0 lg:border-t-0 lg:border-l border-parchment/10 flex flex-col">
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

      <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
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
                Community
              </label>
              <button
                onClick={handleShareToggle}
                className={`w-full flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 border transition-colors ${
                  story.isPublic
                    ? "bg-lamp/15 border-lamp/40"
                    : "bg-ink-soft border-parchment/10 hover:border-parchment/20"
                }`}
              >
                <span className="text-left">
                  <span
                    className={`block text-sm ${
                      story.isPublic ? "text-lamp" : "text-parchment"
                    }`}
                  >
                    Share to community
                  </span>
                  <span className="block text-xs text-faint mt-0.5">
                    {story.isPublic
                      ? "Anyone can find and read this story."
                      : "Only you can see this story."}
                  </span>
                </span>
                <span
                  className={`relative flex-shrink-0 w-9 h-5 rounded-full transition-colors ${
                    story.isPublic ? "bg-lamp" : "bg-parchment/20"
                  }`}
                >
                  <motion.span
                    layout
                    transition={{ type: "spring", stiffness: 500, damping: 32 }}
                    className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-ink"
                    style={{ x: story.isPublic ? 16 : 0 }}
                  />
                </span>
              </button>
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

            {TAG_CATEGORIES.map(({ key, label, placeholder }) => (
              <TagCategoryField
                key={key}
                label={label}
                placeholder={placeholder}
                values={story.tags[key]}
                suggestions={tagSuggestionsByCategory[key]}
                value={tagInputs[key]}
                onValueChange={(v) => setTagInputs((prev) => ({ ...prev, [key]: v }))}
                onSubmit={(e) => handleAddTag(e, key)}
                onSelectSuggestion={(tag) => {
                  addTag(story.id, key, tag);
                  setTagInputs((prev) => ({ ...prev, [key]: "" }));
                }}
                onRemove={(tag) => removeTag(story.id, key, tag)}
                extra={
                  key === "fandoms" ? (
                    <button
                      onClick={() => addTag(story.id, "fandoms", "Original Work")}
                      className="font-mono text-[10px] uppercase tracking-wide text-lamp/80 hover:text-lamp transition-colors"
                    >
                      + Original Work
                    </button>
                  ) : undefined
                }
              />
            ))}
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
          <div className="space-y-3">
            {story.notes.length === 0 && (
              <p className="text-xs text-faint leading-relaxed mb-1">
                No notes yet. Jot down worldbuilding, plot threads, things to remember...
              </p>
            )}
            {story.notes.map((n) => (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-ink-soft border border-parchment/10 rounded-lg p-3.5 space-y-2"
              >
                <div className="flex items-start gap-2">
                  <input
                    value={n.title}
                    onChange={(e) => updateNote(story.id, n.id, { title: e.target.value })}
                    placeholder="Note title"
                    className="flex-1 min-w-0 bg-transparent font-serif text-sm outline-none border-b border-transparent focus:border-lamp/40 transition-colors"
                  />
                  <button
                    onClick={() => toggleNoteExpanded(n.id)}
                    className="text-faint hover:text-lamp transition-colors text-xs mt-0.5"
                    aria-label={expandedNotes.has(n.id) ? `Collapse note ${n.title}` : `Expand note ${n.title}`}
                    title={expandedNotes.has(n.id) ? "Collapse" : "Expand"}
                  >
                    <motion.span
                      animate={{ rotate: expandedNotes.has(n.id) ? 180 : 0 }}
                      transition={{ duration: 0.15 }}
                      className="inline-block"
                    >
                      ⌄
                    </motion.span>
                  </button>
                  <button
                    onClick={() => removeNote(story.id, n.id)}
                    className="text-faint hover:text-crimson transition-colors text-xs mt-0.5"
                    aria-label={`Remove note ${n.title}`}
                  >
                    ✕
                  </button>
                </div>
                <textarea
                  value={n.content}
                  onChange={(e) => updateNote(story.id, n.id, { content: e.target.value })}
                  placeholder="Worldbuilding, plot threads, things to remember..."
                  rows={expandedNotes.has(n.id) ? 14 : 4}
                  className={`w-full bg-ink rounded-md px-2.5 py-2 text-xs leading-relaxed outline-none border border-parchment/10 focus:border-lamp/40 transition-all duration-150 placeholder:text-faint resize-y custom-scrollbar ${
                    expandedNotes.has(n.id) ? "min-h-[20rem] max-h-[75vh]" : "min-h-[6rem] max-h-[60vh]"
                  }`}
                />
              </motion.div>
            ))}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => addNote(story.id)}
              className="w-full text-xs font-mono text-lamp border border-dashed border-lamp/30 rounded-lg py-2.5 hover:bg-lamp/5 transition-colors"
            >
              + Add note
            </motion.button>
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

      {showPublishReview && (
        <PublishReviewModal story={story} onClose={() => setShowPublishReview(false)} />
      )}
    </aside>
  );
}

// One tag category's full editing UI: the current tags as removable
// chips, a text input + Add button to type a new one, and — while
// typing — a dropdown of matching tags already used elsewhere on public
// stories in this category, styled like the rest of the app's dropdowns
// (bg-ink-soft, border-parchment/10). Purely a suggestion: picking one
// adds it immediately, but the input still accepts anything typed and
// submitted, matching or not.
function TagCategoryField({
  label,
  placeholder,
  values,
  suggestions,
  value,
  onValueChange,
  onSubmit,
  onSelectSuggestion,
  onRemove,
  extra,
}: {
  label: string;
  placeholder: string;
  values: string[];
  suggestions: string[];
  value: string;
  onValueChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onSelectSuggestion: (tag: string) => void;
  onRemove: (tag: string) => void;
  extra?: React.ReactNode;
}) {
  const [focused, setFocused] = useState(false);

  const q = value.trim().toLowerCase();
  const filteredSuggestions = q
    ? suggestions.filter((t) => t.toLowerCase().includes(q) && !values.includes(t)).slice(0, 6)
    : [];
  const showSuggestions = focused && filteredSuggestions.length > 0;

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-2">
        <label className="block font-mono text-[10px] uppercase tracking-wide text-muted">
          {label}
        </label>
        {extra}
      </div>
      <div className="flex flex-wrap gap-2 mb-3">
        {values.length === 0 && (
          <p className="text-xs text-faint">No {label.toLowerCase()} tags yet.</p>
        )}
        {values.map((tag) => (
          <motion.span
            key={tag}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-1.5 text-xs bg-ink-soft border border-parchment/10 px-2.5 py-1 rounded-full"
          >
            #{tag}
            <button
              onClick={() => onRemove(tag)}
              className="text-faint hover:text-crimson transition-colors"
              aria-label={`Remove ${label.toLowerCase()} tag ${tag}`}
            >
              ✕
            </button>
          </motion.span>
        ))}
      </div>
      <div
        className="relative"
        tabIndex={-1}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setFocused(false);
        }}
      >
        <form onSubmit={onSubmit} className="flex gap-2">
          <input
            value={value}
            onChange={(e) => onValueChange(e.target.value)}
            onFocus={() => setFocused(true)}
            placeholder={placeholder}
            autoComplete="off"
            className="flex-1 min-w-0 bg-ink-soft rounded-lg px-3 py-1.5 text-sm outline-none border border-parchment/10 focus:border-lamp/40 transition-colors placeholder:text-faint"
          />
          <button type="submit" className="text-xs font-mono text-lamp px-2 hover:underline">
            Add
          </button>
        </form>
        {showSuggestions && (
          <ul className="absolute left-0 right-0 top-full mt-1 z-10 bg-ink-soft border border-parchment/10 rounded-lg shadow-lg overflow-hidden divide-y divide-parchment/10">
            {filteredSuggestions.map((tag) => (
              <li key={tag}>
                <button
                  type="button"
                  onClick={() => onSelectSuggestion(tag)}
                  className="w-full text-left px-3 py-1.5 text-sm text-muted hover:text-parchment hover:bg-parchment/5 transition-colors"
                >
                  #{tag}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}