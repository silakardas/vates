"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Story, TagCategory } from "@/lib/types";
import { useStories } from "@/lib/StoryContext";
import { TAG_CATEGORIES } from "@/lib/tags";

// Review step shown before a private story goes public. Lets the author
// give the description and tags one last look — the same fields a reader
// sees first on /discover — before togglePublic() actually flips it.
// Unpublishing skips this entirely (see EditorSidebar): only the
// private → public transition needs a second look.
export default function PublishReviewModal(props: { story: Story; onClose: () => void }) {
  const { story, onClose } = props;
  const { updateStory, togglePublic, addTag, removeTag } = useStories();
  const [tagInputs, setTagInputs] = useState<Record<TagCategory, string>>({
    fandoms: "",
    relationships: "",
    characters: "",
    additionalTags: "",
  });

  function handleAddTag(e: React.FormEvent, category: TagCategory) {
    e.preventDefault();
    addTag(story.id, category, tagInputs[category]);
    setTagInputs((prev) => ({ ...prev, [category]: "" }));
  }

  function handleConfirm() {
    togglePublic(story.id);
    onClose();
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 sm:p-6"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 10 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg max-h-[85vh] flex flex-col bg-ink border border-parchment/10 rounded-2xl shadow-2xl overflow-hidden"
        >
          <div className="px-5 sm:px-6 pt-5 sm:pt-6 pb-4 border-b border-parchment/10 flex-shrink-0">
            <p className="font-mono text-[10px] uppercase tracking-wide text-lamp mb-1.5">
              Before you share
            </p>
            <h2 className="font-serif text-xl text-parchment mb-1.5">
              Review &quot;{story.title}&quot;
            </h2>
            <p className="text-sm text-muted leading-relaxed">
              Anyone will be able to find and read this once it&apos;s public.
              Give the description and tags a last look.
            </p>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar px-5 sm:px-6 py-5 space-y-6">
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-wide text-muted mb-2">
                Description <span className="normal-case text-faint">(optional)</span>
              </label>
              <textarea
                value={story.description ?? ""}
                onChange={(e) => updateStory(story.id, { description: e.target.value })}
                placeholder="A line or two describing your story to readers..."
                rows={4}
                className="w-full bg-ink-soft rounded-lg px-3 py-2 text-sm outline-none border border-parchment/10 focus:border-lamp/40 transition-colors resize-none placeholder:text-faint leading-relaxed custom-scrollbar"
              />
            </div>

            {TAG_CATEGORIES.map(({ key, label, placeholder }) => {
              const values = story.tags[key];
              return (
                <div key={key}>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <label className="block font-mono text-[10px] uppercase tracking-wide text-muted">
                      {label}
                    </label>
                    {key === "fandoms" && (
                      <button
                        onClick={() => addTag(story.id, "fandoms", "Original Work")}
                        className="font-mono text-[10px] uppercase tracking-wide text-lamp/80 hover:text-lamp transition-colors"
                      >
                        + Original Work
                      </button>
                    )}
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
                        className="flex items-center gap-1.5 text-xs bg-lamp/15 border border-lamp/40 text-lamp px-2.5 py-1 rounded-full"
                      >
                        #{tag}
                        <button
                          onClick={() => removeTag(story.id, key, tag)}
                          className="text-lamp/70 hover:text-crimson transition-colors"
                          aria-label={`Remove ${label.toLowerCase()} tag ${tag}`}
                        >
                          ✕
                        </button>
                      </motion.span>
                    ))}
                  </div>
                  <form onSubmit={(e) => handleAddTag(e, key)} className="flex gap-2">
                    <input
                      value={tagInputs[key]}
                      onChange={(e) =>
                        setTagInputs((prev) => ({ ...prev, [key]: e.target.value }))
                      }
                      placeholder={placeholder}
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
              );
            })}
          </div>

          <div className="flex items-center gap-3 px-5 sm:px-6 py-4 border-t border-parchment/10 flex-shrink-0">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleConfirm}
              className="flex-1 bg-lamp text-ink font-semibold text-sm px-4 py-2.5 rounded-full"
            >
              Publish to community
            </motion.button>
            <button
              onClick={onClose}
              className="font-mono text-xs text-faint hover:text-muted transition-colors px-2"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}