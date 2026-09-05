"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import PublicStoryCard from "@/components/PublicStoryCard";
import { useAuth } from "@/lib/AuthContext";
import { TagCategory } from "@/lib/types";
import { TAG_CATEGORIES, flattenStoryTags, tagColumnsToStoryTags } from "@/lib/tags";
import { matchesStoryQuery } from "@/lib/search";
import { searchUsers, FriendProfile } from "@/lib/friends";
import { FollowStatus, getFollowStatus, followAuthor, unfollowAuthor } from "@/lib/follows";
import type { AuthorInfo, PublicStoryRow } from "@/components/SearchBar";

export type SearchTab = "story" | "user";

type SortOption = "newest" | "views" | "likes";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "views", label: "Most viewed" },
  { value: "likes", label: "Most liked" },
];

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04, delayChildren: 0.02 } },
};

const cardFade = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" as const } },
};

// The panel that opens from SearchBar's "Advanced search" toggle — a
// "Story" tab (everything DiscoverSection's filters used to be: word
// count range, sort, and the four tag-category chip lists) and a "User"
// tab (searches profiles by name instead of stories).
export default function AdvancedSearchPanel({
  query,
  activeTab,
  onTabChange,
  stories,
  authors,
  storiesLoading,
}: {
  query: string;
  activeTab: SearchTab;
  onTabChange: (tab: SearchTab) => void;
  stories: PublicStoryRow[];
  authors: Record<string, AuthorInfo>;
  storiesLoading: boolean;
}) {
  return (
    <div>
      <div className="flex items-center gap-1 mb-4 border-b border-parchment/10">
        {(
          [
            { key: "story", label: "Story" },
            { key: "user", label: "User" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => onTabChange(tab.key)}
            className={`px-3.5 py-2 text-xs font-mono uppercase tracking-wide border-b-2 -mb-px transition-colors ${
              activeTab === tab.key
                ? "border-lamp text-lamp"
                : "border-transparent text-muted hover:text-parchment"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "story" ? (
        <StoryFilterTab
          query={query}
          stories={stories}
          authors={authors}
          loading={storiesLoading}
        />
      ) : (
        <UserSearchTab query={query} />
      )}
    </div>
  );
}

// ---- Story tab -------------------------------------------------------

function StoryFilterTab({
  query,
  stories,
  authors,
  loading,
}: {
  query: string;
  stories: PublicStoryRow[];
  authors: Record<string, AuthorInfo>;
  loading: boolean;
}) {
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [minWords, setMinWords] = useState("");
  const [maxWords, setMaxWords] = useState("");
  const [selectedTags, setSelectedTags] = useState<Record<TagCategory, string[]>>({
    fandoms: [],
    relationships: [],
    characters: [],
    additionalTags: [],
  });
  // Free-text include/exclude tags the user types in themselves, rather
  // than picking from the popular-tag chip lists below — lets someone
  // filter by a tag that isn't (yet) common enough to show up there.
  // Not tied to a category: matched against a story's full flattened tag
  // list, case-insensitively.
  const [includeTagInput, setIncludeTagInput] = useState("");
  const [excludeTagInput, setExcludeTagInput] = useState("");
  const [customIncludeTags, setCustomIncludeTags] = useState<string[]>([]);
  const [customExcludeTags, setCustomExcludeTags] = useState<string[]>([]);

  const storyTags = useMemo(() => {
    const map = new Map<string, ReturnType<typeof tagColumnsToStoryTags>>();
    stories.forEach((s) => map.set(s.id, tagColumnsToStoryTags(s)));
    return map;
  }, [stories]);

  // Popular values per category, for the 4 filter chip lists — same
  // "count everything, sort by frequency" approach DiscoverSection used.
  const tagsByCategory = useMemo(() => {
    const counts: Record<TagCategory, Map<string, number>> = {
      fandoms: new Map(),
      relationships: new Map(),
      characters: new Map(),
      additionalTags: new Map(),
    };
    stories.forEach((s) => {
      const tags = storyTags.get(s.id);
      if (!tags) return;
      TAG_CATEGORIES.forEach(({ key }) => {
        tags[key].forEach((t) => counts[key].set(t, (counts[key].get(t) ?? 0) + 1));
      });
    });
    const result = {} as Record<TagCategory, string[]>;
    TAG_CATEGORIES.forEach(({ key }) => {
      result[key] = [...counts[key].entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([tag]) => tag);
    });
    return result;
  }, [stories, storyTags]);

  function toggleTag(category: TagCategory, tag: string) {
    setSelectedTags((prev) => ({
      ...prev,
      [category]: prev[category].includes(tag)
        ? prev[category].filter((t) => t !== tag)
        : [...prev[category], tag],
    }));
  }

  const totalSelected = TAG_CATEGORIES.reduce(
    (sum, { key }) => sum + selectedTags[key].length,
    0
  );

  // Adds a trimmed, deduplicated (case-insensitive) custom tag to either
  // list, ignoring blanks and repeats.
  function addCustomTag(list: "include" | "exclude", raw: string) {
    const tag = raw.trim();
    if (!tag) return;
    const setter = list === "include" ? setCustomIncludeTags : setCustomExcludeTags;
    setter((prev) => (prev.some((t) => t.toLowerCase() === tag.toLowerCase()) ? prev : [...prev, tag]));
  }

  function removeCustomTag(list: "include" | "exclude", tag: string) {
    const setter = list === "include" ? setCustomIncludeTags : setCustomExcludeTags;
    setter((prev) => prev.filter((t) => t !== tag));
  }

  const min = minWords.trim() ? Number(minWords) : null;
  const max = maxWords.trim() ? Number(maxWords) : null;
  const q = query.toLowerCase();
  // Mirrors UserSearchTab: no query means no results shown at all, not
  // "show everything". Word-count/sort/tag filters stay visible and
  // interactive with an empty query (so a visitor can set them up before
  // typing), but they never produce a grid on their own.
  const hasQuery = q.length > 0;

  // Same matching rules as SearchBar's quick dropdown and the /search
  // page: title, author name, or any of the four tag categories — plus
  // the word-count range and selected tags.
  const filtered = stories.filter((s) => {
    const tags = storyTags.get(s.id);
    const matchesQuery = hasQuery && matchesStoryQuery(s, q, authors[s.owner_id]?.username, tags);
    // AND across (and within) categories: every selected tag, in every
    // selected category, must be present on the story.
    const matchesTags = TAG_CATEGORIES.every(({ key }) =>
      selectedTags[key].every((t) => tags?.[key].includes(t) ?? false)
    );

    // User-typed tags aren't scoped to a category, so they're checked
    // against the story's full flattened tag list instead — every custom
    // "include" tag must appear somewhere, and no custom "exclude" tag
    // may appear anywhere, both case-insensitively.
    const flatTags = (tags ? flattenStoryTags(tags) : []).map((t) => t.toLowerCase());
    const matchesCustomInclude = customIncludeTags.every((t) => flatTags.includes(t.toLowerCase()));
    const matchesCustomExclude = customExcludeTags.every((t) => !flatTags.includes(t.toLowerCase()));

    const wordCount = s.word_count ?? 0;
    const matchesWordCount = (min === null || wordCount >= min) && (max === null || wordCount <= max);
    return (
      matchesQuery &&
      matchesTags &&
      matchesCustomInclude &&
      matchesCustomExclude &&
      matchesWordCount
    );
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "views") return (b.view_count ?? 0) - (a.view_count ?? 0);
    if (sortBy === "likes") return (b.like_count ?? 0) - (a.like_count ?? 0);
    // "newest": published_at if it has one, else created_at.
    const aTime = new Date(a.published_at ?? a.created_at).getTime();
    const bTime = new Date(b.published_at ?? b.created_at).getTime();
    return bTime - aTime;
  });

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <div>
          <label className="block font-mono text-[10px] uppercase tracking-wide text-muted mb-1.5">
            Min words
          </label>
          <input
            type="number"
            min={0}
            value={minWords}
            onChange={(e) => setMinWords(e.target.value)}
            placeholder="0"
            className="w-full bg-ink-soft rounded-lg px-3 py-2 text-sm outline-none border border-parchment/10 focus:border-lamp/40 transition-colors placeholder:text-faint"
          />
        </div>
        <div>
          <label className="block font-mono text-[10px] uppercase tracking-wide text-muted mb-1.5">
            Max words
          </label>
          <input
            type="number"
            min={0}
            value={maxWords}
            onChange={(e) => setMaxWords(e.target.value)}
            placeholder="No limit"
            className="w-full bg-ink-soft rounded-lg px-3 py-2 text-sm outline-none border border-parchment/10 focus:border-lamp/40 transition-colors placeholder:text-faint"
          />
        </div>
        <div>
          <label className="block font-mono text-[10px] uppercase tracking-wide text-muted mb-1.5">
            Sort by
          </label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="w-full bg-ink-soft rounded-lg px-3 py-2 text-sm outline-none border border-parchment/10 focus:border-lamp/40 transition-colors"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
        <CustomTagBox
          label="Include tags"
          hint="Only show stories tagged with these."
          placeholder="Add a tag to include..."
          value={includeTagInput}
          onValueChange={setIncludeTagInput}
          tags={customIncludeTags}
          onAdd={(tag) => addCustomTag("include", tag)}
          onRemove={(tag) => removeCustomTag("include", tag)}
        />
        <CustomTagBox
          label="Exclude tags"
          hint="Hide stories tagged with these."
          placeholder="Add a tag to exclude..."
          value={excludeTagInput}
          onValueChange={setExcludeTagInput}
          tags={customExcludeTags}
          onAdd={(tag) => addCustomTag("exclude", tag)}
          onRemove={(tag) => removeCustomTag("exclude", tag)}
        />
      </div>

      {TAG_CATEGORIES.some(({ key }) => tagsByCategory[key].length > 0) && (
        <div className="mb-5 space-y-3">
          {TAG_CATEGORIES.map(({ key, label }) => {
            const options = tagsByCategory[key];
            if (options.length === 0) return null;
            return (
              <div key={key}>
                <p className="font-mono text-[10px] uppercase tracking-wide text-muted mb-2">
                  {label}
                </p>
                <div className="flex flex-wrap gap-2">
                  {options.map((tag) => {
                    const active = selectedTags[key].includes(tag);
                    return (
                      <button
                        key={tag}
                        onClick={() => toggleTag(key, tag)}
                        className={`text-xs font-mono px-2.5 py-1 rounded-full border transition-colors ${
                          active
                            ? "bg-lamp/15 border-lamp/40 text-lamp"
                            : "bg-ink-soft border-parchment/10 text-muted hover:text-parchment hover:border-parchment/20"
                        }`}
                      >
                        #{tag}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {totalSelected > 0 && (
            <button
              onClick={() =>
                setSelectedTags({
                  fandoms: [],
                  relationships: [],
                  characters: [],
                  additionalTags: [],
                })
              }
              className="text-xs font-mono px-2.5 py-1 text-faint hover:text-crimson transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {(customIncludeTags.length > 0 || customExcludeTags.length > 0) && (
        <div className="mb-5">
          <button
            onClick={() => {
              setCustomIncludeTags([]);
              setCustomExcludeTags([]);
            }}
            className="text-xs font-mono px-2.5 py-1 text-faint hover:text-crimson transition-colors"
          >
            Clear custom tags
          </button>
        </div>
      )}

      {!hasQuery && (
        <p className="text-muted text-sm py-8 text-center">
          Start typing to search stories…
        </p>
      )}

      {hasQuery && loading && (
        <p className="text-muted text-sm py-8 text-center">Loading stories…</p>
      )}

      {hasQuery && !loading && sorted.length === 0 && (
        <p className="text-muted text-sm py-8 text-center">No results found.</p>
      )}

      {hasQuery && !loading && sorted.length > 0 && (
        <motion.div
          key={`${query}-${sortBy}-${minWords}-${maxWords}-${TAG_CATEGORIES.map(({ key }) => selectedTags[key].join(",")).join("|")}-${customIncludeTags.join(",")}-${customExcludeTags.join(",")}`}
          initial="hidden"
          animate="show"
          variants={stagger}
          className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[55vh] overflow-y-auto custom-scrollbar pr-1"
        >
          {sorted.map((story) => (
            <motion.div key={story.id} variants={cardFade} className="h-full">
              <PublicStoryCard
                story={{
                  id: story.id,
                  title: story.title,
                  description: story.description,
                  tags: storyTags.get(story.id),
                  viewCount: story.view_count,
                  likeCount: story.like_count,
                  coverImageUrl: story.cover_image_url,
                }}
                authorUsername={authors[story.owner_id]?.username}
              />
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}

// A labeled free-text tag input with an "Add" button/Enter-to-add, plus
// the currently added tags rendered as removable chips underneath. Used
// twice in StoryFilterTab — once for user-typed "include" tags, once for
// "exclude" — so someone can filter by a tag that isn't (or isn't yet)
// popular enough to show up in the category chip lists above.
function CustomTagBox({
  label,
  hint,
  placeholder,
  value,
  onValueChange,
  tags,
  onAdd,
  onRemove,
}: {
  label: string;
  hint: string;
  placeholder: string;
  value: string;
  onValueChange: (v: string) => void;
  tags: string[];
  onAdd: (tag: string) => void;
  onRemove: (tag: string) => void;
}) {
  function submit() {
    onAdd(value);
    onValueChange("");
  }

  return (
    <div>
      <label className="block font-mono text-[10px] uppercase tracking-wide text-muted mb-1.5" title={hint}>
        {label}
      </label>
      <div className="flex gap-1.5">
        <input
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={placeholder}
          className="min-w-0 flex-1 bg-ink-soft rounded-lg px-3 py-2 text-sm outline-none border border-parchment/10 focus:border-lamp/40 transition-colors placeholder:text-faint"
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

// ---- User tab ----------------------------------------------------------

function UserSearchTab({ query }: { query: string }) {
  const { user } = useAuth();
  const [results, setResults] = useState<FriendProfile[]>([]);
  const [statuses, setStatuses] = useState<Record<string, FollowStatus>>({});
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!user || !query) {
        setResults([]);
        setStatuses({});
        return;
      }

      setLoading(true);
      const profiles = await searchUsers(query, user.id);
      if (cancelled) return;
      setResults(profiles);
      setLoading(false);

      const entries = await Promise.all(
        profiles.map(async (p) => [p.id, await getFollowStatus(user.id, p.id)] as const)
      );
      if (!cancelled) setStatuses(Object.fromEntries(entries));
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [query, user]);

  if (!user) {
    return (
      <p className="text-muted text-sm py-8 text-center">
        <Link href="/login" className="text-lamp hover:underline">
          Log in
        </Link>{" "}
        to search for other writers.
      </p>
    );
  }

  async function refreshStatus(otherId: string) {
    const status = await getFollowStatus(user!.id, otherId);
    setStatuses((prev) => ({ ...prev, [otherId]: status }));
  }

  async function runAction(otherId: string, action: () => Promise<{ error?: string }>) {
    setBusyId(otherId);
    await action();
    await refreshStatus(otherId);
    setBusyId(null);
  }

  if (!query) {
    return (
      <p className="text-muted text-sm py-8 text-center">
        Start typing a name to find other writers.
      </p>
    );
  }

  if (loading) {
    return <p className="text-muted text-sm py-8 text-center">Searching…</p>;
  }

  if (results.length === 0) {
    return <p className="text-muted text-sm py-8 text-center">No results found.</p>;
  }

  return (
    <ul className="space-y-2 max-h-[55vh] overflow-y-auto custom-scrollbar pr-1">
      {results.map((profile) => {
        const status = statuses[profile.id];
        const busy = busyId === profile.id;

        return (
          <li
            key={profile.id}
            className="flex items-center justify-between gap-3 bg-ink-soft border border-parchment/10 rounded-lg px-3.5 py-2.5"
          >
            <Link href={`/profile/${profile.username}`} className="flex items-center gap-2.5 min-w-0">
              <span className="w-8 h-8 rounded-full bg-lamp/20 border border-lamp/40 text-lamp text-xs font-mono flex items-center justify-center overflow-hidden flex-shrink-0">
                {profile.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.avatarUrl}
                    alt={profile.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  profile.username.charAt(0).toUpperCase()
                )}
              </span>
              <span className="text-sm text-parchment truncate">{profile.username}</span>
            </Link>

            {!status ? null : status === "not-following" ? (
              <button
                disabled={busy}
                onClick={() => runAction(profile.id, () => followAuthor(user.id, profile.id))}
                className="flex-shrink-0 text-xs font-mono px-3 py-1.5 rounded-full bg-lamp/15 border border-lamp/30 text-lamp hover:bg-lamp/25 transition-colors disabled:opacity-60"
              >
                {busy ? "…" : "Follow"}
              </button>
            ) : (
              <button
                disabled={busy}
                title="Unfollow"
                onClick={() => runAction(profile.id, () => unfollowAuthor(user.id, profile.id))}
                className="group flex-shrink-0 text-xs font-mono px-3 py-1.5 rounded-full border border-lamp/30 text-lamp hover:bg-crimson/10 hover:border-crimson/30 hover:text-crimson transition-colors disabled:opacity-60"
              >
                {busy ? "…" : <>✓ Following<span className="hidden group-hover:inline"> · Unfollow</span></>}
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}