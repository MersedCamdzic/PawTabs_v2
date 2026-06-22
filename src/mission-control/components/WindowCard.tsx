import { useState } from "preact/hooks";
import {
  Browsers,
  PencilSimple,
  Check,
  X,
  Globe,
  PushPin,
  ArrowSquareOut,
} from "@phosphor-icons/react";
import { setWindowTitle, type WindowWithMeta } from "@/lib/windows";
import { focusTab } from "@/lib/chrome";

interface Props {
  window: WindowWithMeta;
  draggingTabId: number | null;
  onDragStart: (tabId: number) => void;
  onDragEnd: () => void;
  onDropTab: (windowId: number) => Promise<void>;
  onReload: () => void;
}

export function WindowCard({
  window,
  draggingTabId,
  onDragStart,
  onDragEnd,
  onDropTab,
  onReload,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [isDropTarget, setIsDropTarget] = useState(false);

  const displayTitle = window.customTitle || `Window ${window.id}`;
  const canDrop =
    draggingTabId !== null &&
    !window.tabs.some((t) => t.id === draggingTabId);

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

  const handleFocusWindow = async () => {
    await chrome.windows.update(window.id, { focused: true });
  };

  return (
    <div
      onDragOver={(e) => {
        if (!canDrop) return;
        e.preventDefault();
        e.dataTransfer!.dropEffect = "move";
        setIsDropTarget(true);
      }}
      onDragLeave={() => setIsDropTarget(false)}
      onDrop={async (e) => {
        e.preventDefault();
        setIsDropTarget(false);
        if (canDrop) await onDropTab(window.id);
      }}
      class={`flex flex-col bg-bg border rounded-lg overflow-hidden transition-all ${
        isDropTarget
          ? "border-accent ring-4 ring-accent/15"
          : window.focused
            ? "border-border-strong"
            : "border-border hover:border-border-strong"
      }`}
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
              onClick={commitEdit}
              aria-label="Save"
              class="size-6 inline-flex items-center justify-center rounded text-fg-muted hover:bg-success-subtle hover:text-success transition-colors"
            >
              <Check size={11} weight="bold" />
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              aria-label="Cancel"
              class="size-6 inline-flex items-center justify-center rounded text-fg-muted hover:bg-surface hover:text-fg transition-colors"
            >
              <X size={11} weight="bold" />
            </button>
          </>
        ) : (
          <>
            <div class="flex-1 min-w-0 group">
              <div class="text-[13px] font-medium text-fg truncate flex items-center gap-1.5">
                {displayTitle}
                <button
                  type="button"
                  onClick={startEdit}
                  aria-label="Rename window"
                  class="opacity-0 group-hover:opacity-100 size-4 inline-flex items-center justify-center rounded text-fg-subtle hover:text-accent transition-all"
                >
                  <PencilSimple size={10} />
                </button>
              </div>
              <div class="text-[10px] text-fg-subtle">
                {window.tabs.length} tab{window.tabs.length === 1 ? "" : "s"}
                {window.focused && (
                  <span class="ml-1.5 text-accent">· focused</span>
                )}
              </div>
            </div>
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
            isDragging={draggingTabId === tab.id}
            onDragStart={() => {
              if (tab.id !== undefined) onDragStart(tab.id);
            }}
            onDragEnd={onDragEnd}
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
  isDragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const handleClick = async () => {
    if (props.tab.id === undefined) return;
    await focusTab(props.tab.id, props.tab.windowId ?? 0);
  };

  return (
    <div
      draggable
      onDragStart={(e) => {
        if (props.tab.id === undefined) {
          e.preventDefault();
          return;
        }
        e.dataTransfer!.setData("text/tab-id", String(props.tab.id));
        e.dataTransfer!.effectAllowed = "move";
        props.onDragStart();
      }}
      onDragEnd={props.onDragEnd}
      onClick={handleClick}
      class={`flex items-center gap-2 px-2 py-1 rounded text-[12px] cursor-grab active:cursor-grabbing select-none transition-all ${
        props.isDragging
          ? "opacity-30"
          : "hover:bg-surface"
      }`}
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
    </div>
  );
}
