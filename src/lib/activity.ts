import { Story } from "./types";

export type ActivityDay = {
  date: Date;
  level: 0 | 1 | 2 | 3;
};

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
