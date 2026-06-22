import { useState, useEffect, useRef } from "preact/hooks";
import {
  Browsers,
  PencilSimple,
  Check,
  X,
  Globe,
  PushPin,
  ArrowSquareOut,
  DotsThree,
  Broom,
  ArrowsSplit,
  ArrowsMerge,
  ArrowRight,
  ArrowsLeftRight,
  ArrowSquareIn,
  ArrowSquareUpRight,
  Moon,
  XCircle,
  PawPrint,
  SpeakerHigh,
  SpeakerSlash,
  Tag,
  NotePencil,
} from "@phosphor-icons/react";
import {
  setWindowTitle,
  setWindowColor,
  type WindowWithPawTabs,
} from "@/lib/windows";
import {
  WINDOW_COLOR_PALETTE,
  WINDOW_COLOR_STYLES,
} from "@/lib/window-colors";
import type { WindowColor } from "@/types";
import {
  focusTab,
  closeTab,
  togglePinned,
  toggleMuted,
  toggleStarred,
} from "@/lib/chrome";
import { getRootDomain } from "@/lib/utils";
import type { PawTab } from "@/types";

interface Props {
  window: WindowWithPawTabs;
  isSelectionSource: boolean;
  isMoveTarget: boolean;
  selectedIds: Set<number>;
  onStartSelection: (windowId: number) => void;
  onStartMergeAll: (windowId: number) => void;
  onStartMoveSingle: (windowId: number, tabId: number) => void;
  onToggleTab: (tabId: number) => void;
  onSelectAll: () => void;
  onPickDestination: (windowId: number) => Promise<void>;
  onCancel: () => void;
  onSplit: (windowId: number, chunkSize: number) => Promise<void>;
  onCloseNonPinned: (windowId: number) => Promise<void>;
  onCloseWindow: (windowId: number) => Promise<void>;
  onAction: () => void;
  onOpenDetails: (tab: PawTab) => void;
  onReload: () => void;
}

type CardMode = "view" | "menu" | "split";

export function WindowCard({
  window,
  isSelectionSource,
  isMoveTarget,
  selectedIds,
  onStartSelection,
  onStartMergeAll,
  onStartMoveSingle,
  onToggleTab,
  onSelectAll,
  onPickDestination,
  onCancel,
  onSplit,
  onCloseNonPinned,
  onCloseWindow,
  onAction,
  onOpenDetails,
  onReload,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [draftColor, setDraftColor] = useState<WindowColor | null>(null);
  const [mode, setMode] = useState<CardMode>("view");
  const [splitSize, setSplitSize] = useState(5);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mode !== "menu") return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMode("view");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [mode]);

  const displayTitle = window.customTitle || `Window ${window.id}`;
  const nonPinnedCount = window.tabs.filter((t) => !t.pinned).length;
  const selectionCount = selectedIds.size;

  const startEdit = () => {
    setDraft(window.customTitle ?? "");
    setDraftColor(window.color);
    setEditing(true);
  };
  const cancelEdit = () => {
    setEditing(false);
    setDraft("");
    setDraftColor(null);
  };
  const commitEdit = async () => {
    await setWindowTitle(window.id, draft);
    await setWindowColor(window.id, draftColor);
    setEditing(false);
    setDraft("");
    setDraftColor(null);
    onReload();
  };

  const handleFocusWindow = async (e: MouseEvent) => {
    e.stopPropagation();
    await chrome.windows.update(window.id, { focused: true });
  };

  const handleCardClick = async () => {
    if (isMoveTarget && selectionCount > 0) {
      await onPickDestination(window.id);
    }
  };

  const handleStartMove = (e: MouseEvent) => {
    e.stopPropagation();
    setMode("view");
    onStartSelection(window.id);
  };

  const handleStartMerge = (e: MouseEvent) => {
    e.stopPropagation();
    setMode("view");
    onStartMergeAll(window.id);
  };

  const handleSplitConfirm = async (e: Event) => {
    e.stopPropagation();
    await onSplit(window.id, Math.max(1, splitSize));
    setMode("view");
  };

  const handleCloseNonPinned = async (e: MouseEvent) => {
    e.stopPropagation();
    await onCloseNonPinned(window.id);
    setMode("view");
  };

  const handleCloseWindow = async (e: MouseEvent) => {
    e.stopPropagation();
    setMode("view");
    await onCloseWindow(window.id);
  };

  const inSelectMode = isSelectionSource || isMoveTarget;

  const colorStyle = window.color ? WINDOW_COLOR_STYLES[window.color] : null;
  const hasIdentity = !!window.customTitle || !!window.color;

  let borderClass: string;
  if (isMoveTarget) {
    borderClass =
      selectionCount > 0
        ? "border-2 border-accent bg-accent-subtle/30 ring-4 ring-accent/15 cursor-pointer hover:bg-accent-subtle/60 hover:ring-accent/30 hover:scale-[1.01]"
        : "border-2 border-dashed border-border opacity-60";
  } else if (isSelectionSource) {
    borderClass = "border-2 border-border-strong shadow-md bg-surface/40";
  } else if (window.focused) {
    borderClass = "border-2 border-accent/40 bg-accent-subtle/10 shadow-sm";
  } else if (colorStyle) {
    borderClass = `border border-border ${colorStyle.border} border-l-[4px] hover:border-border-strong shadow-sm`;
  } else if (hasIdentity) {
    borderClass = "border border-border-strong shadow-sm";
  } else {
    borderClass = "border border-border hover:border-border-strong";
  }

  const headerBgClass = !isMoveTarget && !isSelectionSource && colorStyle
    ? colorStyle.headerBg
    : "bg-surface/40";

  return (
    <div
      onClick={handleCardClick}
      class={`relative flex flex-col bg-bg rounded-lg overflow-visible transition-all ${borderClass}`}
    >
      {isMoveTarget && selectionCount > 0 && (
        <div class="absolute -top-2.5 left-3 z-10 inline-flex items-center gap-1 px-2 py-0.5 bg-accent text-white text-[10px] font-semibold rounded-full uppercase tracking-wider shadow-sm animate-pulse-soft">
          <ArrowSquareIn size={10} weight="bold" />
          Drop here
        </div>
      )}
      {isSelectionSource && (
        <div class="absolute -top-2.5 left-3 z-10 inline-flex items-center gap-1 px-2 py-0.5 bg-fg text-bg text-[10px] font-semibold rounded-full uppercase tracking-wider shadow-sm">
          <ArrowSquareUpRight size={10} weight="bold" />
          From
        </div>
      )}
      {window.focused && !isMoveTarget && !isSelectionSource && (
        <div class="absolute -top-2.5 left-3 z-10 inline-flex items-center gap-1 px-2 py-0.5 bg-accent text-white text-[10px] font-semibold rounded-full uppercase tracking-wider shadow-sm">
          <span class="size-1.5 rounded-full bg-white animate-pulse" />
          Current
        </div>
      )}
      <div class={`flex items-center gap-2 px-3 py-2 border-b border-border ${headerBgClass}`}>
        {colorStyle ? (
          <span class={`size-3 rounded-full shrink-0 ${colorStyle.dot}`} />
        ) : (
          <Browsers
            size={13}
            weight={window.focused ? "fill" : "regular"}
            class={window.focused ? "text-accent" : "text-fg-muted"}
          />
        )}
        {editing ? (
          <div class="flex-1 space-y-2" onClick={(e) => e.stopPropagation()}>
            <div class="flex items-center gap-2">
              <input
                type="text"
                autoFocus
                value={draft}
                onInput={(e) =>
                  setDraft((e.currentTarget as HTMLInputElement).value)
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commitEdit();
                  } else if (e.key === "Escape") {
                    e.preventDefault();
                    cancelEdit();
                  }
                }}
                placeholder={`Window ${window.id}`}
                class="flex-1 h-7 px-2 bg-bg-elevated border border-accent rounded text-[12px] font-medium focus:outline-none focus:ring-4 focus:ring-accent/10"
              />
              <button
                type="button"
                onClick={commitEdit}
                aria-label="Save"
                data-tooltip="Save"
                data-tooltip-pos="above"
                class="size-7 inline-flex items-center justify-center rounded text-fg-muted hover:bg-success-subtle hover:text-success transition-colors"
              >
                <Check size={13} weight="bold" />
              </button>
              <button
                type="button"
                onClick={cancelEdit}
                aria-label="Cancel"
                data-tooltip="Cancel"
                data-tooltip-pos="above"
                class="size-7 inline-flex items-center justify-center rounded text-fg-muted hover:bg-surface hover:text-fg transition-colors"
              >
                <X size={13} weight="bold" />
              </button>
            </div>
            <div class="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setDraftColor(null)}
                data-tooltip="No color"
                data-tooltip-pos="above"
                aria-label="No color"
                class={`size-5 rounded-full border-2 inline-flex items-center justify-center transition-all ${
                  draftColor === null
                    ? "border-fg"
                    : "border-border hover:border-border-strong"
                }`}
              >
                <span class="text-[9px] text-fg-subtle leading-none">×</span>
              </button>
              {WINDOW_COLOR_PALETTE.map((c) => {
                const s = WINDOW_COLOR_STYLES[c.value];
                const selected = draftColor === c.value;
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setDraftColor(c.value)}
                    data-tooltip={c.label}
                    data-tooltip-pos="above"
                    aria-label={c.label}
                    class={`size-5 rounded-full ${s.swatch} transition-all ${
                      selected
                        ? "ring-2 ring-offset-2 ring-offset-bg ring-fg scale-110"
                        : "hover:scale-110"
                    }`}
                  />
                );
              })}
            </div>
          </div>
        ) : (
          <>
            <div class="flex-1 min-w-0">
              <div class="text-[13px] font-medium text-fg truncate">
                {displayTitle}
              </div>
              <div class="text-[10px] text-fg-subtle">
                {window.tabs.length} tab{window.tabs.length === 1 ? "" : "s"}
                {window.focused && (
                  <span class="ml-1.5 text-accent">· focused</span>
                )}
                {isMoveTarget && selectionCount > 0 && (
                  <span class="ml-1.5 text-accent">
                    · click to move {selectionCount} here
                  </span>
                )}
                {isSelectionSource && (
                  <span class="ml-1.5 text-accent">
                    · {selectionCount} selected
                  </span>
                )}
              </div>
            </div>
            {!inSelectMode && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    startEdit();
                  }}
                  aria-label="Rename window"
                  data-tooltip="Rename window"
                  data-tooltip-pos="above"
                  class="size-7 inline-flex items-center justify-center rounded text-fg-muted hover:bg-accent-subtle hover:text-accent transition-colors"
                >
                  <PencilSimple size={12} />
                </button>
                <button
                  type="button"
                  onClick={handleFocusWindow}
                  aria-label="Focus this window in Chrome"
                  data-tooltip="Focus this window in Chrome"
                  data-tooltip-pos="above"
                  class="size-7 inline-flex items-center justify-center rounded text-fg-muted hover:bg-accent-subtle hover:text-accent transition-colors"
                >
                  <ArrowSquareOut size={12} />
                </button>
                <div ref={menuRef} class="relative">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMode(mode === "menu" ? "view" : "menu");
                    }}
                    aria-label="Window actions"
                    data-tooltip="More actions"
                    data-tooltip-pos="above"
                    class={`size-7 inline-flex items-center justify-center rounded transition-colors ${
                      mode === "menu"
                        ? "bg-surface text-fg"
                        : "text-fg-muted hover:bg-surface hover:text-fg"
                    }`}
                  >
                    <DotsThree size={14} weight="bold" />
                  </button>
                  {mode === "menu" && (
                    <div class="absolute right-0 top-full mt-1 z-20 w-52 bg-bg-elevated border border-border rounded-md shadow-md py-1 text-[12px]">
                      <MenuItem
                        icon={<ArrowRight size={12} />}
                        label="Move tabs…"
                        onClick={handleStartMove}
                        disabled={window.tabs.length === 0}
                      />
                      <MenuItem
                        icon={<ArrowsMerge size={12} />}
                        label="Merge into another…"
                        onClick={handleStartMerge}
                        disabled={window.tabs.length === 0}
                      />
                      <MenuItem
                        icon={<ArrowsSplit size={12} />}
                        label="Split window…"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMode("split");
                        }}
                        disabled={window.tabs.length < 2}
                      />
                      <div class="border-t border-border my-1" />
                      <MenuItem
                        icon={<Broom size={12} />}
                        label={`Close ${nonPinnedCount} non-pinned`}
                        onClick={handleCloseNonPinned}
                        disabled={nonPinnedCount === 0}
                        tone="danger"
                      />
                      <MenuItem
                        icon={<XCircle size={12} />}
                        label={`Close window (${window.tabs.length} ${window.tabs.length === 1 ? "tab" : "tabs"})`}
                        onClick={handleCloseWindow}
                        disabled={window.tabs.length === 0}
                        tone="danger"
                      />
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {isSelectionSource && (
        <div class="flex items-center gap-2 px-3 py-1.5 border-b border-border bg-accent-subtle/50">
          <span class="text-[11px] text-accent font-medium">
            {selectionCount} of {window.tabs.length} selected
          </span>
          <span class="text-[10px] text-accent/60">·</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelectAll();
            }}
            class="text-[11px] text-accent hover:underline font-medium"
          >
            {selectionCount === window.tabs.length ? "Deselect all" : "Select all"}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onCancel();
            }}
            class="ml-auto text-[11px] text-fg-muted hover:text-fg"
          >
            Cancel
          </button>
        </div>
      )}

      {mode === "split" && (
        <div class="px-3 py-2 border-b border-border bg-accent-subtle/30">
          <div class="text-[11px] text-fg-muted mb-1.5">
            Split into smaller windows of{" "}
            <span class="text-fg font-medium">{splitSize}</span> tab
            {splitSize === 1 ? "" : "s"} each.
          </div>
          <div
            class="flex items-center gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="number"
              min={1}
              max={window.tabs.length - 1}
              value={splitSize}
              onInput={(e) =>
                setSplitSize(
                  parseInt((e.currentTarget as HTMLInputElement).value, 10) ||
                    1,
                )
              }
              class="w-16 h-7 px-2 text-center bg-bg border border-border rounded text-[12px] focus:outline-none focus:border-accent focus:ring-4 focus:ring-accent/10"
            />
            <button
              type="button"
              onClick={handleSplitConfirm}
              class="h-7 px-2.5 text-[11px] font-medium rounded bg-accent text-white hover:bg-accent-hover transition-colors inline-flex items-center gap-1"
            >
              <ArrowsSplit size={13} />
              Split
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setMode("view");
              }}
              class="h-7 px-2 text-[11px] text-fg-muted hover:text-fg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div class="flex-1 max-h-[280px] overflow-y-auto p-1 space-y-0.5">
        {window.tabs.map((tab) => (
          <CompactTabRow
            key={tab.id}
            tab={tab}
            inSelectMode={isSelectionSource}
            isOtherCardSelectMode={isMoveTarget}
            selected={selectedIds.has(tab.id)}
            onToggleSelect={() => onToggleTab(tab.id)}
            onMoveSingle={() => onStartMoveSingle(window.id, tab.id)}
            onOpenDetails={() => onOpenDetails(tab)}
            onAction={onAction}
          />
        ))}
        {window.tabs.length === 0 && (
          <div class="text-[11px] text-fg-subtle italic text-center py-4">
            No tabs
          </div>
        )}
      </div>
    </div>
  );
}

function MenuItem(props: {
  icon: preact.ComponentChildren;
  label: string;
  onClick: (e: MouseEvent) => void;
  disabled?: boolean;
  tone?: "default" | "danger";
}) {
  const toneCls =
    props.tone === "danger"
      ? "text-danger hover:bg-danger-subtle"
      : "text-fg hover:bg-surface";
  return (
    <button
      type="button"
      onClick={props.onClick}
      disabled={props.disabled}
      class={`w-full px-2.5 py-1.5 flex items-center gap-2 text-left transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${toneCls}`}
    >
      <span class="shrink-0">{props.icon}</span>
      <span class="truncate">{props.label}</span>
    </button>
  );
}

function notesTooltipText(notes: { text: string }[]): string {
  if (notes.length === 0) return "";
  const first = notes[0]!.text.slice(0, 100);
  const truncated = notes[0]!.text.length > 100 ? "…" : "";
  if (notes.length === 1) return `"${first}${truncated}"`;
  return `"${first}${truncated}"  (+${notes.length - 1} more — click row)`;
}

function CompactTabRow(props: {
  tab: PawTab;
  inSelectMode: boolean;
  isOtherCardSelectMode: boolean;
  selected: boolean;
  onToggleSelect: () => void;
  onMoveSingle: () => void;
  onOpenDetails: () => void;
  onAction: () => void;
}) {
  const handleClick = (e: MouseEvent) => {
    if (props.isOtherCardSelectMode) {
      // Let the target card receive the click for move destination
      return;
    }
    e.stopPropagation();
    if (props.inSelectMode) {
      props.onToggleSelect();
      return;
    }
    // Regular mode: open tab details (tags, notes, move).
    props.onOpenDetails();
  };

  const stop = (e: Event) => e.stopPropagation();
  const wrap = (fn: () => Promise<void>) => async (e: MouseEvent) => {
    stop(e);
    await fn();
    props.onAction();
  };

  const handleJump = async (e: MouseEvent) => {
    stop(e);
    await focusTab(props.tab.id, props.tab.windowId);
  };
  const handleMoveSingle = (e: MouseEvent) => {
    stop(e);
    props.onMoveSingle();
  };
  const handlePaw = wrap(async () => {
    await toggleStarred(props.tab.id);
  });
  const handlePin = wrap(() => togglePinned(props.tab.id, !props.tab.pinned));
  const handleMute = wrap(() => toggleMuted(props.tab.id, !props.tab.muted));
  const handleClose = wrap(() => closeTab(props.tab.id));

  let rowClass = "hover:bg-surface cursor-pointer";
  if (props.selected) rowClass = "bg-accent-subtle ring-1 ring-accent/40";
  else if (props.isOtherCardSelectMode)
    rowClass = "opacity-70 pointer-events-none";
  else if (props.tab.discarded)
    rowClass =
      "opacity-60 hover:opacity-100 hover:bg-surface bg-surface/30 cursor-pointer";

  const showActions = !props.inSelectMode && !props.isOtherCardSelectMode;

  const domain = getRootDomain(props.tab.url);

  return (
    <div
      onClick={handleClick}
      class={`group flex items-start gap-2.5 px-2 py-1.5 rounded transition-colors ${rowClass}`}
    >
      {props.inSelectMode && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            props.onToggleSelect();
          }}
          aria-label={props.selected ? "Deselect tab" : "Select tab"}
          class={`size-4 rounded border shrink-0 inline-flex items-center justify-center transition-all ${
            props.selected
              ? "bg-accent border-accent text-white"
              : "border-border-strong hover:border-accent"
          }`}
        >
          {props.selected && (
            <svg
              viewBox="0 0 16 16"
              class="size-3"
              fill="none"
              stroke="currentColor"
              stroke-width="3"
            >
              <path d="M3 8.5L6.5 12L13 4" />
            </svg>
          )}
        </button>
      )}
      {props.tab.favIconUrl ? (
        <img
          src={props.tab.favIconUrl}
          alt=""
          class={`size-4 shrink-0 rounded-sm ${props.tab.discarded ? "grayscale" : ""}`}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      ) : (
        <Globe
          size={14}
          class={`text-fg-subtle shrink-0 ${props.tab.discarded ? "grayscale" : ""}`}
        />
      )}

      <div class="flex-1 min-w-0">
        <div
          class={`text-[13px] leading-snug break-words line-clamp-2 flex items-baseline gap-1.5 ${
            props.tab.discarded ? "italic text-fg-muted" : "text-fg"
          }`}
        >
          {props.tab.discarded && (
            <Moon
              size={11}
              weight="fill"
              class="text-fg-subtle shrink-0 relative top-[2px]"
            />
          )}
          <span>{props.tab.title || domain || "Untitled"}</span>
        </div>
        <div class="text-[11px] text-fg-subtle leading-tight mt-1 break-all line-clamp-2">
          {props.tab.url}
        </div>
        {props.tab.notes.length > 0 && (
          <div class="text-[11px] text-fg-subtle mt-1 flex items-center gap-2 flex-wrap">
            <span
              data-tooltip={notesTooltipText(props.tab.notes)}
              data-tooltip-pos="above"
              class="inline-flex items-center gap-0.5 text-accent shrink-0 cursor-help"
            >
              <NotePencil size={10} weight="fill" />
              {props.tab.notes.length} note
              {props.tab.notes.length === 1 ? "" : "s"}
            </span>
          </div>
        )}
        {props.tab.tags.length > 0 && (
          <div class="flex items-center flex-wrap gap-1 mt-1.5">
            {props.tab.tags.map((t) => (
              <span
                key={t}
                class="inline-flex items-center gap-1 px-1.5 h-4 bg-accent-subtle text-accent-fg text-[10px] rounded"
              >
                <Tag size={8} weight="fill" class="text-accent" />
                {t}
              </span>
            ))}
          </div>
        )}
      </div>

      {showActions && (
        <div class="flex items-center gap-0 shrink-0">
          <TinyActionBtn
            title={props.tab.starred ? "Unpaw" : "Paw"}
            active={props.tab.starred}
            tone="accent"
            onClick={handlePaw}
          >
            <PawPrint
              size={13}
              weight={props.tab.starred ? "fill" : "regular"}
            />
          </TinyActionBtn>
          <TinyActionBtn
            title={props.tab.pinned ? "Unpin" : "Pin"}
            active={props.tab.pinned}
            tone="warning"
            onClick={handlePin}
          >
            <PushPin
              size={13}
              weight={props.tab.pinned ? "fill" : "regular"}
            />
          </TinyActionBtn>
          {(props.tab.audible || props.tab.muted) && (
            <TinyActionBtn
              title={props.tab.muted ? "Unmute" : "Mute"}
              active={props.tab.muted || props.tab.audible}
              tone={props.tab.muted ? "danger" : "success"}
              forceVisible
              onClick={handleMute}
            >
              {props.tab.muted ? (
                <SpeakerSlash size={13} />
              ) : (
                <SpeakerHigh size={13} />
              )}
            </TinyActionBtn>
          )}
          <TinyActionBtn
            title="Move to another window"
            tone="accent"
            onClick={handleMoveSingle}
          >
            <ArrowsLeftRight size={12} weight="bold" />
          </TinyActionBtn>
          <TinyActionBtn
            title="Jump to tab"
            tone="accent"
            onClick={handleJump}
          >
            <ArrowSquareOut size={13} />
          </TinyActionBtn>
          <span
            class="w-px h-3 mx-0.5 bg-border opacity-0 group-hover:opacity-100 transition-opacity"
            aria-hidden="true"
          />
          <TinyActionBtn
            title="Close tab"
            tone="danger"
            onClick={handleClose}
          >
            <X size={13} />
          </TinyActionBtn>
        </div>
      )}

      {!showActions && props.tab.pinned && (
        <PushPin size={11} weight="fill" class="text-warning shrink-0" />
      )}
    </div>
  );
}

const TONE_ACTIVE = {
  accent: "text-accent",
  warning: "text-warning",
  success: "text-success",
  danger: "text-danger",
} as const;
const TONE_HOVER = {
  accent: "hover:bg-accent-subtle hover:text-accent",
  warning: "hover:bg-warning-subtle hover:text-warning",
  success: "hover:bg-success-subtle hover:text-success",
  danger: "hover:bg-danger-subtle hover:text-danger",
} as const;

function TinyActionBtn(props: {
  title: string;
  tone: keyof typeof TONE_ACTIVE;
  active?: boolean;
  forceVisible?: boolean;
  onClick: (e: MouseEvent) => void;
  children: preact.ComponentChildren;
}) {
  const activeCls = props.active ? TONE_ACTIVE[props.tone] : "text-fg-subtle";
  const visibility =
    props.active || props.forceVisible
      ? "opacity-100"
      : "opacity-0 group-hover:opacity-100";
  return (
    <button
      type="button"
      onClick={props.onClick}
      aria-label={props.title}
      data-tooltip={props.title}
      data-tooltip-pos="above"
      class={`size-6 inline-flex items-center justify-center rounded ${activeCls} ${visibility} ${TONE_HOVER[props.tone]} transition-all`}
    >
      {props.children}
    </button>
  );
}
