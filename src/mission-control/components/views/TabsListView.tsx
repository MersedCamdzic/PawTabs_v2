import type { PawTab } from "@/types";
import { MCTabRow } from "../MCTabRow";

interface Props {
  tabs: PawTab[];
  emptyText: string;
  windowTitles: Record<number, string>;
  columns?: 1 | 2 | 3 | 4;
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
  columns = 1,
  onAction,
  onOpenDetails,
}: Props) {
  if (tabs.length === 0) {
    return (
      <div class="px-8 py-16 text-center text-fg-subtle text-[13px]">
        {emptyText}
      </div>
    );
  }

  return (
    <div class={`px-6 py-3 ${COLUMN_LAYOUT[columns]}`}>
      {tabs.map((tab) => (
        <MCTabRow
          key={tab.id}
          tab={tab}
          windowTitle={windowTitles[tab.windowId]}
          onAction={onAction}
          onOpenDetails={onOpenDetails}
        />
      ))}
    </div>
  );
}
