"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { AuthorInfo, PublicStoryRow } from "@/lib/search";

// Loads every publicly-shared story (plus their authors' usernames) the
// first time `enabled` becomes true, then never again — shared by
// SearchBar (which only wants to fetch once a search is actually
// triggered, or the Story tab is opened) and the /search results page
// (which wants it immediately). Relies on the "stories are
// public-readable" RLS policy, so it works for anon/logged-out visitors
// too.
export function useSearchStories(enabled: boolean) {
  const [stories, setStories] = useState<PublicStoryRow[]>([]);
  const [authors, setAuthors] = useState<Record<string, AuthorInfo>>({});
  const [loading, setLoading] = useState(false);
  const requestedRef = useRef(false);

  useEffect(() => {
    if (!enabled || requestedRef.current) return;
    requestedRef.current = true;

    let cancelled = false;
    const supabase = createClient();

    async function load() {
      setLoading(true);

      const { data: storyRows, error: storiesError } = await supabase
        .from("stories")
        .select(
          "id, owner_id, title, description, fandoms, relationships, tag_characters, additional_tags, tags, view_count, like_count, word_count, status, created_at, published_at"
        )
        .eq("is_public", true)
        .order("published_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });

      if (cancelled) return;

      if (storiesError || !storyRows) {
        console.error("Failed to load public stories:", storiesError?.message);
        setStories([]);
        setAuthors({});
        setLoading(false);
        return;
      }

      const ownerIds = [...new Set(storyRows.map((s) => s.owner_id))];
      let authorMap: Record<string, AuthorInfo> = {};

      if (ownerIds.length > 0) {
        const { data: profileRows, error: profilesError } = await supabase
          .from("profiles")
          .select("id, username")
          .in("id", ownerIds);

        if (profilesError) {
          console.error("Failed to load authors:", profilesError.message);
        } else {
          authorMap = Object.fromEntries(
            (profileRows ?? []).map((p) => [
              p.id as string,
              { username: p.username as string },
            ])
          );
        }
      }

      if (!cancelled) {
        setStories(storyRows as PublicStoryRow[]);
        setAuthors(authorMap);
        setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return { stories, authors, loading };
}