"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import { motion } from "framer-motion";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle, FontSize } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import FontFamily from "@tiptap/extension-font-family";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect, useState } from "react";
import WordLookup from "./WordLookup";

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

export default function Editor(props: {
  content: string;
  onChange: (html: string, wordCount: number) => void;
}) {
  const [lookup, setLookup] = useState<{ word: string; x: number; y: number } | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      FontSize,
      Color,
      Highlight.configure({ multicolor: true }),
      FontFamily,
      Placeholder.configure({ placeholder: "Start writing..." }),
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
      <div className="flex items-center gap-4 px-5 py-3 bg-parchment-dim border-b border-black/10 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="font-mono text-[10px] uppercase text-[#7A6E58]">Font</label>
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
          <label className="font-mono text-[10px] uppercase text-[#7A6E58]">Size</label>
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

        <div className="w-px h-5 bg-black/15" />

        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          title="Quote"
          className={`w-7 h-7 rounded border font-serif text-base leading-none ${
            editor.isActive("blockquote")
              ? "bg-lamp border-lamp text-ink"
              : "bg-white border-black/15"
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
              : "bg-white border-black/15"
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
              : "bg-white border-black/15"
          }`}
        >
          1.≡
        </motion.button>
      </div>

      <div className="px-12 py-11 relative flex-1 overflow-y-auto" onDoubleClick={handleDoubleClick}>
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
    </motion.div>
  );
}
