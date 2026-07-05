import { useMemo, useState } from "preact/hooks";
import { CaretRight } from "@phosphor-icons/react";
import type { GroupBy, OrderBy, PawTab } from "@/types";
import { groupTabs, orderTabsInGroups } from "@/lib/grouping";
import { MCTabRow } from "../MCTabRow";

interface Props {
  tabs: PawTab[];
  emptyText: string;
  windowTitles: Record<number, string>;
  windowMeta?: Record<number, { title?: string; color?: import("@/types").WindowColor }>;
  columns?: 1 | 2 | 3 | 4;
  grouping?: GroupBy;
  ordering?: OrderBy;
  onAction: () => void;
  onOpenDetails: (tab: PawTab) => void;
}

const COLUMN_LAYOUT: Record<1 | 2 | 3 | 4, string> = {
  1: "space-y-0.5",
  2: "grid grid-cols-2 gap-1",
  3: "grid grid-cols-3 gap-1",
  4: "grid grid-cols-4 gap-1",
};

export function TabsListView({
  tabs,
  emptyText,
  windowTitles,
  windowMeta,
  columns = 1,
  grouping = "none",
  ordering = "none",
  onAction,
  onOpenDetails,
}: Props) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const groups = useMemo(
    () => orderTabsInGroups(groupTabs(tabs, grouping, windowTitles), ordering),
    [tabs, grouping, ordering, windowTitles],
  );

  const toggle = (key: string) => {
    const next = new Set(collapsed);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setCollapsed(next);
  };

  if (tabs.length === 0) {
    return (
      <div class="px-8 py-16 text-center text-fg-subtle text-[13px]">
        {emptyText}
      </div>
    );
  }

  const showHeader = grouping !== "none";

  return (
    <div class="px-6 py-3">
      {groups.map((group) => (
        <div key={group.key} class="mb-3 last:mb-0">
          {showHeader && (
            <button
              type="button"
              onClick={() => toggle(group.key)}
              class="w-full flex items-center gap-2 px-2 py-1.5 mb-1 rounded-md hover:bg-surface transition-colors group"
            >
              <CaretRight
                size={11}
                weight="bold"
                class={`text-fg-subtle transition-transform ${
                  collapsed.has(group.key) ? "" : "rotate-90"
                }`}
              />
              <span class="text-[11px] font-semibold text-fg-muted group-hover:text-fg uppercase tracking-wider truncate flex-1 text-left">
                {group.title}
              </span>
              <span class="text-[11px] text-fg-subtle bg-surface px-1.5 py-0.5 rounded font-mono">
                {group.count}
              </span>
            </button>
          )}
          {!collapsed.has(group.key) && (
            <div class={COLUMN_LAYOUT[columns]}>
              {group.tabs.map((tab) => (
                <MCTabRow
                  key={tab.id}
                  tab={tab}
                  windowTitle={windowTitles[tab.windowId]}
                  windowColor={windowMeta?.[tab.windowId]?.color ?? null}
                  onAction={onAction}
                  onOpenDetails={onOpenDetails}
                />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
