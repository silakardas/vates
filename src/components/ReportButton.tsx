"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/AuthContext";

const REPORT_REASONS = ["Spam", "Inappropriate content", "Copyright violation", "Other"] as const;

// Small "Report" trigger + compact reason dropdown, reused both for a
// whole story and for individual comments (pass whichever id applies —
// exactly one of the two — and story_reports.story_id/comment_id records
// which was flagged).
export default function ReportButton({
  storyId,
  commentId,
  className = "",
}: {
  storyId: string;
  commentId?: string;
  className?: string;
}) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function submitReport(reason: string) {
    setSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase.from("story_reports").insert({
      story_id: storyId,
      comment_id: commentId ?? null,
      reporter_id: user?.id ?? null,
      reason,
    });
    setSubmitting(false);

    if (error) {
      console.error("Failed to submit report:", error.message);
      setOpen(false);
      return;
    }
    setOpen(false);
    setDone(true);
  }

  if (done) {
    return (
      <span className={`text-xs font-mono text-faint ${className}`}>
        Reported — thanks
      </span>
    );
  }

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="text-xs font-mono text-faint hover:text-crimson transition-colors whitespace-nowrap"
      >
        ⚑ Report
      </button>

      {open && (
        <>
          {/* Invisible backdrop so a click anywhere else closes the dropdown. */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-20 w-44 bg-ink-soft border border-parchment/10 rounded-lg shadow-xl py-1">
            <p className="px-3 py-1 text-[10px] font-mono uppercase tracking-wide text-faint">
              Why report this?
            </p>
            {REPORT_REASONS.map((reason) => (
              <button
                key={reason}
                disabled={submitting}
                onClick={() => submitReport(reason)}
                className="w-full text-left px-3 py-1.5 text-xs text-muted hover:text-parchment hover:bg-parchment/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {reason}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}