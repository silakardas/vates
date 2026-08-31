"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const CARD_SIZE = 1080;
const SITE = "vates-six.vercel.app";

// Wraps `text` to fit `maxWidth` on the given canvas context, returning
// the resulting lines (font must already be set on ctx before calling).
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// Small seeded PRNG so the star field looks the same every time a given
// card is drawn, instead of reshuffling on each re-render.
function makeRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

// Scatters plain, gradient-free dots across the canvas — a light starry
// sky instead of a gradient wash. A handful are drawn slightly bigger
// with a thin four-point sparkle so the field has some depth.
function drawStars(ctx: CanvasRenderingContext2D, size: number) {
  const rand = makeRandom(1337);

  const dustCount = 160;
  for (let i = 0; i < dustCount; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = rand() * 1.1 + 0.3;
    const opacity = rand() * 0.45 + 0.12;
    ctx.beginPath();
    ctx.fillStyle = `rgba(237,230,214,${opacity.toFixed(2)})`;
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const sparkleCount = 16;
  for (let i = 0; i < sparkleCount; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const arm = rand() * 5 + 4;
    const warm = rand() > 0.5;
    const color = warm ? "232,163,61" : "237,230,214";
    const opacity = rand() * 0.35 + 0.35;

    ctx.strokeStyle = `rgba(${color},${opacity.toFixed(2)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - arm, y);
    ctx.lineTo(x + arm, y);
    ctx.moveTo(x, y - arm);
    ctx.lineTo(x, y + arm);
    ctx.stroke();

    ctx.beginPath();
    ctx.fillStyle = `rgba(${color},${(opacity + 0.2).toFixed(2)})`;
    ctx.arc(x, y, 1.3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawCard(canvas: HTMLCanvasElement, text: string, storyTitle?: string) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  canvas.width = CARD_SIZE;
  canvas.height = CARD_SIZE;
  const pad = 110;
  const maxWidth = CARD_SIZE - pad * 2;

  // base
  ctx.fillStyle = "#1B2430";
  ctx.fillRect(0, 0, CARD_SIZE, CARD_SIZE);

  // light starry sky instead of a gradient wash
  drawStars(ctx, CARD_SIZE);

  // faint grain
  ctx.fillStyle = "rgba(237,230,214,0.045)";
  for (let x = 20; x < CARD_SIZE; x += 26) {
    for (let y = 20; y < CARD_SIZE; y += 26) {
      ctx.fillRect(x, y, 1.4, 1.4);
    }
  }

  // big opening quote mark
  ctx.font = "italic 220px Georgia, 'Times New Roman', serif";
  ctx.fillStyle = "rgba(232,163,61,0.3)";
  ctx.fillText("\u201C", pad - 22, pad + 150);

  // quote text, shrinking to fit if long
  let fontSize = 50;
  let lines: string[] = [];
  const maxLines = 9;
  do {
    ctx.font = `italic 500 ${fontSize}px Georgia, 'Times New Roman', serif`;
    lines = wrapText(ctx, text, maxWidth);
    if (lines.length <= maxLines) break;
    fontSize -= 4;
  } while (fontSize > 26);

  const lineHeight = fontSize * 1.42;
  const textBlockHeight = lines.length * lineHeight;
  let y = (CARD_SIZE - textBlockHeight) / 2 + fontSize * 0.35;

  ctx.fillStyle = "#EDE6D6";
  ctx.textAlign = "left";
  for (const line of lines) {
    ctx.fillText(line, pad, y);
    y += lineHeight;
  }

  // footer: hairline + wordmark
  const footerY = CARD_SIZE - 96;
  ctx.strokeStyle = "rgba(232,163,61,0.35)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(pad, footerY);
  ctx.lineTo(pad + 64, footerY);
  ctx.stroke();

  ctx.font = "600 22px 'Courier New', monospace";
  ctx.fillStyle = "#F2BD6B";
  let lx = pad;
  const wordmark = "VATES";
  for (const ch of wordmark) {
    ctx.fillText(ch, lx, footerY + 34);
    lx += ctx.measureText(ch).width + 6;
  }

  ctx.font = "13px 'Courier New', monospace";
  ctx.fillStyle = "rgba(150,160,178,0.9)";
  ctx.fillText(storyTitle ? `${storyTitle}  \u2014  ${SITE}` : SITE, pad, footerY + 58);
}

export default function QuoteCard(props: { text: string; storyTitle?: string; onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (canvasRef.current) {
      drawCard(canvasRef.current, props.text, props.storyTitle);
    }
  }, [props.text, props.storyTitle]);

  function getBlob(): Promise<Blob | null> {
    return new Promise((resolve) => {
      canvasRef.current?.toBlob((blob) => resolve(blob), "image/png");
    });
  }

  async function handleDownload() {
    setBusy(true);
    const blob = await getBlob();
    setBusy(false);
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "vates-quote.png";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleShare() {
    setBusy(true);
    const blob = await getBlob();
    setBusy(false);
    if (!blob) return;
    const file = new File([blob], "vates-quote.png", { type: "image/png" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: "From my story on Vates" });
        return;
      } catch {
        // user cancelled or share failed — fall through to download
      }
    }
    handleDownload();
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={props.onClose}
        className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-6"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          onClick={(e) => e.stopPropagation()}
          className="max-w-sm w-full"
        >
          <div className="rounded-2xl overflow-hidden border border-parchment/10 shadow-2xl">
            <canvas ref={canvasRef} className="w-full h-auto block" />
          </div>

          <div className="flex items-center gap-3 mt-5">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleShare}
              disabled={busy}
              className="flex-1 bg-lamp text-ink font-semibold text-sm px-4 py-2.5 rounded-full disabled:opacity-60"
            >
              Share
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleDownload}
              disabled={busy}
              className="flex-1 bg-transparent border border-parchment/20 text-parchment font-semibold text-sm px-4 py-2.5 rounded-full disabled:opacity-60"
            >
              Download
            </motion.button>
            <button
              onClick={props.onClose}
              className="font-mono text-xs text-faint hover:text-muted transition-colors px-2"
            >
              Close
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}