"use client";

import { useState } from "react";
import { TagCategory } from "@/lib/types";
import { TAG_CATEGORIES } from "@/lib/tags";
import { SORT_OPTIONS, SortOption, TagSelection } from "@/lib/search";
import { STATUS_CONFIG, StoryStatus } from "@/lib/storyStatus";

const COMPLETION_OPTIONS: { value: StoryStatus | "any"; label: string }[] = [
  { value: "any", label: "Any status" },
  ...(Object.entries(STATUS_CONFIG) as [StoryStatus, { label: string }][]).map(([value, cfg]) => ({
    value,
    label: cfg.label,
  })),
];

// AO3-inspired "Sort and Filter" sidebar, restyled for Vates' theme:
// sort order, a completion status filter, the four tag categories
// (Include/Exclude — both pickable from popular values and free-text
// custom tags), and a word-count range. Filtering is live (no submit
// button, unlike AO3) since the rest of the site's search already works
// that way.
export default function SearchFilters({
  sortBy,
  onSortChange,
  completionStatus,
  onCompletionStatusChange,
  tagsByCategory,
  includeTags,
  excludeTags,
  onToggleInclude,
  onToggleExclude,
  customIncludeTags,
  customExcludeTags,
  onAddCustomInclude,
  onRemoveCustomInclude,
  onAddCustomExclude,
  onRemoveCustomExclude,
  minWords,
  maxWords,
  onMinWordsChange,
  onMaxWordsChange,
  onClear,
  hasActiveFilters,
}: {
  sortBy: SortOption;
  onSortChange: (v: SortOption) => void;
  completionStatus: StoryStatus | "any";
  onCompletionStatusChange: (v: StoryStatus | "any") => void;
  tagsByCategory: Record<TagCategory, string[]>;
  includeTags: TagSelection;
  excludeTags: TagSelection;
  onToggleInclude: (category: TagCategory, tag: string) => void;
  onToggleExclude: (category: TagCategory, tag: string) => void;
  customIncludeTags: string[];
  customExcludeTags: string[];
  onAddCustomInclude: (tag: string) => void;
  onRemoveCustomInclude: (tag: string) => void;
  onAddCustomExclude: (tag: string) => void;
  onRemoveCustomExclude: (tag: string) => void;
  minWords: string;
  maxWords: string;
  onMinWordsChange: (v: string) => void;
  onMaxWordsChange: (v: string) => void;
  onClear: () => void;
  hasActiveFilters: boolean;
}) {
  return (
    <div className="bg-ink-soft border border-parchment/10 rounded-xl p-4 sm:p-5">
      <p className="font-mono text-xs uppercase tracking-wide text-lamp mb-4">
        Sort and Filter
      </p>

      <div className="mb-5">
        <label className="block font-mono text-[10px] uppercase tracking-wide text-muted mb-1.5">
          Sort by
        </label>
        <select
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value as SortOption)}
          className="w-full bg-ink rounded-lg px-3 py-2 text-sm outline-none border border-parchment/10 focus:border-lamp/40 transition-colors"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-5">
        <label className="block font-mono text-[10px] uppercase tracking-wide text-muted mb-1.5">
          Completion status
        </label>
        <select
          value={completionStatus}
          onChange={(e) => onCompletionStatusChange(e.target.value as StoryStatus | "any")}
          className="w-full bg-ink rounded-lg px-3 py-2 text-sm outline-none border border-parchment/10 focus:border-lamp/40 transition-colors"
        >
          {COMPLETION_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <TagSection
        title="Include"
        titleHint="Only show stories tagged with the selected values."
        tagsByCategory={tagsByCategory}
        selected={includeTags}
        onToggle={onToggleInclude}
        idPrefix="include"
        customTags={customIncludeTags}
        onAddCustomTag={onAddCustomInclude}
        onRemoveCustomTag={onRemoveCustomInclude}
        customPlaceholder="Add a tag to include..."
      />

      <TagSection
        title="Exclude"
        titleHint="Hide stories tagged with the selected values."
        tagsByCategory={tagsByCategory}
        selected={excludeTags}
        onToggle={onToggleExclude}
        idPrefix="exclude"
        customTags={customExcludeTags}
        onAddCustomTag={onAddCustomExclude}
        onRemoveCustomTag={onRemoveCustomExclude}
        customPlaceholder="Add a tag to exclude..."
      />

      <CollapsibleBox title="Word Count" defaultOpen={minWords !== "" || maxWords !== ""}>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-wide text-muted mb-1.5">
              Min
            </label>
            <input
              type="number"
              min={0}
              value={minWords}
              onChange={(e) => onMinWordsChange(e.target.value)}
              placeholder="0"
              className="w-full bg-ink rounded-lg px-3 py-2 text-sm outline-none border border-parchment/10 focus:border-lamp/40 transition-colors placeholder:text-faint"
            />
          </div>
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-wide text-muted mb-1.5">
              Max
            </label>
            <input
              type="number"
              min={0}
              value={maxWords}
              onChange={(e) => onMaxWordsChange(e.target.value)}
              placeholder="No limit"
              className="w-full bg-ink rounded-lg px-3 py-2 text-sm outline-none border border-parchment/10 focus:border-lamp/40 transition-colors placeholder:text-faint"
            />
          </div>
        </div>
      </CollapsibleBox>

      {hasActiveFilters && (
        <button
          onClick={onClear}
          className="mt-4 w-full text-center text-xs font-mono uppercase tracking-wide text-faint hover:text-crimson transition-colors py-1"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}

// A titled group of collapsible per-category boxes (Fandoms,
// Relationships, Characters, Additional Tags) — used once for "Include"
// and once for "Exclude" with a different `selected`/`onToggle` pair.
// Also renders a free-text box above those categories so a value that
// isn't (yet) popular enough to appear as a chip can still be typed in
// directly.
function TagSection({
  title,
  titleHint,
  tagsByCategory,
  selected,
  onToggle,
  idPrefix,
  customTags,
  onAddCustomTag,
  onRemoveCustomTag,
  customPlaceholder,
}: {
  title: string;
  titleHint: string;
  tagsByCategory: Record<TagCategory, string[]>;
  selected: TagSelection;
  onToggle: (category: TagCategory, tag: string) => void;
  idPrefix: string;
  customTags: string[];
  onAddCustomTag: (tag: string) => void;
  onRemoveCustomTag: (tag: string) => void;
  customPlaceholder: string;
}) {
  const hasAnyOptions = TAG_CATEGORIES.some(({ key }) => tagsByCategory[key].length > 0);

  return (
    <div className="mb-5">
      <p
        className="font-serif text-sm text-parchment mb-2"
        title={titleHint}
      >
        {title}
      </p>

      <CustomTagInput
        placeholder={customPlaceholder}
        tags={customTags}
        onAdd={onAddCustomTag}
        onRemove={onRemoveCustomTag}
      />

      {hasAnyOptions && (
        <div className="space-y-1.5 mt-2">
          {TAG_CATEGORIES.map(({ key, label }) => {
            const options = tagsByCategory[key];
            if (options.length === 0) return null;
            const selectedCount = selected[key].length;
            return (
              <CollapsibleBox
                key={key}
                title={label}
                badge={selectedCount > 0 ? selectedCount : undefined}
                defaultOpen={selectedCount > 0}
              >
                <div className="max-h-40 overflow-y-auto custom-scrollbar pr-1 space-y-1">
                  {options.map((tag) => {
                    const checkboxId = `${idPrefix}-${key}-${tag}`;
                    const checked = selected[key].includes(tag);
                    return (
                      <label
                        key={tag}
                        htmlFor={checkboxId}
                        className="flex items-center gap-2 text-sm text-muted hover:text-parchment transition-colors cursor-pointer py-0.5"
                      >
                        <input
                          id={checkboxId}
                          type="checkbox"
                          checked={checked}
                          onChange={() => onToggle(key, tag)}
                          className="accent-lamp"
                        />
                        <span className="truncate">#{tag}</span>
                      </label>
                    );
                  })}
                </div>
              </CollapsibleBox>
            );
          })}
        </div>
      )}
    </div>
  );
}

// A free-text tag input with an "Add" button/Enter-to-add, plus the
// currently added tags rendered as removable chips underneath. Lets the
// user filter by a tag of their own choosing rather than only the
// popular values that show up as checkboxes above.
function CustomTagInput({
  placeholder,
  tags,
  onAdd,
  onRemove,
}: {
  placeholder: string;
  tags: string[];
  onAdd: (tag: string) => void;
  onRemove: (tag: string) => void;
}) {
  const [value, setValue] = useState("");

  function submit() {
    if (!value.trim()) return;
    onAdd(value);
    setValue("");
  }

  return (
    <div>
      <div className="flex gap-1.5">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={placeholder}
          className="min-w-0 flex-1 bg-ink rounded-lg px-3 py-2 text-sm outline-none border border-parchment/10 focus:border-lamp/40 transition-colors placeholder:text-faint"
        />
        <button
          type="button"
          onClick={submit}
          disabled={!value.trim()}
          className="flex-shrink-0 font-mono text-xs uppercase tracking-wide px-3 py-2 rounded-lg border border-parchment/10 text-muted hover:text-parchment hover:border-parchment/20 transition-colors disabled:opacity-40 disabled:hover:text-muted disabled:hover:border-parchment/10"
        >
          Add
        </button>
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-full bg-lamp/15 border border-lamp/40 text-lamp"
            >
              #{tag}
              <button
                type="button"
                onClick={() => onRemove(tag)}
                aria-label={`Remove ${tag}`}
                className="text-lamp/70 hover:text-crimson transition-colors"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// One AO3-style "button that expands into a box" — collapsed by default
// (unless `defaultOpen`), toggled by clicking its header.
function CollapsibleBox({
  title,
  badge,
  defaultOpen = false,
  children,
}: {
  title: string;
  badge?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border border-parchment/10 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-xs font-mono uppercase tracking-wide text-muted hover:text-parchment transition-colors bg-ink-soft"
      >
        <span className="flex items-center gap-1.5">
          {title}
          {badge !== undefined && (
            <span className="inline-flex items-center justify-center min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-lamp/20 text-lamp text-[10px] normal-case">
              {badge}
            </span>
          )}
        </span>
        <span className={`text-faint transition-transform ${open ? "rotate-180" : ""}`}>⌄</span>
      </button>
      {open && <div className="px-3 py-2.5 bg-ink/40">{children}</div>}
    </div>
  );
}