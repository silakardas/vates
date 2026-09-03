"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import PublicStoryCard from "@/components/PublicStoryCard";
import { useAuth } from "@/lib/AuthContext";
import { TagCategory } from "@/lib/types";
import { TAG_CATEGORIES, tagColumnsToStoryTags } from "@/lib/tags";
import {
  FriendProfile,
  FriendStatus,
  getFriendStatus,
  removeFriendOrRequest,
  respondToFriendRequest,
  searchUsers,
  sendFriendRequest,
} from "@/lib/friends";
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

  const min = minWords.trim() ? Number(minWords) : null;
  const max = maxWords.trim() ? Number(maxWords) : null;
  const q = query.toLowerCase();

  // Same matching rules as the old DiscoverSection: title, author name,
  // fandom, or character — plus the word-count range and selected tags.
  const filtered = stories.filter((s) => {
    const tags = storyTags.get(s.id);
    const matchesQuery =
      !q ||
      s.title.toLowerCase().includes(q) ||
      (authors[s.owner_id]?.username.toLowerCase().includes(q) ?? false) ||
      (tags?.fandoms.some((t) => t.includes(q)) ?? false) ||
      (tags?.characters.some((t) => t.includes(q)) ?? false);
    // AND across (and within) categories: every selected tag, in every
    // selected category, must be present on the story.
    const matchesTags = TAG_CATEGORIES.every(({ key }) =>
      selectedTags[key].every((t) => tags?.[key].includes(t) ?? false)
    );
    const wordCount = s.word_count ?? 0;
    const matchesWordCount = (min === null || wordCount >= min) && (max === null || wordCount <= max);
    return matchesQuery && matchesTags && matchesWordCount;
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

      {loading && (
        <p className="text-muted text-sm py-8 text-center">Loading stories…</p>
      )}

      {!loading && sorted.length === 0 && (
        <p className="text-muted text-sm py-8 text-center">No results found.</p>
      )}

      {!loading && sorted.length > 0 && (
        <motion.div
          key={`${query}-${sortBy}-${minWords}-${maxWords}-${TAG_CATEGORIES.map(({ key }) => selectedTags[key].join(",")).join("|")}`}
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

// ---- User tab ----------------------------------------------------------

function UserSearchTab({ query }: { query: string }) {
  const { user } = useAuth();
  const [results, setResults] = useState<FriendProfile[]>([]);
  const [statuses, setStatuses] = useState<Record<string, FriendStatus>>({});
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
        profiles.map(async (p) => [p.id, await getFriendStatus(user.id, p.id)] as const)
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
    const status = await getFriendStatus(user!.id, otherId);
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

            {!status ? null : status.kind === "none" ? (
              <button
                disabled={busy}
                onClick={() => runAction(profile.id, () => sendFriendRequest(user.id, profile.id))}
                className="flex-shrink-0 text-xs font-mono px-3 py-1.5 rounded-full bg-lamp/15 border border-lamp/30 text-lamp hover:bg-lamp/25 transition-colors disabled:opacity-60"
              >
                {busy ? "…" : "Add"}
              </button>
            ) : status.kind === "outgoing" ? (
              <span className="flex-shrink-0 text-xs font-mono px-3 py-1.5 rounded-full border border-parchment/15 text-faint">
                Pending
              </span>
            ) : status.kind === "incoming" ? (
              <button
                disabled={busy}
                onClick={() =>
                  runAction(profile.id, () => respondToFriendRequest(status.requestId, "accepted"))
                }
                className="flex-shrink-0 text-xs font-mono px-3 py-1.5 rounded-full bg-lamp text-ink hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {busy ? "…" : "Accept"}
              </button>
            ) : (
              <button
                disabled={busy}
                title="Remove friend"
                onClick={() => runAction(profile.id, () => removeFriendOrRequest(status.requestId))}
                className="group flex-shrink-0 text-xs font-mono px-3 py-1.5 rounded-full border border-lamp/30 text-lamp hover:bg-crimson/10 hover:border-crimson/30 hover:text-crimson transition-colors disabled:opacity-60"
              >
                {busy ? "…" : <>✓ Friends<span className="hidden group-hover:inline"> · Remove</span></>}
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}