import { useState } from "preact/hooks";
import { CaretRight, PencilSimple, Check, X } from "@phosphor-icons/react";
import type { TabGroup } from "@/lib/grouping";
import type { PawTab, GroupBy, WindowColor } from "@/types";
import { setWindowTitle } from "@/lib/windows";
import { WINDOW_COLOR_STYLES } from "@/lib/window-colors";
import { GroupActions } from "./GroupActions";
import { TabRow } from "./TabRow";

interface Props {
  group: TabGroup;
  grouping: GroupBy;
  showHeader: boolean;
  collapsed: boolean;
  selectedIds: Set<number>;
  selectionMode: boolean;
  windowColors?: Record<number, WindowColor>;
  currentTabId?: number | null;
  onToggle: () => void;
  onAction: () => void;
  onOpenDetails: (tab: PawTab) => void;
  onToggleSelect: (tabId: number, event: MouseEvent) => void;
}

export function TabGroupSection({
  group,
  grouping,
  showHeader,
  collapsed,
  selectedIds,
  selectionMode,
  windowColors,
  currentTabId,
  onToggle,
  onAction,
  onOpenDetails,
  onToggleSelect,
}: Props) {
  const rows = group.tabs.map((tab) => (
    <TabRow
      key={tab.id}
      tab={tab}
      isCurrent={tab.id === currentTabId}
      onAction={onAction}
      onOpenDetails={onOpenDetails}
      selected={selectedIds.has(tab.id)}
      selectionMode={selectionMode}
      onToggleSelect={onToggleSelect}
    />
  ));

  if (!showHeader) {
    return <div class="space-y-0.5">{rows}</div>;
  }

  return (
    <div class="mb-1">
      <GroupHeader
        group={group}
        grouping={grouping}
        collapsed={collapsed}
        windowColors={windowColors}
        onToggle={onToggle}
        onAction={onAction}
      />

      {!collapsed && <div class="space-y-0.5 mt-0.5">{rows}</div>}
    </div>
  );
}

function GroupHeader({
  group,
  grouping,
  collapsed,
  windowColors,
  onToggle,
  onAction,
}: {
  group: TabGroup;
  grouping: GroupBy;
  collapsed: boolean;
  windowColors?: Record<number, WindowColor>;
  onToggle: () => void;
  onAction: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const isWindow = grouping === "window";
  const windowId = isWindow ? group.tabs[0]?.windowId : undefined;
  const colorKey =
    isWindow && windowId !== undefined ? windowColors?.[windowId] : undefined;
  const colorStyle = colorKey ? WINDOW_COLOR_STYLES[colorKey] : null;

  const startEdit = (e: MouseEvent) => {
    e.stopPropagation();
    setDraft(group.title);
    setEditing(true);
  };

  const cancelEdit = (e?: Event) => {
    e?.stopPropagation();
    setEditing(false);
    setDraft("");
  };

  const commitEdit = async (e?: Event) => {
    e?.stopPropagation();
    if (windowId === undefined) {
      setEditing(false);
      return;
    }
    await setWindowTitle(windowId, draft);
    setEditing(false);
    setDraft("");
    onAction();
  };

  if (editing && isWindow) {
    return (
      <div class="flex items-center gap-1.5 px-2 py-1.5">
        <CaretRight
          size={11}
          weight="bold"
          class="text-fg-subtle opacity-40"
        />
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
          placeholder={`Window ${windowId}`}
          class="flex-1 h-6 px-2 bg-bg-elevated border border-accent rounded text-[12px] focus:outline-none focus:ring-4 focus:ring-accent/10"
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
      </div>
    );
  }

  const headerBg = colorStyle
    ? `${colorStyle.headerBg} hover:${colorStyle.headerBg}`
    : "hover:bg-surface";
  const titleClass = colorStyle
    ? `${colorStyle.titleText} font-semibold`
    : "text-fg-muted group-hover:text-fg font-medium";

  return (
    <div
      onClick={onToggle}
      class={`group w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md transition-colors cursor-pointer ${headerBg}`}
    >
      <CaretRight
        size={11}
        weight="bold"
        class={`text-fg-subtle transition-transform ${collapsed ? "" : "rotate-90"}`}
      />
      {colorStyle && (
        <span
          class={`size-2 rounded-full shrink-0 ${colorStyle.dot}`}
          aria-hidden="true"
        />
      )}
      <div class="flex-1 min-w-0 inline-flex items-center gap-1">
        <span
          class={`text-[12px] uppercase tracking-wide truncate text-left ${titleClass}`}
        >
          {group.title}
          <span class="ml-1 text-fg-subtle font-normal normal-case tracking-normal">
            ({group.count})
          </span>
        </span>
        {isWindow && (
          <button
            type="button"
            onClick={startEdit}
            aria-label="Rename window"
            title="Rename window"
            class="size-4 inline-flex items-center justify-center rounded text-fg-subtle opacity-0 group-hover:opacity-100 hover:text-accent transition-all shrink-0"
          >
            <PencilSimple size={9} />
          </button>
        )}
      </div>
      <GroupActions tabs={group.tabs} onAction={onAction} />
    </div>
  );
}
