import { useState } from "preact/hooks";
import {
  Browsers,
  PencilSimple,
  Check,
  X,
  Globe,
  PushPin,
  ArrowSquareOut,
  ArrowRight,
} from "@phosphor-icons/react";
import { setWindowTitle, type WindowWithMeta } from "@/lib/windows";
import { focusTab } from "@/lib/chrome";

interface Props {
  window: WindowWithMeta;
  movingTabId: number | null;
  isMoveTarget: boolean;
  onStartMove: (tabId: number) => void;
  onCancelMove: () => void;
  onPickTarget: (windowId: number) => Promise<void>;
  onReload: () => void;
}

export function WindowCard({
  window,
  movingTabId,
  isMoveTarget,
  onStartMove,
  onCancelMove,
  onPickTarget,
  onReload,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const displayTitle = window.customTitle || `Window ${window.id}`;
  const containsMovingTab =
    movingTabId !== null && window.tabs.some((t) => t.id === movingTabId);

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
      class={`flex flex-col bg-bg border rounded-lg overflow-hidden transition-all ${borderClass}`}
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
          </>
        )}
      </div>

      <div class="flex-1 max-h-[280px] overflow-y-auto p-1 space-y-0.5">
        {window.tabs.map((tab) => (
          <CompactTabRow
            key={tab.id ?? Math.random()}
            tab={tab}
            isMoving={movingTabId === tab.id}
            disabled={movingTabId !== null && movingTabId !== tab.id}
            onStartMove={() => {
              if (tab.id !== undefined) onStartMove(tab.id);
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
      {!props.disabled && !props.isMoving && (
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
