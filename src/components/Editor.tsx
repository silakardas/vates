"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import type { Mark } from "@tiptap/pm/model";
import { motion } from "framer-motion";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle, FontSize } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import FontFamily from "@tiptap/extension-font-family";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import { useEffect, useState } from "react";
import WordLookup from "./WordLookup";
import QuoteCard from "./QuoteCard";
import GrammarSuggestion from "./GrammarSuggestion";
import { GrammarCheck, type GrammarMatch } from "@/lib/GrammarCheck";

const TEXT_COLORS = [
  { value: "#3A3226", label: "ink" },
  { value: "#A23B3B", label: "crimson" },
  { value: "#7A5A79", label: "plum" },
  { value: "#B8862F", label: "amber" },
  { value: "#3D6B5C", label: "pine" },
  { value: "#3D5A80", label: "denim" },
];
const HIGHLIGHT_COLORS = [
  { value: "#F0D9A8", label: "amber" },
  { value: "#D9E8D0", label: "sage" },
  { value: "#DCE3F0", label: "sky" },
  { value: "#F0C9D9", label: "pink" },
];
const FONTS = [
  { label: "Fraunces", value: "Fraunces, serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Times New Roman", value: "'Times New Roman', Times, serif" },
  { label: "Courier", value: "'Courier New', monospace" },
];
const FONT_SIZES = [
  { label: "Small", value: "14px" },
  { label: "Medium", value: "18px" },
  { label: "Large", value: "24px" },
];
const HEADING_OPTIONS = [
  { label: "Text", value: "paragraph" },
  { label: "Heading 1", value: "1" },
  { label: "Heading 2", value: "2" },
  { label: "Heading 3", value: "3" },
];

type CaseMode = "upper" | "lower" | "title" | "sentence" | "toggle";

// Shared line-art icon set: thin, rounded pen strokes so every toolbar glyph
// reads as one hand, but each function group carries its own accent color
// pulled from the site's existing palette so the bar doesn't read as flat.
function ToolbarIcon({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="15"
      height="15"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {children}
    </svg>
  );
}

const IconUndo = () => (
  <ToolbarIcon className="text-[#B8862F]">
    <path d="M8 7 4 11l4 4" />
    <path d="M4 11h11a5 5 0 0 1 0 10h-3" />
  </ToolbarIcon>
);

const IconRedo = () => (
  <ToolbarIcon className="text-[#B8862F]">
    <path d="m16 7 4 4-4 4" />
    <path d="M20 11H9a5 5 0 0 0 0 10h3" />
  </ToolbarIcon>
);

const IconAlignLeft = ({ active }: { active: boolean }) => (
  <ToolbarIcon className={active ? "" : "text-[#3D5A80]"}>
    <line x1="4" y1="6" x2="20" y2="6" />
    <line x1="4" y1="12" x2="14" y2="12" />
    <line x1="4" y1="18" x2="17" y2="18" />
  </ToolbarIcon>
);

const IconAlignCenter = ({ active }: { active: boolean }) => (
  <ToolbarIcon className={active ? "" : "text-[#3D5A80]"}>
    <line x1="4" y1="6" x2="20" y2="6" />
    <line x1="7" y1="12" x2="17" y2="12" />
    <line x1="5.5" y1="18" x2="18.5" y2="18" />
  </ToolbarIcon>
);

const IconAlignRight = ({ active }: { active: boolean }) => (
  <ToolbarIcon className={active ? "" : "text-[#3D5A80]"}>
    <line x1="4" y1="6" x2="20" y2="6" />
    <line x1="10" y1="12" x2="20" y2="12" />
    <line x1="7" y1="18" x2="20" y2="18" />
  </ToolbarIcon>
);

const IconLink = ({ active }: { active: boolean }) => (
  <ToolbarIcon className={active ? "" : "text-[#7A5A79]"}>
    <path d="M9.5 14.5 15 9" />
    <path d="m11 6.5 1-1a3.6 3.6 0 0 1 5 5l-1 1" />
    <path d="m13 17.5-1 1a3.6 3.6 0 0 1-5-5l1-1" />
  </ToolbarIcon>
);

const IconShare = () => (
  <ToolbarIcon className="text-[#A23B3B]">
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <circle cx="8.5" cy="10.5" r="1.5" />
    <path d="M21 15l-5-5L5 19" />
  </ToolbarIcon>
);

// "tr-TR" locale so İ/I and i/ı map correctly instead of the ASCII default.
function transformCase(text: string, mode: CaseMode): string {
  switch (mode) {
    case "upper":
      return text.toLocaleUpperCase("tr-TR");
    case "lower":
      return text.toLocaleLowerCase("tr-TR");
    case "title":
      return text.replace(
        /\S+/g,
        (word) =>
          word.charAt(0).toLocaleUpperCase("tr-TR") + word.slice(1).toLocaleLowerCase("tr-TR")
      );
    case "sentence":
      return text
        .toLocaleLowerCase("tr-TR")
        .replace(/(^\s*\S|[.!?]\s+\S)/g, (m) => m.toLocaleUpperCase("tr-TR"));
    case "toggle":
      return text
        .split("")
        .map((ch) => {
          const upper = ch.toLocaleUpperCase("tr-TR");
          return ch === upper ? ch.toLocaleLowerCase("tr-TR") : upper;
        })
        .join("");
  }
}

export default function Editor(props: {
  content: string;
  onChange: (html: string, wordCount: number) => void;
}) {
  const [lookup, setLookup] = useState<{ word: string; x: number; y: number } | null>(null);
  const [quoteText, setQuoteText] = useState<string | null>(null);
  const [quoteHint, setQuoteHint] = useState(false);
  const [caseHint, setCaseHint] = useState(false);
  const [grammarIssue, setGrammarIssue] = useState<
    (GrammarMatch & { x: number; y: number }) | null
  >(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      FontSize,
      Color,
      Highlight.configure({ multicolor: true }),
      FontFamily,
      Underline,
      Placeholder.configure({ placeholder: "Start writing..." }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { class: "underline text-[#3D5A80]" },
      }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      GrammarCheck.configure({ language: "en-US" }),
    ],
    content: props.content,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "font-serif text-lg leading-relaxed min-h-[50vh] focus:outline-none",
      },
    },
    onUpdate: ({ editor }) => {
      const text = editor.getText();
      const words = text.trim().length ? text.trim().split(/\s+/).length : 0;
      props.onChange(editor.getHTML(), words);
    },
  });

  useEffect(() => {
    if (editor && props.content !== editor.getHTML()) {
      editor.commands.setContent(props.content);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.content]);

  function handleSetLink() {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href as string | undefined;
    if (previousUrl) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    const url = window.prompt("Link URL:", "https://");
    if (url === null) return;
    if (url.trim() === "") {
      editor.chain().focus().unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  }

  function handleCaseChange(mode: CaseMode) {
    if (!editor) return;
    const { from, to, empty } = editor.state.selection;
    if (empty) {
      setCaseHint(true);
      setTimeout(() => setCaseHint(false), 1600);
      return;
    }

    // Collect each text node touching the selection along with its own
    // marks, so bold/italic/color/etc. survive the rewrite. Positions are
    // captured up front and applied back-to-front so earlier replacements
    // never invalidate later ones.
    const segments: { from: number; to: number; text: string; marks: readonly Mark[] }[] = [];
    editor.state.doc.nodesBetween(from, to, (node, pos) => {
      if (!node.isText || !node.text) return;
      const segFrom = Math.max(pos, from);
      const segTo = Math.min(pos + node.nodeSize, to);
      if (segFrom < segTo) {
        segments.push({
          from: segFrom,
          to: segTo,
          text: node.text.slice(segFrom - pos, segTo - pos),
          marks: node.marks,
        });
      }
    });

    let tr = editor.state.tr;
    for (let i = segments.length - 1; i >= 0; i--) {
      const seg = segments[i];
      tr = tr.replaceWith(seg.from, seg.to, editor.schema.text(transformCase(seg.text, mode), seg.marks));
    }
    editor.view.dispatch(tr);
    editor.commands.focus();
  }

  function handleQuoteCard() {
    if (!editor) return;
    const { from, to, empty } = editor.state.selection;
    if (empty) {
      setQuoteHint(true);
      setTimeout(() => setQuoteHint(false), 1600);
      return;
    }
    const text = editor.state.doc.textBetween(from, to, " ").trim();
    if (text) setQuoteText(text);
  }

  function handleClick(e: React.MouseEvent) {
    const target = (e.target as HTMLElement).closest(".grammar-error") as HTMLElement | null;
    if (!target || !editor) return;
    const index = Number(target.dataset.matchIndex);
    const match = editor.storage.grammarCheck?.matches?.[index];
    if (!match) return;
    setGrammarIssue({ ...match, x: e.clientX, y: e.clientY });
  }

  function applyGrammarFix(replacement: string) {
    if (!editor || !grammarIssue) return;
    editor
      .chain()
      .focus()
      .insertContentAt({ from: grammarIssue.from, to: grammarIssue.to }, replacement)
      .run();
    setGrammarIssue(null);
  }

  function handleDoubleClick(e: React.MouseEvent) {
    const selection = window.getSelection();
    const word = selection?.toString().trim();
    if (word && /^[a-zA-ZçğıöşüÇĞİÖŞÜ'-]+$/.test(word)) {
      setLookup({ word, x: e.clientX, y: e.clientY });
    }
  }

  if (!editor) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="bg-parchment text-[#3A3226] rounded-lg overflow-hidden shadow-2xl h-full flex flex-col"
    >
      <div className="flex items-center gap-2 sm:gap-4 px-3 py-2.5 sm:px-5 sm:py-3 bg-parchment-dim border-b border-black/10 flex-wrap">
        <div className="flex items-center gap-1">
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="Undo"
            className="w-7 h-7 rounded border bg-white border-black/15 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
          >
            <IconUndo />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="Redo"
            className="w-7 h-7 rounded border bg-white border-black/15 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
          >
            <IconRedo />
          </motion.button>
        </div>

        <div className="w-px h-5 bg-black/15" />

        <div className="flex items-center gap-2">
          <label className="hidden sm:inline font-mono text-[10px] uppercase text-[#7A6E58]">Style</label>
          <select
            className="font-serif text-sm px-2 py-1 rounded border border-black/15 bg-white cursor-pointer transition-shadow hover:shadow-sm"
            value={
              editor.isActive("heading", { level: 1 })
                ? "1"
                : editor.isActive("heading", { level: 2 })
                ? "2"
                : editor.isActive("heading", { level: 3 })
                ? "3"
                : "paragraph"
            }
            onChange={(e) => {
              const val = e.target.value;
              if (val === "paragraph") {
                editor.chain().focus().setParagraph().run();
              } else {
                editor
                  .chain()
                  .focus()
                  .toggleHeading({ level: Number(val) as 1 | 2 | 3 })
                  .run();
              }
            }}
          >
            {HEADING_OPTIONS.map((h) => (
              <option key={h.value} value={h.value}>
                {h.label}
              </option>
            ))}
          </select>
        </div>

        <div className="w-px h-5 bg-black/15" />

        <div className="flex items-center gap-2">
          <label className="hidden sm:inline font-mono text-[10px] uppercase text-[#7A6E58]">Font</label>
          <select
            className="font-serif text-sm px-2 py-1 rounded border border-black/15 bg-white cursor-pointer transition-shadow hover:shadow-sm"
            onChange={(e) => editor.chain().focus().setFontFamily(e.target.value).run()}
          >
            {FONTS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>

        <div className="w-px h-5 bg-black/15" />

        <div className="flex items-center gap-2">
          <label className="hidden sm:inline font-mono text-[10px] uppercase text-[#7A6E58]">Size</label>
          <select
            className="font-serif text-sm px-2 py-1 rounded border border-black/15 bg-white cursor-pointer transition-shadow hover:shadow-sm"
            defaultValue={FONT_SIZES[1].value}
            onChange={(e) => editor.chain().focus().setFontSize(e.target.value).run()}
          >
            {FONT_SIZES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div className="w-px h-5 bg-black/15" />

        <div className="flex items-center gap-2">
          <label className="font-mono text-[10px] uppercase text-[#7A6E58]">Text color</label>
          {TEXT_COLORS.map((c) => {
            const active = editor.isActive("textStyle", { color: c.value });
            return (
              <motion.button
                key={c.value}
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.88 }}
                onClick={() => editor.chain().focus().setColor(c.value).run()}
                title={c.label}
                className={`relative w-[19px] h-[19px] rounded-full border flex items-center justify-center ${
                  active ? "border-black/60 ring-2 ring-offset-1 ring-black/30" : "border-black/20"
                }`}
                style={{ backgroundColor: c.value }}
                aria-label={`Text color ${c.label}`}
              >
                {active && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="text-white text-[9px] leading-none"
                    style={{ textShadow: "0 0 2px rgba(0,0,0,0.6)" }}
                  >
                    ✓
                  </motion.span>
                )}
              </motion.button>
            );
          })}
        </div>

        <div className="w-px h-5 bg-black/15" />

        <div className="flex items-center gap-2">
          <label className="font-mono text-[10px] uppercase text-[#7A6E58]">Highlight</label>
          {HIGHLIGHT_COLORS.map((c) => {
            const active = editor.isActive("highlight", { color: c.value });
            return (
              <motion.button
                key={c.value}
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.88 }}
                onClick={() => editor.chain().focus().toggleHighlight({ color: c.value }).run()}
                title={c.label}
                className={`relative w-[19px] h-[19px] rounded border flex items-center justify-center ${
                  active ? "border-black/60 ring-2 ring-offset-1 ring-black/30" : "border-black/20"
                }`}
                style={{ backgroundColor: c.value }}
                aria-label={`Highlight ${c.label}`}
              >
                {active && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="text-[#3A3226] text-[9px] leading-none"
                  >
                    ✓
                  </motion.span>
                )}
              </motion.button>
            );
          })}
        </div>

        <div className="w-px h-5 bg-black/15" />

        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`w-7 h-7 rounded border font-serif text-sm font-bold ${
            editor.isActive("bold")
              ? "bg-lamp border-lamp text-ink"
              : "bg-white border-black/15"
          }`}
        >
          B
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`w-7 h-7 rounded border font-serif text-sm italic ${
            editor.isActive("italic")
              ? "bg-lamp border-lamp text-ink"
              : "bg-white border-black/15"
          }`}
        >
          i
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          title="Underline"
          className={`w-7 h-7 rounded border font-serif text-sm underline ${
            editor.isActive("underline")
              ? "bg-lamp border-lamp text-ink"
              : "bg-white border-black/15"
          }`}
        >
          U
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          title="Strikethrough"
          className={`w-7 h-7 rounded border font-serif text-sm line-through ${
            editor.isActive("strike")
              ? "bg-lamp border-lamp text-ink"
              : "bg-white border-black/15"
          }`}
        >
          S
        </motion.button>

        <div className="w-px h-5 bg-black/15" />

        <div className="flex items-center gap-1">
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => editor.chain().focus().setTextAlign("left").run()}
            title="Align left"
            className={`w-7 h-7 rounded border flex items-center justify-center ${
              editor.isActive({ textAlign: "left" })
                ? "bg-lamp border-lamp text-ink"
                : "bg-white border-black/15"
            }`}
          >
            <IconAlignLeft active={editor.isActive({ textAlign: "left" })} />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => editor.chain().focus().setTextAlign("center").run()}
            title="Align center"
            className={`w-7 h-7 rounded border flex items-center justify-center ${
              editor.isActive({ textAlign: "center" })
                ? "bg-lamp border-lamp text-ink"
                : "bg-white border-black/15"
            }`}
          >
            <IconAlignCenter active={editor.isActive({ textAlign: "center" })} />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => editor.chain().focus().setTextAlign("right").run()}
            title="Align right"
            className={`w-7 h-7 rounded border flex items-center justify-center ${
              editor.isActive({ textAlign: "right" })
                ? "bg-lamp border-lamp text-ink"
                : "bg-white border-black/15"
            }`}
          >
            <IconAlignRight active={editor.isActive({ textAlign: "right" })} />
          </motion.button>
        </div>

        <div className="w-px h-5 bg-black/15" />

        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          title="Quote"
          className={`w-7 h-7 rounded border font-serif text-base leading-none ${
            editor.isActive("blockquote")
              ? "bg-lamp border-lamp text-ink"
              : "bg-white border-black/15 text-[#3D6B5C]"
          }`}
        >
          &ldquo;
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Bullet list"
          className={`w-7 h-7 rounded border font-mono text-xs ${
            editor.isActive("bulletList")
              ? "bg-lamp border-lamp text-ink"
              : "bg-white border-black/15 text-[#3D6B5C]"
          }`}
        >
          •≡
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Numbered list"
          className={`w-7 h-7 rounded border font-mono text-xs ${
            editor.isActive("orderedList")
              ? "bg-lamp border-lamp text-ink"
              : "bg-white border-black/15 text-[#3D5A80]"
          }`}
        >
          1.≡
        </motion.button>

        <div className="w-px h-5 bg-black/15" />

        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleSetLink}
          title={editor.isActive("link") ? "Remove link" : "Add link"}
          className={`w-7 h-7 rounded border flex items-center justify-center ${
            editor.isActive("link")
              ? "bg-lamp border-lamp text-ink"
              : "bg-white border-black/15"
          }`}
        >
          <IconLink active={editor.isActive("link")} />
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
          title="Clear formatting"
          className="w-7 h-7 rounded border font-mono text-[11px] bg-white border-black/15 text-muted"
        >
          Tx
        </motion.button>
        <div className="w-px h-5 bg-black/15" />

        <div className="relative flex items-center gap-1">
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => handleCaseChange("upper")}
            title="UPPERCASE"
            className="w-7 h-7 rounded border font-mono text-[10px] bg-white border-black/15 text-[#A23B3B]"
          >
            AA
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => handleCaseChange("lower")}
            title="lowercase"
            className="w-7 h-7 rounded border font-mono text-[10px] bg-white border-black/15 text-[#A23B3B]"
          >
            aa
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => handleCaseChange("title")}
            title="Capitalize Each Word"
            className="w-7 h-7 rounded border font-mono text-[10px] bg-white border-black/15 text-[#A23B3B]"
          >
            Aa
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => handleCaseChange("sentence")}
            title="Sentence case"
            className="w-7 h-7 rounded border font-mono text-[10px] bg-white border-black/15 text-[#A23B3B]"
          >
            A.
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => handleCaseChange("toggle")}
            title="tOGGLE cASE"
            className="w-7 h-7 rounded border font-mono text-[10px] bg-white border-black/15 text-[#A23B3B]"
          >
            aA
          </motion.button>
          {caseHint && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute top-9 left-1/2 -translate-x-1/2 whitespace-nowrap bg-ink text-parchment text-[11px] font-mono px-2.5 py-1.5 rounded shadow-lg z-10"
            >
              Select some text first
            </motion.div>
          )}
        </div>

        <div className="w-px h-5 bg-black/15" />

        <div className="relative">
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleQuoteCard}
            title="Share selection as image"
            className="w-7 h-7 rounded border bg-white border-black/15 flex items-center justify-center"
          >
            <IconShare />
          </motion.button>
          {quoteHint && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute top-9 left-1/2 -translate-x-1/2 whitespace-nowrap bg-ink text-parchment text-[11px] font-mono px-2.5 py-1.5 rounded shadow-lg z-10"
            >
              Select some text first
            </motion.div>
          )}
        </div>
      </div>

      <div
        className="px-4 py-6 sm:px-8 sm:py-9 lg:px-12 lg:py-11 relative flex-1 overflow-y-auto"
        onDoubleClick={handleDoubleClick}
        onClick={handleClick}
      >
        <EditorContent editor={editor} />
      </div>

      {lookup && (
        <WordLookup
          key={lookup.word}
          word={lookup.word}
          x={lookup.x}
          y={lookup.y}
          onClose={() => setLookup(null)}
        />
      )}

      {quoteText && <QuoteCard text={quoteText} onClose={() => setQuoteText(null)} />}

      {grammarIssue && (
        <GrammarSuggestion
          message={grammarIssue.shortMessage}
          replacements={grammarIssue.replacements}
          x={grammarIssue.x}
          y={grammarIssue.y}
          onApply={applyGrammarFix}
          onClose={() => setGrammarIssue(null)}
        />
      )}
    </motion.div>
  );
}