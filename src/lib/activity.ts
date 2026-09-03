import { Story } from "./types";

export type ActivityDay = {
  date: Date;
  level: 0 | 1 | 2 | 3;
};

// Subtracts `days` whole days from a "YYYY-MM-DD" string, returning
// another "YYYY-MM-DD" string. Pure date-string arithmetic (via
// Date.UTC, used only as a calendar calculator, not a real timezone) —
// the same approach StoryContext.tsx's daysBetween() uses, so streak
// day-math stays consistent everywhere it's computed from these stored
// local-calendar-date strings.
function dateStringMinusDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - days);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/**
 * Total number of distinct calendar days the user has written on, across
 * every story — not the longest single-story streak. Each story's streak
 * is an unbroken run of consecutive days ending on lastWriteDate, so it
 * can be safely walked backward day-by-day without gaps; those days are
 * collected into a Set (keyed by "YYYY-MM-DD") so days shared by more
 * than one story's streak only count once, then the Set's size is the
 * answer.
 */
export function totalWritingDays(stories: Story[]): number {
  const days = new Set<string>();

  stories.forEach((s) => {
    if (!s.streak || !s.lastWriteDate) return;
    for (let i = 0; i < s.streak; i++) {
      days.add(dateStringMinusDays(s.lastWriteDate, i));
    }
  });

  return days.size;
}

/**
 * Builds a simple day-by-day activity signal for the last `days` days.
 * Combines each story's exact last-updated day with the tail of its streak,
 * so the heatmap reflects both real edits and ongoing streaks.
 */
export function buildActivity(stories: Story[], days = 14): ActivityDay[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const counts = new Array(days).fill(0);

  stories.forEach((s) => {
    if (s.streak) {
      for (let i = 0; i < Math.min(s.streak, days); i++) {
        counts[days - 1 - i] += 1;
      }
    }
    const updated = new Date(s.updatedAt);
    updated.setHours(0, 0, 0, 0);
    const diffDays = Math.round((today.getTime() - updated.getTime()) / 86_400_000);
    if (diffDays >= 0 && diffDays < days) {
      counts[days - 1 - diffDays] += 1;
    }
  });

  const max = Math.max(1, ...counts);

  return counts.map((c, i) => {
    const date = new Date(today);
    date.setDate(date.getDate() - (days - 1 - i));
    const level = c === 0 ? 0 : Math.min(3, Math.ceil((c / max) * 3));
    return { date, level: level as ActivityDay["level"] };
  });
}