import { useState, useEffect, useRef } from "preact/hooks";
import {
  Browsers,
  PencilSimple,
  Check,
  X,
  Globe,
  PushPin,
  ArrowSquareOut,
  ArrowRight,
  DotsThree,
  Broom,
  ArrowsSplit,
  ArrowsMerge,
} from "@phosphor-icons/react";
import { setWindowTitle, type WindowWithMeta } from "@/lib/windows";
import { focusTab } from "@/lib/chrome";

interface Props {
  window: WindowWithMeta;
  movingTabIds: number[] | null;
  isMoveTarget: boolean;
  onStartMoveTab: (tabId: number) => void;
  onStartMergeWindow: (tabIds: number[], sourceWindowId: number) => void;
  onCancelMove: () => void;
  onPickTarget: (windowId: number) => Promise<void>;
  onSplit: (windowId: number, chunkSize: number) => Promise<void>;
  onCloseNonPinned: (windowId: number) => Promise<void>;
  onReload: () => void;
}

type CardMode = "view" | "menu" | "split";

export function WindowCard({
  window,
  movingTabIds,
  isMoveTarget,
  onStartMoveTab,
  onStartMergeWindow,
  onCancelMove,
  onPickTarget,
  onSplit,
  onCloseNonPinned,
  onReload,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
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
  const containsMovingTab =
    movingTabIds !== null && movingTabIds.some((id) =>
      window.tabs.some((t) => t.id === id),
    );
  const nonPinnedCount = window.tabs.filter((t) => !t.pinned).length;

  const startEdit = () => {
    setDraft(window.customTitle ?? "");
    setEditing(true);
  };
  const cancelEdit = () => {
    setEditing(false);
    setDraft("");
  };
  const commitEdit = async () => {
    await setWindowTitle(window.id, draft);
    setEditing(false);
    setDraft("");
    onReload();
  };

  const handleFocusWindow = async (e: MouseEvent) => {
    e.stopPropagation();
    await chrome.windows.update(window.id, { focused: true });
  };

  const handleCardClick = async () => {
    if (isMoveTarget) {
      await onPickTarget(window.id);
    } else if (containsMovingTab) {
      onCancelMove();
    }
  };

  const handleMergeIntoOther = (e: MouseEvent) => {
    e.stopPropagation();
    const allIds = window.tabs
      .map((t) => t.id)
      .filter((id): id is number => id !== undefined);
    onStartMergeWindow(allIds, window.id);
    setMode("view");
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

  const borderClass = isMoveTarget
    ? "border-accent ring-4 ring-accent/15 cursor-pointer hover:bg-accent-subtle/30"
    : containsMovingTab
      ? "border-border-strong opacity-60"
      : window.focused
        ? "border-border-strong"
        : "border-border hover:border-border-strong";

  return (
    <div
      onClick={handleCardClick}
      class={`relative flex flex-col bg-bg border rounded-lg overflow-visible transition-all ${borderClass}`}
    >
      <div class="flex items-center gap-2 px-3 py-2 border-b border-border bg-surface/40">
        <Browsers
          size={13}
          weight={window.focused ? "fill" : "regular"}
          class={window.focused ? "text-accent" : "text-fg-muted"}
        />
        {editing ? (
          <>
            <input
              type="text"
              autoFocus
              value={draft}
              onClick={(e) => e.stopPropagation()}
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
              class="flex-1 h-6 px-2 bg-bg-elevated border border-accent rounded text-[12px] font-medium focus:outline-none focus:ring-4 focus:ring-accent/10"
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                commitEdit();
              }}
              aria-label="Save"
              class="size-6 inline-flex items-center justify-center rounded text-fg-muted hover:bg-success-subtle hover:text-success transition-colors"
            >
              <Check size={11} weight="bold" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                cancelEdit();
              }}
              aria-label="Cancel"
              class="size-6 inline-flex items-center justify-center rounded text-fg-muted hover:bg-surface hover:text-fg transition-colors"
            >
              <X size={11} weight="bold" />
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                startEdit();
              }}
              class="flex-1 min-w-0 text-left group/title rounded px-1 -mx-1 hover:bg-surface transition-colors"
              title="Click to rename window"
            >
              <div class="text-[13px] font-medium text-fg truncate flex items-center gap-1.5">
                <span class="truncate">{displayTitle}</span>
                <PencilSimple
                  size={10}
                  class="text-fg-subtle opacity-0 group-hover/title:opacity-100 transition-opacity shrink-0"
                />
              </div>
              <div class="text-[10px] text-fg-subtle">
                {window.tabs.length} tab{window.tabs.length === 1 ? "" : "s"}
                {window.focused && (
                  <span class="ml-1.5 text-accent">· focused</span>
                )}
                {isMoveTarget && (
                  <span class="ml-1.5 text-accent">· click to move here</span>
                )}
              </div>
            </button>
            <button
              type="button"
              onClick={handleFocusWindow}
              aria-label="Focus window"
              title="Focus this window"
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
                title="More actions"
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
                    icon={<ArrowsSplit size={12} />}
                    label="Split window…"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMode("split");
                    }}
                    disabled={window.tabs.length < 2}
                  />
                  <MenuItem
                    icon={<ArrowsMerge size={12} />}
                    label="Merge into another…"
                    onClick={handleMergeIntoOther}
                    disabled={window.tabs.length === 0}
                  />
                  <div class="border-t border-border my-1" />
                  <MenuItem
                    icon={<Broom size={12} />}
                    label={`Close ${nonPinnedCount} non-pinned`}
                    onClick={handleCloseNonPinned}
                    disabled={nonPinnedCount === 0}
                    tone="danger"
                  />
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {mode === "split" && (
        <div class="px-3 py-2 border-b border-border bg-accent-subtle/30">
          <div class="text-[11px] text-fg-muted mb-1.5">
            Split this window into smaller windows of{" "}
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
              <ArrowsSplit size={11} />
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
            key={tab.id ?? Math.random()}
            tab={tab}
            isMoving={
              movingTabIds !== null &&
              tab.id !== undefined &&
              movingTabIds.includes(tab.id)
            }
            disabled={movingTabIds !== null}
            onStartMove={() => {
              if (tab.id !== undefined) onStartMoveTab(tab.id);
            }}
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

function CompactTabRow(props: {
  tab: chrome.tabs.Tab;
  isMoving: boolean;
  disabled: boolean;
  onStartMove: () => void;
}) {
  const handleClick = async (e: MouseEvent) => {
    e.stopPropagation();
    if (props.disabled) return;
    if (props.tab.id === undefined) return;
    await focusTab(props.tab.id, props.tab.windowId ?? 0);
  };

  const handleMove = (e: MouseEvent) => {
    e.stopPropagation();
    props.onStartMove();
  };

  const rowClass = props.isMoving
    ? "bg-accent-subtle ring-1 ring-accent/40"
    : props.disabled
      ? "opacity-40"
      : "hover:bg-surface cursor-pointer";

  return (
    <div
      onClick={handleClick}
      class={`group flex items-center gap-1.5 px-1.5 py-1 rounded text-[12px] transition-colors ${rowClass}`}
    >
      {props.tab.favIconUrl ? (
        <img
          src={props.tab.favIconUrl}
          alt=""
          class="size-3.5 shrink-0 rounded-sm"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      ) : (
        <Globe size={12} class="text-fg-subtle shrink-0" />
      )}
      <span class="flex-1 truncate text-fg">
        {props.tab.title || props.tab.url}
      </span>
      {props.tab.pinned && (
        <PushPin size={10} weight="fill" class="text-warning shrink-0" />
      )}
      {!props.disabled && (
        <button
          type="button"
          onClick={handleMove}
          aria-label="Move to another window"
          title="Move to another window"
          class="size-6 inline-flex items-center justify-center rounded text-fg-subtle opacity-0 group-hover:opacity-100 hover:bg-accent-subtle hover:text-accent transition-all"
        >
          <ArrowRight size={12} />
        </button>
      )}
      {props.isMoving && (
        <span class="text-[10px] font-medium text-accent shrink-0">
          pick destination →
        </span>
      )}
    </div>
  );
}
