import Link from "next/link";
import { TAG_CATEGORIES } from "@/lib/tags";
import type { StoryTags } from "@/lib/types";

// Renders a story's tags (grouped by category, same order as the editor
// sidebar) as small clickable chips. Each chip links to /search?q=<tag> —
// the existing search already matches title/author/every tag category
// against `q`, so no extra filter param is needed here.
export default function TagChipList({ tags }: { tags: StoryTags }) {
  return (
    <div className="space-y-2 mb-8">
      {TAG_CATEGORIES.map(({ key, label }) => {
        const values = tags[key];
        if (values.length === 0) return null;
        return (
          <div key={key} className="flex flex-wrap items-baseline gap-2">
            <span className="font-mono text-[10px] uppercase tracking-wide text-faint">
              {label}:
            </span>
            {values.map((tag) => (
              <Link
                key={tag}
                href={`/search?q=${encodeURIComponent(tag)}`}
                className="text-xs font-mono text-muted border border-parchment/10 rounded-md px-2 py-0.5 hover:text-lamp hover:border-lamp/30 transition-colors"
              >
                #{tag}
              </Link>
            ))}
          </div>
        );
      })}
    </div>
  );
}
