"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/AuthContext";
import { useStories } from "@/lib/StoryContext";
import { useSettingsModal } from "@/lib/SettingsModalContext";
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

// The full Settings experience, opened from anywhere (Header, or the
// signed-in user's own /profile/[userId] page) via
// useSettingsModal().openSettings(), and mounted once in the root layout.
// There's no separate /account or /settings route — this modal is the
// entire settings surface, layered over whichever page opened it.
export default function SettingsModal() {
  const { user, updateProfile, updateUsername, updatePassword, updateAvatar, deleteAccount } =
    useAuth();
  const { stories } = useStories();
  const { isOpen, closeSettings, initialTab } = useSettingsModal();
  const router = useRouter();

  const [tab, setTab] = useState<Tab>("Profile");

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [favoriteLine, setFavoriteLine] = useState("");
  const [showWriterIdentity, setShowWriterIdentity] = useState(false);
  const [dailyGoal, setDailyGoal] = useState(300);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [username, setUsername] = useState("");
  const [usernameSaving, setUsernameSaving] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [usernameSaved, setUsernameSaved] = useState(false);

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
      setFavoriteLine(user.favoriteLine ?? "");
      setShowWriterIdentity(user.showWriterIdentity ?? false);
      setDailyGoal(user.dailyGoal ?? 300);
      setUsername(user.username ?? "");
    }
  }, [user]);

  // Land on whichever tab the caller asked for (e.g. the "Add it in
  // Settings →" prompt on the own profile page can jump straight to the
  // right one), and reset the delete-confirm flow every time the modal
  // reopens.
  useEffect(() => {
    if (isOpen) {
      if (initialTab && (TABS as readonly string[]).includes(initialTab)) {
        setTab(initialTab as Tab);
      }
      setDeleteConfirmOpen(false);
      setDeleteConfirmText("");
      setDeleteError(null);
    }
  }, [isOpen, initialTab]);

  if (!isOpen || !user) return null;

  const totalWords = stories.reduce((sum, s) => sum + totalWordCount(s), 0);
  const streak = stories.reduce((max, s) => Math.max(max, s.streak ?? 0), 0);

  // Username can only change once a week — see the on_username_change
  // trigger in schema.sql, which is what actually enforces this; this is
  // just so the UI can disable the field and explain why ahead of time
  // instead of the person hitting a surprise error on submit.
  const USERNAME_COOLDOWN_DAYS = 7;
  const nextUsernameChangeAt = user.usernameChangedAt
    ? new Date(
        new Date(user.usernameChangedAt).getTime() + USERNAME_COOLDOWN_DAYS * 24 * 60 * 60 * 1000
      )
    : null;
  const usernameCoolingDown = !!nextUsernameChangeAt && nextUsernameChangeAt.getTime() > Date.now();
  const usernameFormatValid = /^[a-z0-9_]{3,20}$/.test(username);
  const usernameUnchanged = username === (user.username ?? "");

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
      favoriteLine: favoriteLine.trim(),
      showWriterIdentity,
    });
    setSaving(false);

    if (result.error) {
      setError(result.error);
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  async function handleUsernameSave(e: React.FormEvent) {
    e.preventDefault();
    setUsernameError(null);
    setUsernameSaved(false);

    if (!usernameFormatValid) {
      setUsernameError(
        "3-20 characters: lowercase letters, numbers, and underscores only."
      );
      return;
    }

    setUsernameSaving(true);
    const result = await updateUsername(username);
    setUsernameSaving(false);

    if (result.error) {
      setUsernameError(result.error);
      return;
    }
    setUsernameSaved(true);
    setTimeout(() => setUsernameSaved(false), 2500);
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
    closeSettings();
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
    downloadBlob(
      blob,
      `${user!.name.trim().replace(/\s+/g, "-").toLowerCase()}-stories-${new Date()
        .toISOString()
        .slice(0, 10)}.txt`
    );
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
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={closeSettings}
        className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-3 sm:p-6"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 10 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-4xl max-h-[92vh] sm:max-h-[88vh] flex flex-col bg-ink border border-parchment/10 rounded-2xl shadow-2xl overflow-hidden text-parchment"
        >
          <div className="flex items-center justify-between px-5 sm:px-8 pt-5 sm:pt-6 pb-4 border-b border-parchment/10 flex-shrink-0">
            <div>
              <h2 className="font-serif text-xl sm:text-2xl">Settings</h2>
              <p className="text-sm text-muted hidden sm:block">
                Manage your profile, writing goals, and account.
              </p>
            </div>
            <button
              onClick={closeSettings}
              aria-label="Close settings"
              className="w-8 h-8 flex items-center justify-center rounded-full text-faint hover:text-parchment hover:bg-parchment/5 transition-colors flex-shrink-0"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar px-5 sm:px-8 py-6">
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
              </nav>

              {/* Main panel */}
              <div className="flex-1 min-w-0 grid gap-8 lg:grid-cols-[1fr_260px]">
                <div className="bg-panel border border-parchment/10 rounded-xl px-6 py-6">
                  {tab === "Profile" && (
                    <form onSubmit={handleUsernameSave} className="space-y-3 pb-6 mb-6 border-b border-parchment/10">
                      <label className="block font-mono text-xs text-muted uppercase tracking-wide">
                        Username
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="text-faint text-sm">vates.app/profile/</span>
                        <input
                          value={username}
                          onChange={(e) =>
                            setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))
                          }
                          disabled={usernameCoolingDown}
                          maxLength={20}
                          className="flex-1 min-w-0 bg-ink-soft rounded-lg px-4 py-2.5 outline-none border border-parchment/10 focus:border-lamp/40 transition-colors disabled:opacity-60"
                        />
                        <button
                          type="submit"
                          disabled={
                            usernameSaving ||
                            usernameCoolingDown ||
                            usernameUnchanged ||
                            !usernameFormatValid
                          }
                          className="bg-lamp text-ink text-sm font-semibold px-4 py-2.5 rounded-lg disabled:opacity-40 flex-shrink-0"
                        >
                          {usernameSaving ? "…" : "Save"}
                        </button>
                      </div>
                      <p className="text-[10px] font-mono text-faint">
                        Lowercase letters, numbers, and underscores only · 3-20 characters · can be
                        changed once a week
                      </p>
                      {usernameCoolingDown && nextUsernameChangeAt && (
                        <p className="text-xs text-muted">
                          You can change it again on{" "}
                          {nextUsernameChangeAt.toLocaleDateString("en-US", {
                            month: "long",
                            day: "numeric",
                          })}
                          .
                        </p>
                      )}
                      {usernameError && <p className="text-xs text-red-400">{usernameError}</p>}
                      {usernameSaved && <p className="text-xs text-completed">Saved.</p>}
                    </form>
                  )}

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
                            <img
                              src={user.avatarUrl}
                              alt={user.name}
                              className="w-full h-full object-cover"
                            />
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
                          About
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
                        <p className="text-[10px] font-mono text-faint mt-1">
                          {favoriteLine.length}/200
                        </p>
                      </div>

                      <label className="flex items-start gap-3 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={showWriterIdentity}
                          onChange={(e) => setShowWriterIdentity(e.target.checked)}
                          className="mt-0.5 w-4 h-4 rounded border-parchment/20 bg-ink-soft accent-lamp"
                        />
                        <span>
                          <span className="block text-sm text-parchment">
                            Show on my public profile
                          </span>
                          <span className="block text-xs text-muted mt-0.5">
                            When on, your about and favorite line appear on your public profile —
                            visible to anyone, including people who aren&apos;t logged in. Off by
                            default, and off means neither shows there.
                          </span>
                        </span>
                      </label>

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

                {/* Live preview + stats */}
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
                    {bio ? `"${bio}"` : "Nothing added yet — add one in the Profile tab."}
                  </p>

                  <div className="grid grid-cols-3 gap-2 text-center border-t border-parchment/10 pt-4">
                    <div>
                      <p className="font-mono text-lamp text-lg">{stories.length}</p>
                      <p className="text-[10px] text-faint">stories</p>
                    </div>
                    <div>
                      <p className="font-mono text-lamp text-lg">
                        {totalWords.toLocaleString("en-US")}
                      </p>
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
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}