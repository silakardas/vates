"use client";

import type { Character } from "@/lib/types";

// Shows only characters the writer explicitly opted into (see the
// "Show this moodboard on the public story page" checkbox on the story
// map). Everything else about a character — description, connections,
// map position — stays workshop-only regardless of this flag.
export default function CharacterMoodboards({
  characters,
}: {
  characters: Character[] | null | undefined;
}) {
  const shown = (characters ?? []).filter(
    (c) => c.showMoodboardPublicly && (c.moodboard?.length ?? 0) > 0
  );

  if (shown.length === 0) return null;

  return (
    <section className="mt-10">
      <h2 className="font-serif text-xl mb-4">Character moodboards</h2>
      <div className="space-y-6">
        {shown.map((c) => (
          <div key={c.id}>
            <p className="text-sm mb-2">
              <span className="text-parchment">{c.name}</span>
              {c.role && <span className="text-faint"> · {c.role}</span>}
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1.5">
              {(c.moodboard ?? []).map((img) => (
                // eslint-disable-next-line @next/next/no-img-element -- user-uploaded, remote Supabase URL
                <img
                  key={img.id}
                  src={img.url}
                  alt=""
                  className="w-full aspect-square object-cover rounded-md border border-parchment/10"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}