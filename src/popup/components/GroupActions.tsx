import { useState, useEffect, useRef } from "preact/hooks";
import {
  Tag,
  NotePencil,
  ArrowsLeftRight,
  Plus,
  Browser,
  X,
  Check,
  FloppyDisk,
} from "@phosphor-icons/react";
import {
  addTagToMany,
  addNoteToMany,
  moveManyToWindow,
  moveManyToNewWindow,
  closeMany,
  listWindowsForMove,
  type WindowInfo,
} from "@/lib/tabs";
import { saveSession } from "@/lib/sessions";
import { getAllWindowMeta } from "@/lib/windows";
import { WINDOW_COLOR_STYLES } from "@/lib/window-colors";
import type { PawTab, WindowColor } from "@/types";

interface Props {
  tabs: PawTab[];
  onAction: () => void;
}

type Panel = null | "tag" | "note" | "move";

export function GroupActions({ tabs, onAction }: Props) {
  const [panel, setPanel] = useState<Panel>(null);
  const [tagInput, setTagInput] = useState("");
  const [noteInput, setNoteInput] = useState("");
  const [windows, setWindows] = useState<WindowInfo[]>([]);
  const [windowColors, setWindowColors] = useState<
    Record<number, WindowColor>
  >({});
  const [busy, setBusy] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const ids = tabs.map((t) => t.id);

  useEffect(() => {
    if (panel !== "move") return;
    Promise.all([listWindowsForMove(-1), getAllWindowMeta()]).then(
      ([wins, meta]) => {
        setWindows(wins);
        const colors: Record<number, WindowColor> = {};
        for (const [id, m] of Object.entries(meta)) {
          if (m.color) colors[Number(id)] = m.color;
        }
        setWindowColors(colors);
      },
    );
  }, [panel]);

  useEffect(() => {
    if (panel === null) return;
    const click = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setPanel(null);
      }
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPanel(null);
    };
    document.addEventListener("mousedown", click);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", click);
      document.removeEventListener("keydown", esc);
    };
  }, [panel]);

  const run = async (fn: () => Promise<void>) => {
    if (busy || ids.length === 0) return;
    setBusy(true);
    try {
      await fn();
      onAction();
      setPanel(null);
      setTagInput("");
      setNoteInput("");
    } finally {
      setBusy(false);
    }
  };

  const handleAddTag = () => {
    if (!tagInput.trim()) return;
    run(() => addTagToMany(ids, tagInput));
  };

  const handleAddNote = () => {
    if (!noteInput.trim()) return;
    run(() => addNoteToMany(ids, noteInput));
  };

  const handleMove = (windowId: number) =>
    run(() => moveManyToWindow(ids, windowId));

  const handleMoveNew = () => run(() => moveManyToNewWindow(ids));

  const handleCloseAll = () => {
    if (
      !confirm(
        `Close ${ids.length} tab${ids.length === 1 ? "" : "s"} in this group?`,
      )
    )
      return;
    run(() => closeMany(ids));
  };

  const handleSaveSnapshot = () => {
    if (ids.length === 0) return;
    const stamp = new Date().toLocaleString();
    const name = `Group snapshot — ${stamp}`;
    run(async () => {
      const urls = new Set(tabs.map((t) => t.url));
      const original = saveSession;
      // Save a manual (not auto) session but only with this group's tabs.
      const { storage } = await import("@/lib/storage");
      const session = await original(name, false, `${ids.length} tabs`);
      // Trim tabs to just our group's URLs (saveSession captured all open
      // tabs — we filter down to the group).
      await storage.update("savedSessions", (current) =>
        (current ?? []).map((s) =>
          s.id === session.id
            ? { ...s, tabs: s.tabs.filter((t) => urls.has(t.url)) }
            : s,
        ),
      );
    });
  };

  return (
    <div
      ref={wrapRef}
      onClick={(e) => e.stopPropagation()}
      class="relative shrink-0 flex items-center gap-0.5"
    >
      <IconBtn
        tooltip="Add tag to all"
        active={panel === "tag"}
        tone="purple"
        onClick={() => setPanel(panel === "tag" ? null : "tag")}
      >
        <Tag size={13} weight={panel === "tag" ? "fill" : "regular"} />
      </IconBtn>
      <IconBtn
        tooltip="Add note to all"
        active={panel === "note"}
        tone="cyan"
        onClick={() => setPanel(panel === "note" ? null : "note")}
      >
        <NotePencil size={13} weight={panel === "note" ? "fill" : "regular"} />
      </IconBtn>
      <IconBtn
        tooltip="Move all to window…"
        active={panel === "move"}
        onClick={() => setPanel(panel === "move" ? null : "move")}
      >
        <ArrowsLeftRight size={13} weight="bold" />
      </IconBtn>
      <IconBtn
        tooltip="Save this group as a snapshot"
        onClick={handleSaveSnapshot}
      >
        <FloppyDisk size={13} weight="fill" />
      </IconBtn>
      <span
        class="w-px h-4 mx-1 bg-border opacity-0 group-hover:opacity-100 transition-opacity"
        aria-hidden="true"
      />
      <IconBtn tooltip="Close all in group" danger onClick={handleCloseAll}>
        <X size={13} weight="bold" />
      </IconBtn>

      {panel === "tag" && (
        <Popover>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAddTag();
            }}
            class="flex items-center gap-1.5"
          >
            <input
              type="text"
              autoFocus
              value={tagInput}
              onInput={(e) =>
                setTagInput((e.currentTarget as HTMLInputElement).value)
              }
              placeholder={`Tag for ${ids.length} tab${ids.length === 1 ? "" : "s"}…`}
              class="flex-1 h-7 px-2 bg-bg border border-accent rounded text-[11px] placeholder:text-fg-subtle focus:outline-none focus:ring-2 focus:ring-accent/10"
            />
            <button
              type="submit"
              disabled={!tagInput.trim() || busy}
              aria-label="Apply"
              class="size-7 inline-flex items-center justify-center rounded bg-accent text-white hover:bg-accent-hover disabled:opacity-40 transition-colors"
            >
              <Check size={11} weight="bold" />
            </button>
          </form>
        </Popover>
      )}

      {panel === "note" && (
        <Popover wide>
          <textarea
            autoFocus
            value={noteInput}
            onInput={(e) =>
              setNoteInput((e.currentTarget as HTMLTextAreaElement).value)
            }
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleAddNote();
              }
            }}
            placeholder={`Note attached to all ${ids.length} tab${ids.length === 1 ? "" : "s"}…`}
            rows={3}
            class="w-full px-2 py-1.5 bg-bg border border-border rounded text-[11px] placeholder:text-fg-subtle focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-colors resize-none"
          />
          <div class="mt-1.5 flex items-center justify-between gap-1.5">
            <span class="text-[10px] text-fg-subtle">⌘+Enter to apply</span>
            <div class="flex gap-1">
              <button
                type="button"
                onClick={() => setPanel(null)}
                class="h-6 px-2 text-[11px] text-fg-muted hover:text-fg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddNote}
                disabled={!noteInput.trim() || busy}
                class="h-6 px-2 text-[11px] font-medium rounded bg-accent text-white hover:bg-accent-hover disabled:opacity-40 transition-colors"
              >
                Apply
              </button>
            </div>
          </div>
        </Popover>
      )}

      {panel === "move" && (
        <Popover wide>
          <div class="max-h-[200px] overflow-y-auto space-y-0.5">
            <button
              type="button"
              onClick={handleMoveNew}
              disabled={busy}
              class="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent-subtle text-accent text-[11px] font-medium transition-colors disabled:opacity-40"
            >
              <Plus size={11} weight="bold" />
              New window
            </button>
            <div class="border-t border-border my-1" />
            {windows.map((w) => {
              const color = windowColors[w.id];
              const cs = color ? WINDOW_COLOR_STYLES[color] : null;
              const display = w.customTitle || `Window ${w.id}`;
              return (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => handleMove(w.id)}
                  disabled={busy}
                  class={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left transition-colors disabled:opacity-40 ${
                    cs
                      ? `${cs.headerBg} hover:${cs.headerBg}`
                      : "hover:bg-surface"
                  }`}
                >
                  {cs ? (
                    <span
                      class={`size-1.5 rounded-full shrink-0 ${cs.dot}`}
                    />
                  ) : (
                    <Browser size={11} class="text-fg-muted shrink-0" />
                  )}
                  <span
                    class={`text-[11px] font-medium truncate flex-1 ${
                      cs ? cs.titleText : "text-fg"
                    }`}
                  >
                    {display}
                  </span>
                  <span class="text-[10px] text-fg-subtle shrink-0">
                    {w.tabCount}
                  </span>
                </button>
              );
            })}
          </div>
        </Popover>
      )}
    </div>
  );
}

function IconBtn(props: {
  tooltip: string;
  active?: boolean;
  danger?: boolean;
  tone?: "accent" | "purple" | "cyan";
  onClick: () => void;
  children: preact.ComponentChildren;
}) {
  const tone = props.tone ?? "accent";
  const toneMap = {
    accent: {
      hover: "hover:bg-accent-subtle hover:text-accent",
      active: "opacity-100 bg-accent-subtle text-accent",
    },
    purple: {
      hover: "hover:bg-purple-500/15 hover:text-purple-600",
      active: "opacity-100 bg-purple-500/15 text-purple-600",
    },
    cyan: {
      hover: "hover:bg-cyan-500/15 hover:text-cyan-600",
      active: "opacity-100 bg-cyan-500/15 text-cyan-600",
    },
  } as const;
  const hover = props.danger
    ? "hover:bg-danger-subtle hover:text-danger"
    : toneMap[tone].hover;
  return (
    <button
      type="button"
      onClick={props.onClick}
      aria-label={props.tooltip}
      title={props.tooltip}
      class={`size-7 inline-flex items-center justify-center rounded transition-all opacity-0 group-hover:opacity-100 ${
        props.active
          ? toneMap[tone].active
          : `text-fg-subtle ${hover}`
      }`}
    >
      {props.children}
    </button>
  );
}

function Popover(props: {
  wide?: boolean;
  children: preact.ComponentChildren;
}) {
  return (
    <div
      class={`absolute right-0 top-full mt-1.5 ${props.wide ? "w-[260px]" : "w-[220px]"} bg-bg-elevated border border-border rounded-lg shadow-xl z-30 p-2`}
    >
      {props.children}
    </div>
  );
}

