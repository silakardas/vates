"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Header from "@/components/Header";
import { useAuth } from "@/lib/AuthContext";
import { useStories } from "@/lib/StoryContext";
import { Story, totalWordCount } from "@/lib/types";
import { ALLOWED_AVATAR_TYPES, MAX_AVATAR_BYTES } from "@/lib/avatar";
import { STATUS_CONFIG } from "@/lib/storyStatus";
import { TAG_CATEGORIES } from "@/lib/tags";

// Turns editor HTML into clean, readable plain text for the .txt export.
function stripHtml(html: string): string {
  return html
    .replace(/<\/(p|div|h[1-6]|li)>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function buildReadableExport(userName: string, stories: Story[]): string {
  const lines: string[] = [];
  lines.push(`${userName}'s Stories`);
  lines.push(
    `Exported ${new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })}`
  );
  lines.push("=".repeat(60));
  lines.push("");

  stories.forEach((story) => {
    lines.push(story.title.toUpperCase());
    lines.push(
      `${
        story.type === "series"
          ? `Series · ${story.chapters.length} chapter${story.chapters.length === 1 ? "" : "s"}`
          : "One-shot"
      } · ${totalWordCount(story).toLocaleString("en-US")} words · ${STATUS_CONFIG[story.status].label}`
    );
    TAG_CATEGORIES.forEach(({ key, label }) => {
      const values = story.tags[key];
      if (values.length) lines.push(`${label}: ${values.map((t) => `#${t}`).join(" ")}`);
    });
    if (story.description) {
      lines.push("");
      lines.push(story.description);
    }
    lines.push("");
    lines.push("-".repeat(40));
    lines.push("");

    story.chapters.forEach((chapter, i) => {
      if (story.type === "series") {
        lines.push(`Chapter ${i + 1}: ${chapter.title}`);
        lines.push("");
      }
      lines.push(stripHtml(chapter.content) || "(empty)");
      lines.push("");
    });

    lines.push("");
    lines.push("=".repeat(60));
    lines.push("");
  });

  return lines.join("\n");
}

const GOAL_PRESETS = [200, 300, 500, 1000];
const TABS = ["Profile", "Writing", "Security", "Export"] as const;
type Tab = (typeof TABS)[number];

export default function SettingsPage() {
  const { user, updateProfile, updatePassword, updateAvatar, deleteAccount } = useAuth();
  const { stories } = useStories();
  const router = useRouter();

  const [tab, setTab] = useState<Tab>("Profile");

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [favoriteGenre, setFavoriteGenre] = useState("");
  const [recurringUniverse, setRecurringUniverse] = useState("");
  const [favoriteLine, setFavoriteLine] = useState("");
  const [dailyGoal, setDailyGoal] = useState(300);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setBio(user.bio ?? "");
      setFavoriteGenre(user.favoriteGenre ?? "");
      setRecurringUniverse(user.recurringUniverse ?? "");
      setFavoriteLine(user.favoriteLine ?? "");
      setDailyGoal(user.dailyGoal ?? 300);
    }
  }, [user]);

  if (!user) {
    return (
      <>
        <Header />
        <main className="px-5 sm:px-8 py-24 text-center">
          <p className="text-muted mb-4">You&apos;re not logged in.</p>
          <Link href="/login" className="text-lamp hover:underline text-sm">
            Go to login →
          </Link>
        </main>
      </>
    );
  }

  const totalWords = stories.reduce((sum, s) => sum + totalWordCount(s), 0);
  const streak = stories.reduce((max, s) => Math.max(max, s.streak ?? 0), 0);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    if (!name.trim()) {
      setError("Display name can't be empty.");
      return;
    }

    setSaving(true);
    const result = await updateProfile({
      name: name.trim(),
      dailyGoal,
      bio: bio.trim(),
      favoriteGenre: favoriteGenre.trim(),
      recurringUniverse: recurringUniverse.trim(),
      favoriteLine: favoriteLine.trim(),
    });
    setSaving(false);

    if (result.error) {
      setError(result.error);
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  async function handleAvatarPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_AVATAR_TYPES[file.type]) {
      setAvatarError("Please upload a JPG, PNG, WEBP, or GIF image.");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setAvatarError("Image must be under 5MB.");
      return;
    }

    setAvatarError(null);
    setAvatarUploading(true);
    const result = await updateAvatar(file);
    setAvatarUploading(false);
    if (result.error) setAvatarError(result.error);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords don't match.");
      return;
    }

    setPasswordSubmitting(true);
    const result = await updatePassword(newPassword);
    setPasswordSubmitting(false);

    if (result.error) {
      setPasswordError(result.error);
      return;
    }
    setPasswordSuccess(true);
    setNewPassword("");
    setConfirmPassword("");
    setTimeout(() => setPasswordSuccess(false), 1800);
  }

  async function handleDeleteAccount() {
    setDeleteError(null);
    if (deleteConfirmText !== "DELETE") {
      setDeleteError('Type "DELETE" to confirm.');
      return;
    }

    setDeleting(true);
    const result = await deleteAccount();
    setDeleting(false);

    if (result.error) {
      setDeleteError(result.error);
      return;
    }
    router.push("/");
  }

  function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleExportReadable() {
    const text = buildReadableExport(user!.name, stories);
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    downloadBlob(blob, `${user!.name.trim().replace(/\s+/g, "-").toLowerCase()}-stories-${new Date().toISOString().slice(0, 10)}.txt`);
  }

  function handleExportJson() {
    const payload = {
      exportedAt: new Date().toISOString(),
      user: { name: user!.name, email: user!.email },
      stories,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    downloadBlob(blob, `vates-export-${new Date().toISOString().slice(0, 10)}.json`);
  }

  return (
    <>
      <Header />
      <main className="text-parchment px-5 sm:px-8 py-16 max-w-5xl mx-auto">
        <h1 className="font-serif text-2xl mb-1">Settings</h1>
        <p className="text-sm text-muted mb-4 sm:mb-10">
          Manage your profile, writing goals, and account.
        </p>
        <Link
          href="/account"
          className="lg:hidden inline-block mb-6 text-xs text-faint hover:text-muted transition-colors"
        >
          ← Back to account
        </Link>

        <div className="flex flex-col lg:flex-row gap-6 lg:gap-10">
          {/* Sidebar */}
          <nav className="flex flex-row gap-2 overflow-x-auto pb-1 lg:pb-0 lg:flex-col lg:gap-1 lg:w-44 lg:flex-shrink-0">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-shrink-0 whitespace-nowrap text-left px-4 py-2.5 rounded-lg text-sm transition-colors lg:w-full ${
                  tab === t
                    ? "bg-lamp/15 text-lamp border border-lamp/30"
                    : "text-muted hover:text-parchment border border-transparent"
                }`}
              >
                {t}
              </button>
            ))}
            <Link
              href="/account"
              className="hidden lg:block mt-4 px-4 py-2.5 text-xs text-faint hover:text-muted transition-colors"
            >
              ← Back to account
            </Link>
          </nav>

          {/* Main panel */}
          <div className="flex-1 min-w-0 grid gap-8 lg:grid-cols-[1fr_280px]">
            <div className="bg-panel border border-parchment/10 rounded-xl px-6 py-6">
              {tab === "Profile" && (
                <form onSubmit={handleSave} className="space-y-6">
                  <div className="flex items-center gap-5">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={avatarUploading}
                      className="relative w-20 h-20 rounded-full bg-lamp/15 border border-lamp/30 text-lamp font-serif text-2xl flex items-center justify-center overflow-hidden group flex-shrink-0"
                    >
                      {user.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                      ) : (
                        user.name.charAt(0).toUpperCase()
                      )}
                      <span className="absolute inset-0 bg-ink/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[10px] font-mono text-parchment uppercase">
                        {avatarUploading ? "…" : "Change"}
                      </span>
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={Object.keys(ALLOWED_AVATAR_TYPES).join(",")}
                      onChange={handleAvatarPick}
                      className="hidden"
                    />
                    <div>
                      <p className="text-sm text-parchment">Profile photo</p>
                      {avatarError && <p className="text-xs text-red-400 mt-1">{avatarError}</p>}
                    </div>
                  </div>

                  <div>
                    <label className="block font-mono text-xs text-muted uppercase tracking-wide mb-2">
                      Display name
                    </label>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      maxLength={40}
                      className="w-full bg-ink-soft rounded-lg px-4 py-2.5 outline-none border border-parchment/10 focus:border-lamp/40 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block font-mono text-xs text-muted uppercase tracking-wide mb-2">
                      Email
                    </label>
                    <input
                      value={user.email}
                      disabled
                      className="w-full bg-ink-soft/50 rounded-lg px-4 py-2.5 outline-none border border-parchment/10 text-muted"
                    />
                  </div>

                  <div>
                    <label className="block font-mono text-xs text-muted uppercase tracking-wide mb-2">
                      Bio
                    </label>
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      maxLength={160}
                      rows={3}
                      placeholder="A line about what you write…"
                      className="w-full bg-ink-soft rounded-lg px-4 py-2.5 outline-none border border-parchment/10 focus:border-lamp/40 transition-colors resize-none"
                    />
                    <p className="text-[10px] font-mono text-faint mt-1">{bio.length}/160</p>
                  </div>

                  <div className="pt-2 border-t border-parchment/10">
                    <p className="font-mono text-[10px] uppercase tracking-wide text-faint mb-4 pt-4">
                      Writer identity
                    </p>

                    <div className="space-y-4">
                      <div>
                        <label className="block font-mono text-xs text-muted uppercase tracking-wide mb-2">
                          Favorite genre
                        </label>
                        <input
                          value={favoriteGenre}
                          onChange={(e) => setFavoriteGenre(e.target.value)}
                          maxLength={40}
                          placeholder="e.g. Gothic horror"
                          className="w-full bg-ink-soft rounded-lg px-4 py-2.5 outline-none border border-parchment/10 focus:border-lamp/40 transition-colors placeholder:text-faint"
                        />
                      </div>

                      <div>
                        <label className="block font-mono text-xs text-muted uppercase tracking-wide mb-2">
                          Recurring universe
                        </label>
                        <input
                          value={recurringUniverse}
                          onChange={(e) => setRecurringUniverse(e.target.value)}
                          maxLength={40}
                          placeholder="A world you keep coming back to"
                          className="w-full bg-ink-soft rounded-lg px-4 py-2.5 outline-none border border-parchment/10 focus:border-lamp/40 transition-colors placeholder:text-faint"
                        />
                      </div>

                      <div>
                        <label className="block font-mono text-xs text-muted uppercase tracking-wide mb-2">
                          Favorite line
                        </label>
                        <textarea
                          value={favoriteLine}
                          onChange={(e) => setFavoriteLine(e.target.value)}
                          maxLength={200}
                          rows={2}
                          placeholder="A line you wrote that still means something to you…"
                          className="w-full bg-ink-soft rounded-lg px-4 py-2.5 outline-none border border-parchment/10 focus:border-lamp/40 transition-colors resize-none placeholder:text-faint"
                        />
                        <p className="text-[10px] font-mono text-faint mt-1">{favoriteLine.length}/200</p>
                      </div>
                    </div>
                  </div>

                  {error && <p className="text-xs text-red-400">{error}</p>}
                  {saved && <p className="text-xs text-completed">Saved.</p>}

                  <button
                    type="submit"
                    disabled={saving}
                    className="bg-lamp text-ink text-sm font-semibold px-5 py-2.5 rounded-lg disabled:opacity-60"
                  >
                    {saving ? "Saving…" : "Save changes"}
                  </button>
                </form>
              )}

              {tab === "Writing" && (
                <form onSubmit={handleSave} className="space-y-4">
                  <label className="block font-mono text-xs text-muted uppercase tracking-wide mb-2">
                    Daily word goal
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={dailyGoal}
                    onChange={(e) => setDailyGoal(Number(e.target.value))}
                    className="w-full bg-ink-soft rounded-lg px-4 py-2.5 outline-none border border-parchment/10 focus:border-lamp/40 transition-colors"
                  />
                  <div className="flex flex-wrap gap-2">
                    {GOAL_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setDailyGoal(preset)}
                        className={`text-xs font-mono px-3 py-1.5 rounded-full border transition-colors ${
                          dailyGoal === preset
                            ? "bg-lamp/20 border-lamp/50 text-lamp"
                            : "border-parchment/10 text-muted hover:text-parchment hover:border-parchment/20"
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                  {error && <p className="text-xs text-red-400">{error}</p>}
                  {saved && <p className="text-xs text-completed">Saved.</p>}
                  <button
                    type="submit"
                    disabled={saving}
                    className="bg-lamp text-ink text-sm font-semibold px-5 py-2.5 rounded-lg disabled:opacity-60"
                  >
                    {saving ? "Saving…" : "Save changes"}
                  </button>
                </form>
              )}

              {tab === "Security" && (
                <form onSubmit={handlePasswordSubmit} className="space-y-3 max-w-sm">
                  <p className="font-mono text-[10px] uppercase tracking-wide text-muted mb-1">
                    Change password
                  </p>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New password"
                    className="w-full bg-ink-soft rounded-lg px-4 py-2.5 text-sm outline-none border border-parchment/10 focus:border-lamp/40 transition-colors placeholder:text-faint"
                  />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full bg-ink-soft rounded-lg px-4 py-2.5 text-sm outline-none border border-parchment/10 focus:border-lamp/40 transition-colors placeholder:text-faint"
                  />
                  {passwordError && <p className="text-xs text-red-400">{passwordError}</p>}
                  {passwordSuccess && <p className="text-xs text-green-400">Password updated.</p>}
                  <button
                    type="submit"
                    disabled={passwordSubmitting}
                    className="bg-lamp text-ink text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-60"
                  >
                    {passwordSubmitting ? "Saving…" : "Save password"}
                  </button>
                </form>
              )}

              {tab === "Security" && (
                <div className="max-w-sm mt-10 pt-8 border-t border-red-400/20">
                  <p className="font-mono text-[10px] uppercase tracking-wide text-red-400/80 mb-1">
                    Danger zone
                  </p>
                  <p className="text-sm text-muted leading-relaxed mb-4">
                    Deleting your account permanently removes your profile, every story and
                    chapter you&apos;ve written, and your avatar. This can&apos;t be undone.
                  </p>

                  {!deleteConfirmOpen ? (
                    <button
                      onClick={() => {
                        setDeleteConfirmOpen(true);
                        setDeleteError(null);
                        setDeleteConfirmText("");
                      }}
                      className="text-sm font-semibold px-4 py-2 rounded-lg border border-red-400/40 text-red-400 hover:bg-red-400/10 transition-colors"
                    >
                      Delete account
                    </button>
                  ) : (
                    <div className="space-y-3 bg-red-400/5 border border-red-400/20 rounded-lg p-4">
                      <p className="text-xs text-muted leading-relaxed">
                        Type <span className="font-mono text-parchment">DELETE</span> below to
                        confirm.
                      </p>
                      <input
                        type="text"
                        value={deleteConfirmText}
                        onChange={(e) => setDeleteConfirmText(e.target.value)}
                        placeholder="DELETE"
                        className="w-full bg-ink-soft rounded-lg px-4 py-2.5 text-sm outline-none border border-red-400/20 focus:border-red-400/50 transition-colors placeholder:text-faint"
                      />
                      {deleteError && <p className="text-xs text-red-400">{deleteError}</p>}
                      <div className="flex gap-2">
                        <button
                          onClick={handleDeleteAccount}
                          disabled={deleting}
                          className="bg-red-500 text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-60"
                        >
                          {deleting ? "Deleting…" : "Permanently delete"}
                        </button>
                        <button
                          onClick={() => setDeleteConfirmOpen(false)}
                          disabled={deleting}
                          className="text-sm px-4 py-2 rounded-lg border border-parchment/10 text-muted hover:text-parchment transition-colors disabled:opacity-60"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {tab === "Export" && (
                <div className="space-y-6 max-w-sm">
                  <div className="space-y-4">
                    <p className="font-mono text-[10px] uppercase tracking-wide text-muted mb-1">
                      Export your data
                    </p>
                    <p className="text-sm text-muted leading-relaxed">
                      Download every story and chapter you&apos;ve written as a clean, readable
                      text file — easy to open, print, or keep as a personal archive.
                    </p>
                    <button
                      onClick={handleExportReadable}
                      className="bg-lamp text-ink text-sm font-semibold px-5 py-2.5 rounded-lg"
                    >
                      Download {stories.length} {stories.length === 1 ? "story" : "stories"} (.txt)
                    </button>
                  </div>

                  <div className="pt-4 border-t border-parchment/10 space-y-2">
                    <p className="text-xs text-muted leading-relaxed">
                      Need the raw data instead — every chapter, version, and character as
                      structured JSON? Grab the full backup.
                    </p>
                    <button
                      onClick={handleExportJson}
                      className="text-xs font-mono text-muted hover:text-parchment underline underline-offset-2 transition-colors"
                    >
                      Download full backup (.json)
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Live preview + stats, replaces the blank panel */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="bg-panel border border-parchment/10 rounded-xl px-6 py-6 h-fit"
            >
              <p className="font-mono text-[10px] uppercase tracking-widest text-faint mb-5">
                Preview
              </p>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-lamp/15 border border-lamp/30 text-lamp font-serif text-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                  {user.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.avatarUrl} alt={name} className="w-full h-full object-cover" />
                  ) : (
                    (name || "?").charAt(0).toUpperCase()
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-serif text-parchment truncate">{name || "Unnamed"}</p>
                  <p className="text-xs text-faint truncate">{user.email}</p>
                </div>
              </div>
              <p className="text-sm text-muted italic leading-relaxed mb-6">
                {bio ? `"${bio}"` : "No bio yet — add one in the Profile tab."}
              </p>

              <div className="grid grid-cols-3 gap-2 text-center border-t border-parchment/10 pt-4">
                <div>
                  <p className="font-mono text-lamp text-lg">{stories.length}</p>
                  <p className="text-[10px] text-faint">stories</p>
                </div>
                <div>
                  <p className="font-mono text-lamp text-lg">{totalWords.toLocaleString("en-US")}</p>
                  <p className="text-[10px] text-faint">words</p>
                </div>
                <div>
                  <p className="font-mono text-lamp text-lg">{streak || "—"}</p>
                  <p className="text-[10px] text-faint">streak</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </main>
    </>
  );
}