// Small "N-day streak" badge: a subtle flame icon + count in a pill,
// using the lamp accent. Shares the same flame path as the animated
// icon in ContinueCard's header for visual consistency, but rendered
// thin-stroke/static here — same restrained visual language as the
// pin icon in StoryRow (small, thin stroke, subtle until it matters).
// Renders nothing when there's no streak yet, same as the callers'
// previous inline checks.
export default function StreakBadge({
  streak,
  className = "",
}: {
  streak?: number;
  className?: string;
}) {
  if (!streak) return null;

  return (
    <span
      title={`${streak}-day streak`}
      className={`inline-flex items-center gap-1 text-[11px] font-mono text-lamp bg-lamp/10 border border-lamp/25 rounded-full px-2 py-0.5 ${className}`}
    >
      <svg
        width="11"
        height="11"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 2c1 4-3 5-3 9a3 3 0 006 0c0-1-1-2-1-3 2 1 3 3 3 5a5 5 0 01-10 0c0-5 4-6 5-11z" />
      </svg>
      {streak}
    </span>
  );
}