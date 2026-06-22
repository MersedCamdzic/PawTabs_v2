import { CaretRight } from "@phosphor-icons/react";
import type { TabGroup } from "@/lib/grouping";
import type { PawTab } from "@/types";
import { TabRow } from "./TabRow";

interface Props {
  group: TabGroup;
  showHeader: boolean;
  collapsed: boolean;
  onToggle: () => void;
  onAction: () => void;
  onOpenDetails: (tab: PawTab) => void;
}

export function TabGroupSection({
  group,
  showHeader,
  collapsed,
  onToggle,
  onAction,
  onOpenDetails,
}: Props) {
  if (!showHeader) {
    return (
      <div class="space-y-0.5">
        {group.tabs.map((tab) => (
          <TabRow
            key={tab.id}
            tab={tab}
            onAction={onAction}
            onOpenDetails={onOpenDetails}
          />
        ))}
      </div>
    );
  }

  return (
    <div class="mb-1">
      <button
        type="button"
        onClick={onToggle}
        class="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md hover:bg-surface transition-colors group"
      >
        <CaretRight
          size={11}
          weight="bold"
          class={`text-fg-subtle transition-transform ${collapsed ? "" : "rotate-90"}`}
        />
        <span class="text-[12px] font-medium text-fg-muted group-hover:text-fg uppercase tracking-wide truncate flex-1 text-left">
          {group.title}
        </span>
        <span class="text-[11px] text-fg-subtle bg-surface px-1.5 py-0.5 rounded">
          {group.count}
        </span>
      </button>

      {!collapsed && (
        <div class="space-y-0.5 mt-0.5">
          {group.tabs.map((tab) => (
            <TabRow
              key={tab.id}
              tab={tab}
              onAction={onAction}
              onOpenDetails={onOpenDetails}
            />
          ))}
        </div>
      )}
    </div>
  );
}
