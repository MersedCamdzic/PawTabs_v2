import { useState, useEffect, useRef } from "preact/hooks";
import {
  Lightning,
  Tag,
  NotePencil,
  ArrowsLeftRight,
  Browser,
  PushPin,
  PawPrint,
  X,
  Plus,
  CaretDown,
  Trash,
} from "@phosphor-icons/react";
import {
  closeMany,
  setPinnedMany,
  addTagToMany,
  addNoteToMany,
  moveManyToWindow,
  moveManyToNewWindow,
  setStarredManyByUrl,
  listWindowsForMove,
  type WindowInfo,
} from "@/lib/tabs";
import { getAllWindowMeta } from "@/lib/windows";
import { WINDOW_COLOR_STYLES } from "@/lib/window-colors";
import type { PawTab, WindowColor } from "@/types";

interface Props {
  tabs: PawTab[];
  label?: string;
  compact?: boolean;
  onAction: () => void;
}

type Panel = null | "tag" | "note" | "move";

export function BulkActionsMenu({ tabs, label, compact, onAction }: Props) {
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<Panel>(null);
  const [tagInput, setTagInput] = useState("");
  const [noteInput, setNoteInput] = useState("");
  const [windows, setWindows] = useState<WindowInfo[]>([]);
  const [windowColors, setWindowColors] = useState<
    Record<number, WindowColor>
  >({});
  const [windowQuery, setWindowQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const count = tabs.length;
  const tabIds = tabs.map((t) => t.id);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const w = wrapperRef.current;
      if (w && !w.contains(e.target as Node)) {
        setOpen(false);
        setPanel(null);
      }
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (panel) setPanel(null);
        else setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", esc);
    };
  }, [open, panel]);

  useEffect(() => {
    if (!open || panel !== "move") return;
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
  }, [open, panel]);

  const runAndClose = async (action: () => Promise<void>) => {
    if (busy || count === 0) return;
    setBusy(true);
    try {
      await action();
      onAction();
      setOpen(false);
      setPanel(null);
      setTagInput("");
      setNoteInput("");
      setWindowQuery("");
    } finally {
      setBusy(false);
    }
  };

  const handlePawAll = () =>
    runAndClose(() =>
      setStarredManyByUrl(
        tabs.map((t) => ({
          url: t.url,
          title: t.title,
          favIconUrl: t.favIconUrl,
        })),
        true,
      ),
    );

  const handleUnpawAll = () =>
    runAndClose(() =>
      setStarredManyByUrl(
        tabs.map((t) => ({
          url: t.url,
          title: t.title,
          favIconUrl: t.favIconUrl,
        })),
        false,
      ),
    );

  const handlePinAll = () => runAndClose(() => setPinnedMany(tabIds, true));
  const handleUnpinAll = () => runAndClose(() => setPinnedMany(tabIds, false));

  const handleCloseAll = () => {
    if (
      !confirm(
        `Close ${count} tab${count === 1 ? "" : "s"}? This cannot be undone from here.`,
      )
    )
      return;
    runAndClose(() => closeMany(tabIds));
  };

  const handleAddTag = () => {
    if (!tagInput.trim()) return;
    runAndClose(() => addTagToMany(tabIds, tagInput));
  };

  const handleAddNote = () => {
    if (!noteInput.trim()) return;
    runAndClose(() => addNoteToMany(tabIds, noteInput));
  };

  const handleMoveExisting = (windowId: number) =>
    runAndClose(() => moveManyToWindow(tabIds, windowId));

  const handleMoveNew = () => runAndClose(() => moveManyToNewWindow(tabIds));

  const buttonLabel = label ?? "Bulk";
  const disabled = count === 0;

  return (
    <div class="relative" ref={wrapperRef}>
      <button
        type="button"
        onClick={() => {
          if (disabled) return;
          setOpen((o) => !o);
          setPanel(null);
        }}
        disabled={disabled}
        data-tooltip={
          disabled ? "No tabs to act on" : `Bulk actions on ${count} tab${count === 1 ? "" : "s"}`
        }
        data-tooltip-pos="below"
        class={`${compact ? "h-7 px-2.5" : "h-9 px-3"} inline-flex items-center gap-1.5 text-[12px] font-medium rounded-md border transition-colors ${
          disabled
            ? "border-border text-fg-subtle bg-surface cursor-not-allowed opacity-60"
            : open
              ? "border-accent text-accent bg-accent-subtle"
              : compact
                ? "border-border text-fg-muted hover:bg-surface hover:text-fg bg-bg"
                : "border-border text-fg-muted hover:border-accent hover:text-accent bg-bg"
        }`}
      >
        <Lightning size={12} weight="fill" />
        {!compact && buttonLabel}
        <span
          class={`text-[10px] font-mono px-1.5 h-4 inline-flex items-center rounded ${
            disabled
              ? "bg-bg text-fg-subtle"
              : open
                ? "bg-accent/15 text-accent"
                : "bg-surface text-fg-muted"
          }`}
        >
          {count}
        </span>
        {!compact && (
          <CaretDown
            size={10}
            weight="bold"
            class={`transition-transform ${open ? "rotate-180" : ""}`}
          />
        )}
      </button>

      {open && (
        <div class="absolute right-0 top-full mt-1 w-[300px] bg-bg-elevated border border-border rounded-lg shadow-xl z-30 overflow-hidden">
          {panel === null && (
            <>
              <div class="px-3 py-2 border-b border-border bg-surface/50">
                <div class="text-[11px] text-fg-subtle">Acts on</div>
                <div class="text-[12px] font-semibold text-fg">
                  {count} tab{count === 1 ? "" : "s"}
                </div>
              </div>
              <div class="p-1">
                <Group title="Organize">
                  <Item
                    icon={<Tag size={12} weight="fill" />}
                    label="Add tag…"
                    onClick={() => setPanel("tag")}
                    tone="accent"
                  />
                  <Item
                    icon={<NotePencil size={12} weight="fill" />}
                    label="Add note…"
                    onClick={() => setPanel("note")}
                    tone="accent"
                  />
                  <Item
                    icon={<PawPrint size={12} weight="fill" />}
                    label="Paw all"
                    onClick={handlePawAll}
                    tone="accent"
                  />
                  <Item
                    icon={<PawPrint size={12} />}
                    label="Unpaw all"
                    onClick={handleUnpawAll}
                  />
                </Group>
                <Group title="Chrome">
                  <Item
                    icon={<PushPin size={12} weight="fill" />}
                    label="Pin all (in their window)"
                    onClick={handlePinAll}
                    tone="warning"
                  />
                  <Item
                    icon={<PushPin size={12} />}
                    label="Unpin all"
                    onClick={handleUnpinAll}
                  />
                  <Item
                    icon={<ArrowsLeftRight size={12} weight="bold" />}
                    label="Move all to window…"
                    onClick={() => setPanel("move")}
                    tone="accent"
                  />
                  <Item
                    icon={<Plus size={12} weight="bold" />}
                    label="Move all to NEW window"
                    onClick={handleMoveNew}
                    tone="accent"
                  />
                </Group>
                <Group title="Danger">
                  <Item
                    icon={<Trash size={12} />}
                    label="Close all"
                    onClick={handleCloseAll}
                    tone="danger"
                  />
                </Group>
              </div>
            </>
          )}

          {panel === "tag" && (
            <BackPanel onBack={() => setPanel(null)} title="Add tag to all">
              <input
                type="text"
                autoFocus
                value={tagInput}
                onInput={(e) =>
                  setTagInput((e.currentTarget as HTMLInputElement).value)
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder={`Tag for ${count} tab${count === 1 ? "" : "s"}…`}
                class="w-full h-9 px-3 bg-surface border border-border rounded-md text-[12px] placeholder:text-fg-subtle focus:outline-none focus:bg-bg-elevated focus:border-accent focus:ring-4 focus:ring-accent/10 transition-colors"
              />
              <div class="mt-2 flex justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => setPanel(null)}
                  class="h-8 px-3 text-[11px] text-fg-muted hover:text-fg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddTag}
                  disabled={!tagInput.trim() || busy}
                  class="h-8 px-3 text-[11px] font-medium rounded-md bg-accent text-white hover:bg-accent-hover disabled:opacity-40 transition-colors"
                >
                  Apply
                </button>
              </div>
            </BackPanel>
          )}

          {panel === "note" && (
            <BackPanel onBack={() => setPanel(null)} title="Add note to all">
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
                placeholder={`Note attached to all ${count} tab${count === 1 ? "" : "s"}…`}
                rows={3}
                class="w-full px-3 py-2 bg-surface border border-border rounded-md text-[12px] placeholder:text-fg-subtle focus:outline-none focus:bg-bg-elevated focus:border-accent focus:ring-4 focus:ring-accent/10 transition-colors resize-none"
              />
              <div class="mt-2 flex items-center justify-between gap-1.5">
                <span class="text-[10px] text-fg-subtle">
                  <kbd class="font-mono">⌘+Enter</kbd> to apply
                </span>
                <div class="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPanel(null)}
                    class="h-8 px-3 text-[11px] text-fg-muted hover:text-fg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAddNote}
                    disabled={!noteInput.trim() || busy}
                    class="h-8 px-3 text-[11px] font-medium rounded-md bg-accent text-white hover:bg-accent-hover disabled:opacity-40 transition-colors"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </BackPanel>
          )}

          {panel === "move" && (
            <BackPanel onBack={() => setPanel(null)} title="Move all to…">
              <input
                type="text"
                autoFocus
                value={windowQuery}
                onInput={(e) =>
                  setWindowQuery((e.currentTarget as HTMLInputElement).value)
                }
                placeholder="Search windows…"
                class="w-full h-8 px-3 mb-2 bg-surface border border-border rounded text-[12px] placeholder:text-fg-subtle focus:outline-none focus:bg-bg-elevated focus:border-accent transition-colors"
              />
              <div class="max-h-[200px] overflow-y-auto space-y-0.5">
                <button
                  type="button"
                  onClick={handleMoveNew}
                  class="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent-subtle text-accent text-[12px] font-medium transition-colors"
                >
                  <Plus size={12} weight="bold" />
                  New window
                </button>
                {windows
                  .filter((w) => {
                    const q = windowQuery.trim().toLowerCase();
                    if (!q) return true;
                    return (
                      String(w.id).includes(q) ||
                      w.firstTabTitle.toLowerCase().includes(q) ||
                      (w.customTitle ?? "").toLowerCase().includes(q)
                    );
                  })
                  .map((w) => {
                    const color = windowColors[w.id];
                    const cs = color ? WINDOW_COLOR_STYLES[color] : null;
                    const display = w.customTitle || `Window ${w.id}`;
                    return (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => handleMoveExisting(w.id)}
                        class={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left transition-colors ${
                          cs ? `${cs.headerBg} hover:${cs.headerBg}` : "hover:bg-surface"
                        }`}
                      >
                        {cs ? (
                          <span
                            class={`size-2 rounded-full shrink-0 ${cs.dot}`}
                          />
                        ) : (
                          <Browser size={12} class="text-fg-muted shrink-0" />
                        )}
                        <span
                          class={`text-[12px] font-medium truncate flex-1 ${
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
            </BackPanel>
          )}
        </div>
      )}
    </div>
  );
}

function BackPanel(props: {
  onBack: () => void;
  title: string;
  children: preact.ComponentChildren;
}) {
  return (
    <div>
      <div class="flex items-center gap-1 px-3 py-2 border-b border-border bg-surface/50">
        <button
          type="button"
          onClick={props.onBack}
          aria-label="Back"
          class="size-6 inline-flex items-center justify-center rounded text-fg-muted hover:bg-bg-elevated hover:text-fg transition-colors"
        >
          <X size={11} />
        </button>
        <span class="text-[12px] font-semibold text-fg">{props.title}</span>
      </div>
      <div class="p-3">{props.children}</div>
    </div>
  );
}

function Group(props: {
  title: string;
  children: preact.ComponentChildren;
}) {
  return (
    <div class="mb-1 last:mb-0">
      <div class="px-2 pt-1 pb-0.5 text-[9px] uppercase tracking-wider text-fg-subtle font-semibold">
        {props.title}
      </div>
      {props.children}
    </div>
  );
}

const TONE_BG = {
  accent: "hover:bg-accent-subtle hover:text-accent",
  warning: "hover:bg-warning-subtle hover:text-warning",
  danger: "hover:bg-danger-subtle hover:text-danger",
} as const;

function Item(props: {
  icon: preact.ComponentChildren;
  label: string;
  onClick: () => void;
  tone?: keyof typeof TONE_BG;
}) {
  const tone = props.tone ? TONE_BG[props.tone] : "hover:bg-surface hover:text-fg";
  return (
    <button
      type="button"
      onClick={props.onClick}
      class={`w-full flex items-center gap-2 px-2 h-8 rounded text-[12px] text-fg-muted transition-colors ${tone}`}
    >
      <span class="text-fg-subtle">{props.icon}</span>
      <span class="truncate">{props.label}</span>
    </button>
  );
}

