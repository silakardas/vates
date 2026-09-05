"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useAuth } from "@/lib/AuthContext";
import { createClient } from "@/lib/supabase/client";

type ReportStatus = "pending" | "dismissed" | "actioned";
const TABS: { key: ReportStatus | "all"; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "dismissed", label: "Dismissed" },
  { key: "actioned", label: "Actioned" },
  { key: "all", label: "All" },
];

// story_reports.story_id/comment_id both reference tables in the same
// (public) schema, so PostgREST can embed them directly. reporter_id,
// stories.owner_id, and story_comments.user_id all reference
// auth.users instead — a different schema PostgREST can't embed across
// — so those three come back as bare ids and get resolved to usernames
// with a single separate `profiles` lookup below (same pattern as
// useStoryReader.ts's comment authors).
type ReportRow = {
  id: string;
  story_id: string;
  comment_id: string | null;
  reporter_id: string | null;
  reason: string;
  status: ReportStatus;
  created_at: string;
  stories: { id: string; title: string; owner_id: string; is_public: boolean | null } | null;
  story_comments: { id: string; body: string; user_id: string } | null;
};

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const STATUS_STYLE: Record<ReportStatus, string> = {
  pending: "text-lamp border-lamp/30 bg-lamp/10",
  dismissed: "text-faint border-parchment/15 bg-parchment/5",
  actioned: "text-completed border-completed/30 bg-completed/10",
};

export default function AdminReportsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [tab, setTab] = useState<ReportStatus | "all">("pending");
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [usernames, setUsernames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadReports = useCallback(
    async (status: ReportStatus | "all") => {
      setLoading(true);
      setErrorMsg(null);
      const supabase = createClient();

      let query = supabase
        .from("story_reports")
        .select(
          "id, story_id, comment_id, reporter_id, reason, status, created_at, stories ( id, title, owner_id, is_public ), story_comments ( id, body, user_id )"
        )
        .order("created_at", { ascending: false });

      if (status !== "all") query = query.eq("status", status);

      const { data, error } = await query;

      if (error) {
        // Most likely cause: this account isn't actually an admin, so
        // the is_admin()-gated select policy returns nothing/errors
        // instead of the expected rows.
        console.error("Failed to load reports:", error.message);
        setErrorMsg("Couldn't load reports. You may not have admin access.");
        setReports([]);
        setLoading(false);
        return;
      }

      const rows = (data ?? []) as unknown as ReportRow[];
      setReports(rows);

      const userIds = new Set<string>();
      rows.forEach((r) => {
        if (r.reporter_id) userIds.add(r.reporter_id);
        if (r.stories?.owner_id) userIds.add(r.stories.owner_id);
        if (r.story_comments?.user_id) userIds.add(r.story_comments.user_id);
      });

      if (userIds.size > 0) {
        const { data: profileRows, error: profilesError } = await supabase
          .from("profiles")
          .select("id, username")
          .in("id", [...userIds]);
        if (profilesError) {
          console.error("Failed to load usernames:", profilesError.message);
        } else {
          setUsernames(
            Object.fromEntries((profileRows ?? []).map((p) => [p.id as string, p.username as string]))
          );
        }
      } else {
        setUsernames({});
      }

      setLoading(false);
    },
    []
  );

  useEffect(() => {
    if (!authLoading && (!user || !user.isAdmin)) {
      router.replace("/");
      return;
    }
    if (user?.isAdmin) loadReports(tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, tab]);

  async function markStatus(reportId: string, status: ReportStatus) {
    const supabase = createClient();
    const { error } = await supabase
      .from("story_reports")
      .update({ status, reviewed_at: new Date().toISOString(), reviewed_by: user?.id })
      .eq("id", reportId);
    if (error) console.error("Failed to update report:", error.message);
  }

  async function handleDismiss(report: ReportRow) {
    setActioningId(report.id);
    await markStatus(report.id, "dismissed");
    await loadReports(tab);
    setActioningId(null);
  }

  async function handleHideStory(report: ReportRow) {
    if (!report.stories) return;
    setActioningId(report.id);
    const supabase = createClient();
    const { error } = await supabase
      .from("stories")
      .update({ is_public: false })
      .eq("id", report.story_id);
    if (error) {
      console.error("Failed to hide story:", error.message);
    } else {
      await markStatus(report.id, "actioned");
    }
    await loadReports(tab);
    setActioningId(null);
  }

  async function handleDeleteComment(report: ReportRow) {
    if (!report.comment_id) return;
    if (!window.confirm("Delete this comment permanently? This can't be undone.")) return;
    setActioningId(report.id);
    const supabase = createClient();
    // Deleting the comment cascades away this report row too
    // (story_reports.comment_id is on delete cascade) — no separate
    // status update needed.
    const { error } = await supabase.from("story_comments").delete().eq("id", report.comment_id);
    if (error) console.error("Failed to delete comment:", error.message);
    await loadReports(tab);
    setActioningId(null);
  }

  async function handleDeleteStory(report: ReportRow) {
    if (!window.confirm("Delete this entire story permanently? This can't be undone.")) return;
    setActioningId(report.id);
    const supabase = createClient();
    // Cascades away comments, likes, reading progress, and any other
    // reports on this story (story_reports.story_id is on delete
    // cascade too).
    const { error } = await supabase.from("stories").delete().eq("id", report.story_id);
    if (error) console.error("Failed to delete story:", error.message);
    await loadReports(tab);
    setActioningId(null);
  }

  if (authLoading || (!user && !authLoading)) {
    return (
      <>
        <Header showSearch={false} />
        <div className="text-parchment px-5 py-14 sm:px-8">
          <p className="text-muted text-sm">Loading…</p>
        </div>
        <Footer />
      </>
    );
  }

  if (!user?.isAdmin) return null; // redirecting

  return (
    <>
      <Header showSearch={false} />
      <main className="text-parchment px-5 py-10 sm:px-8 sm:py-14 max-w-3xl mx-auto">
        <p className="font-mono text-xs text-muted uppercase tracking-wide mb-2">Admin</p>
        <h1 className="font-serif text-2xl mb-6">Reports</h1>

        <div className="flex gap-1 mb-8 border-b border-parchment/10 pb-px">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 py-2 text-xs font-mono uppercase tracking-wide transition-colors border-b-2 -mb-px ${
                tab === t.key
                  ? "text-lamp border-lamp"
                  : "text-faint border-transparent hover:text-muted"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading && <p className="text-muted text-sm">Loading reports…</p>}
        {!loading && errorMsg && <p className="text-crimson text-sm">{errorMsg}</p>}
        {!loading && !errorMsg && reports.length === 0 && (
          <p className="text-muted text-sm">Nothing here.</p>
        )}

        <div className="space-y-4">
          {reports.map((report) => {
            const isBusy = actioningId === report.id;
            const reporterName = report.reporter_id
              ? usernames[report.reporter_id] ?? "unknown"
              : "anonymous";
            const storyTitle = report.stories?.title ?? "(deleted story)";
            const storyOwner = report.stories?.owner_id
              ? usernames[report.stories.owner_id] ?? "unknown"
              : "unknown";

            return (
              <div
                key={report.id}
                className="bg-ink-soft border border-parchment/10 rounded-lg p-4 sm:p-5 space-y-3"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-[10px] font-mono uppercase tracking-wide border rounded-full px-2 py-0.5 ${STATUS_STYLE[report.status]}`}
                    >
                      {report.status}
                    </span>
                    <span className="text-[10px] font-mono uppercase tracking-wide text-faint border border-parchment/15 rounded-full px-2 py-0.5">
                      {report.reason}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-faint">
                    {timeAgo(report.created_at)} · reported by @{reporterName}
                  </span>
                </div>

                {report.story_comments ? (
                  <div className="text-sm">
                    <p className="text-faint text-xs font-mono mb-1">
                      Comment by @{usernames[report.story_comments.user_id] ?? "unknown"} on{" "}
                      <Link
                        href={`/discover/${report.story_id}`}
                        className="text-lamp hover:underline"
                      >
                        {storyTitle}
                      </Link>
                    </p>
                    <p className="text-parchment/90 border-l-2 border-parchment/15 pl-3">
                      {report.story_comments.body}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm">
                    <span className="text-faint text-xs font-mono">Story by @{storyOwner}: </span>
                    <Link
                      href={`/discover/${report.story_id}`}
                      className="text-lamp hover:underline font-serif"
                    >
                      {storyTitle}
                    </Link>
                    {report.stories && report.stories.is_public === false && (
                      <span className="ml-2 text-[10px] font-mono text-faint">(hidden)</span>
                    )}
                  </p>
                )}

                {report.status === "pending" && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      disabled={isBusy}
                      onClick={() => handleDismiss(report)}
                      className="text-xs font-mono text-muted hover:text-parchment border border-parchment/15 rounded-full px-3 py-1 transition-colors disabled:opacity-40"
                    >
                      Dismiss
                    </button>
                    {report.stories?.is_public !== false && (
                      <button
                        disabled={isBusy || !report.stories}
                        onClick={() => handleHideStory(report)}
                        className="text-xs font-mono text-lamp hover:text-lamp-bright border border-lamp/30 rounded-full px-3 py-1 transition-colors disabled:opacity-40"
                      >
                        Hide story
                      </button>
                    )}
                    {report.comment_id && (
                      <button
                        disabled={isBusy}
                        onClick={() => handleDeleteComment(report)}
                        className="text-xs font-mono text-crimson hover:text-crimson border border-crimson/30 rounded-full px-3 py-1 transition-colors disabled:opacity-40"
                      >
                        Delete comment
                      </button>
                    )}
                    <button
                      disabled={isBusy}
                      onClick={() => handleDeleteStory(report)}
                      className="text-xs font-mono text-crimson hover:text-crimson border border-crimson/30 rounded-full px-3 py-1 transition-colors disabled:opacity-40"
                    >
                      Delete story
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>
      <Footer />
    </>
  );
}
