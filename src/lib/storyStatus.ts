export type StoryStatus = "inProgress" | "onHold" | "completed";

export const STATUS_CONFIG: Record<
  StoryStatus,
  { label: string; color: string; ctaLabel: string }
> = {
  inProgress: { label: "In progress", color: "text-lamp", ctaLabel: "Continue" },
  onHold: { label: "On hold", color: "text-muted", ctaLabel: "Pick it back up" },
  completed: { label: "Completed", color: "text-completed", ctaLabel: "Reopen" },
};
