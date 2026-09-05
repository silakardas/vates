"use client";

import { useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useStories } from "@/lib/StoryContext";
import Header from "@/components/Header";
import StoryMapAmbience from "@/components/StoryMapAmbience";

type Node = {
  id: string;
  kind: "character" | "event";
  label: string;
  sub: string;
  x: number;
  y: number;
};

const COLS = 4;
const COL_GAP = 190;
const ROW_GAP = 150;
const PAD_X = 70;
const PAD_Y = 60;

function defaultPos(index: number): { x: number; y: number } {
  return {
    x: PAD_X + (index % COLS) * COL_GAP,
    y: PAD_Y + Math.floor(index / COLS) * ROW_GAP,
  };
}

export default function StoryMapPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const {
    getStory,
    addCharacter,
    updateCharacter,
    removeCharacter,
    addEvent,
    updateEvent,
    removeEvent,
    toggleConnection,
    uploadMoodboardImage,
    removeMoodboardImage,
  } = useStories();
  const story = getStory(id);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const dragState = useRef<{
    id: string | null;
    startX: number;
    startY: number;
    moved: boolean;
  }>({ id: null, startX: 0, startY: 0, moved: false });

  const nodes: Node[] = useMemo(() => {
    if (!story) return [];
    const chars: Node[] = story.characters.map((c, i) => {
      const pos = c.x !== undefined && c.y !== undefined ? { x: c.x, y: c.y } : defaultPos(i);
      return {
        id: c.id,
        kind: "character",
        label: c.name || "Untitled character",
        sub: c.role || "Character",
        ...pos,
      };
    });
    const events: Node[] = story.events.map((e, i) => {
      const pos =
        e.x !== undefined && e.y !== undefined
          ? { x: e.x, y: e.y }
          : defaultPos(story.characters.length + i);
      return {
        id: e.id,
        kind: "event",
        label: e.title || "Untitled event",
        sub: "Event",
        ...pos,
      };
    });
    return [...chars, ...events];
  }, [story]);

  if (!story) {
    return (
      <>
        <Header />
        <main className="text-parchment px-5 sm:px-8 py-24 text-center">
          <p className="text-muted">This story doesn&apos;t exist (yet).</p>
          <button
            onClick={() => router.push("/workshop")}
            className="mt-4 text-lamp font-mono text-sm hover:underline"
          >
            ← Back to workshop
          </button>
        </main>
      </>
    );
  }

  const selectedNode = nodes.find((n) => n.id === selectedId) ?? null;
  const selectedCharacter =
    selectedNode?.kind === "character"
      ? story.characters.find((c) => c.id === selectedNode.id)
      : undefined;
  const selectedEvent =
    selectedNode?.kind === "event"
      ? story.events.find((e) => e.id === selectedNode.id)
      : undefined;

  function nodeCenter(n: Node) {
    return { x: n.x + 78, y: n.y + 26 };
  }

  const handlePointerDown = (e: React.PointerEvent, node: Node) => {
    (e.target as Element).setPointerCapture(e.pointerId);
    dragState.current = { id: node.id, startX: e.clientX, startY: e.clientY, moved: false };
  };

  const handlePointerMove = (e: React.PointerEvent, node: Node) => {
    if (dragState.current.id !== node.id) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) dragState.current.moved = true;
    if (!dragState.current.moved) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    let nx = e.clientX - rect.left - 78 + canvas.scrollLeft;
    let ny = e.clientY - rect.top - 26 + canvas.scrollTop;
    nx = Math.max(0, nx);
    ny = Math.max(0, ny);

    if (node.kind === "character") {
      updateCharacter(story.id, node.id, { x: nx, y: ny });
    } else {
      updateEvent(story.id, node.id, { x: nx, y: ny });
    }
  };

  const handlePointerUp = (e: React.PointerEvent, node: Node) => {
    if (!dragState.current.moved) {
      setSelectedId((prev) => (prev === node.id ? null : node.id));
    }
    dragState.current = { id: null, startX: 0, startY: 0, moved: false };
  };

  const handleMoodboardUpload = async (file: File) => {
    if (!selectedCharacter) return;
    setUploading(true);
    setUploadError(null);
    const { error } = await uploadMoodboardImage(story.id, selectedCharacter.id, file);
    if (error) setUploadError(error);
    setUploading(false);
  };

  return (
    <>
      <Header />
      <div className="flex flex-col lg:flex-row" style={{ minHeight: "calc(100vh - 89px)" }}>
        <main className="flex-1 min-w-0 flex flex-col">
          <div className="flex items-center justify-between px-5 sm:px-8 pt-6 pb-4 flex-wrap gap-3">
            <button
              onClick={() => router.push(`/story/${story.id}`)}
              className="text-muted font-mono text-xs hover:text-lamp transition-colors"
            >
              ← Back to {story.title || "story"}
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={() => addCharacter(story.id)}
                className="text-xs font-mono text-lamp border border-dashed border-lamp/30 rounded-lg px-3 py-1.5 hover:bg-lamp/5 transition-colors"
              >
                + Character
              </button>
              <button
                onClick={() => addEvent(story.id)}
                className="text-xs font-mono text-plum border border-dashed border-plum/40 rounded-lg px-3 py-1.5 hover:bg-plum/5 transition-colors"
              >
                + Event
              </button>
            </div>
          </div>

          <div
            ref={canvasRef}
            className="relative flex-1 mx-5 mb-5 sm:mx-8 sm:mb-8 rounded-xl border border-parchment/10 bg-ink-soft overflow-auto custom-scrollbar"
            style={{ minHeight: 360 }}
          >
            <StoryMapAmbience />

            {nodes.length === 0 && (
              <p className="absolute inset-0 flex items-center justify-center text-sm text-faint text-center px-8">
                No characters or events yet. Add one above, then click a
                node to link it to another.
              </p>
            )}

            <svg
              className="absolute pointer-events-none"
              style={{ left: 0, top: 0, width: "100%", height: "100%", overflow: "visible" }}
            >
              {story.connections.map((conn) => {
                const from = nodes.find((n) => n.id === conn.fromId);
                const to = nodes.find((n) => n.id === conn.toId);
                if (!from || !to) return null;
                const a = nodeCenter(from);
                const b = nodeCenter(to);
                return (
                  <line
                    key={conn.id}
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke={
                      from.kind === "event" || to.kind === "event"
                        ? "#9088C9"
                        : "#E8A33D"
                    }
                    strokeWidth={1.5}
                    opacity={0.55}
                  />
                );
              })}
            </svg>

            {nodes.map((n) => (
              <div
                key={n.id}
                onPointerDown={(e) => handlePointerDown(e, n)}
                onPointerMove={(e) => handlePointerMove(e, n)}
                onPointerUp={(e) => handlePointerUp(e, n)}
                className={`absolute select-none rounded-lg px-3.5 py-2.5 cursor-grab active:cursor-grabbing bg-panel border transition-colors ${
                  selectedId === n.id
                    ? n.kind === "character"
                      ? "border-lamp"
                      : "border-plum"
                    : "border-parchment/10"
                }`}
                style={{ left: n.x, top: n.y, width: 156, touchAction: "none" }}
              >
                <p className="font-serif text-sm text-parchment truncate">{n.label}</p>
                <p
                  className={`font-mono text-[10px] uppercase tracking-wide mt-0.5 truncate ${
                    n.kind === "character" ? "text-lamp" : "text-plum"
                  }`}
                >
                  {n.sub}
                </p>
              </div>
            ))}
          </div>
        </main>

        <aside className="w-full lg:w-80 lg:shrink-0 max-h-[70vh] lg:max-h-none border-t lg:border-t-0 lg:border-l border-parchment/10 px-5 py-6 overflow-y-auto custom-scrollbar">
          {!selectedNode && (
            <p className="text-xs text-faint leading-relaxed">
              Click a character or event to edit it, link it to others, or
              (for characters) build a moodboard.
            </p>
          )}

          {selectedCharacter && (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-2">
                <input
                  value={selectedCharacter.name}
                  onChange={(e) =>
                    updateCharacter(story.id, selectedCharacter.id, { name: e.target.value })
                  }
                  className="flex-1 min-w-0 bg-transparent font-serif text-lg outline-none border-b border-transparent focus:border-lamp/40 transition-colors"
                />
                <button
                  onClick={() => {
                    removeCharacter(story.id, selectedCharacter.id);
                    setSelectedId(null);
                  }}
                  className="text-faint hover:text-crimson transition-colors text-xs mt-1"
                  aria-label="Remove character"
                >
                  ✕
                </button>
              </div>
              <input
                value={selectedCharacter.role}
                onChange={(e) =>
                  updateCharacter(story.id, selectedCharacter.id, { role: e.target.value })
                }
                placeholder="Role — protagonist, rival, ghost..."
                className="w-full bg-transparent font-mono text-[10px] uppercase tracking-wide text-lamp outline-none placeholder:text-faint placeholder:normal-case placeholder:tracking-normal"
              />
              <textarea
                value={selectedCharacter.description}
                onChange={(e) =>
                  updateCharacter(story.id, selectedCharacter.id, {
                    description: e.target.value,
                  })
                }
                placeholder="Notes on this character..."
                rows={3}
                className="w-full bg-ink rounded-md px-2.5 py-2 text-xs leading-relaxed outline-none border border-parchment/10 focus:border-lamp/40 transition-colors placeholder:text-faint resize-none"
              />

              <ConnectionsList
                storyId={story.id}
                selectedId={selectedCharacter.id}
                nodes={nodes}
                connections={story.connections}
                onToggle={toggleConnection}
              />

              <div>
                <p className="font-mono text-[10px] uppercase tracking-wide text-muted mb-2">
                  Moodboard
                </p>
                <div className="grid grid-cols-3 gap-1.5 mb-2">
                  {(selectedCharacter.moodboard ?? []).map((img) => (
                    // eslint-disable-next-line @next/next/no-img-element -- user-uploaded, remote Supabase URL
                    <div key={img.id} className="relative group aspect-square">
                      <img
                        src={img.url}
                        alt=""
                        className="w-full h-full object-cover rounded-md border border-parchment/10"
                      />
                      <button
                        onClick={() =>
                          removeMoodboardImage(story.id, selectedCharacter.id, img.id)
                        }
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-ink/80 text-parchment text-[10px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                        aria-label="Remove image"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                <label className="block text-center text-xs font-mono text-lamp border border-dashed border-lamp/30 rounded-lg py-2 cursor-pointer hover:bg-lamp/5 transition-colors">
                  {uploading ? "Uploading…" : "+ Add image"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleMoodboardUpload(file);
                      e.target.value = "";
                    }}
                  />
                </label>
                {uploadError && (
                  <p className="text-crimson text-xs mt-1.5">{uploadError}</p>
                )}
                <label className="flex items-start gap-3 cursor-pointer select-none mt-3">
                  <input
                    type="checkbox"
                    checked={selectedCharacter.showMoodboardPublicly ?? false}
                    onChange={(e) =>
                      updateCharacter(story.id, selectedCharacter.id, {
                        showMoodboardPublicly: e.target.checked,
                      })
                    }
                    className="mt-0.5 w-4 h-4 rounded border-parchment/20 bg-ink-soft accent-lamp"
                  />
                  <span>
                    <span className="block text-sm text-parchment">
                      Show this moodboard on the public story page
                    </span>
                    <span className="block text-xs text-muted mt-0.5">
                      Off by default — the rest of this character stays workshop-only either way.
                    </span>
                  </span>
                </label>
              </div>
            </div>
          )}

          {selectedEvent && (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-2">
                <input
                  value={selectedEvent.title}
                  onChange={(e) =>
                    updateEvent(story.id, selectedEvent.id, { title: e.target.value })
                  }
                  className="flex-1 min-w-0 bg-transparent font-serif text-lg outline-none border-b border-transparent focus:border-plum/50 transition-colors"
                />
                <button
                  onClick={() => {
                    removeEvent(story.id, selectedEvent.id);
                    setSelectedId(null);
                  }}
                  className="text-faint hover:text-crimson transition-colors text-xs mt-1"
                  aria-label="Remove event"
                >
                  ✕
                </button>
              </div>
              <textarea
                value={selectedEvent.description}
                onChange={(e) =>
                  updateEvent(story.id, selectedEvent.id, { description: e.target.value })
                }
                placeholder="What happens here..."
                rows={4}
                className="w-full bg-ink rounded-md px-2.5 py-2 text-xs leading-relaxed outline-none border border-parchment/10 focus:border-plum/50 transition-colors placeholder:text-faint resize-none"
              />

              <ConnectionsList
                storyId={story.id}
                selectedId={selectedEvent.id}
                nodes={nodes}
                connections={story.connections}
                onToggle={toggleConnection}
              />
            </div>
          )}
        </aside>
      </div>
    </>
  );
}

function ConnectionsList({
  storyId,
  selectedId,
  nodes,
  connections,
  onToggle,
}: {
  storyId: string;
  selectedId: string;
  nodes: Node[];
  connections: { id: string; fromId: string; toId: string }[];
  onToggle: (storyId: string, fromId: string, toId: string) => void;
}) {
  const others = nodes.filter((n) => n.id !== selectedId);
  const connectedIds = new Set(
    connections
      .filter((c) => c.fromId === selectedId || c.toId === selectedId)
      .map((c) => (c.fromId === selectedId ? c.toId : c.fromId))
  );

  if (others.length === 0) return null;

  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-wide text-muted mb-2">
        Connections
      </p>
      <div className="space-y-1">
        {others.map((n) => {
          const connected = connectedIds.has(n.id);
          return (
            <button
              key={n.id}
              onClick={() => onToggle(storyId, selectedId, n.id)}
              className={`w-full flex items-center justify-between text-left px-2.5 py-1.5 rounded-md text-xs border transition-colors ${
                connected
                  ? "border-lamp/40 bg-lamp/5 text-parchment"
                  : "border-transparent text-faint hover:text-muted hover:bg-ink"
              }`}
            >
              <span className="truncate">{n.label}</span>
              <span className="font-mono text-[10px] ml-2 shrink-0">
                {connected ? "linked" : "link"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}