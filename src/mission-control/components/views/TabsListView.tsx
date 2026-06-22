import type { PawTab } from "@/types";
import { MCTabRow } from "../MCTabRow";

interface Props {
  tabs: PawTab[];
  emptyText: string;
  onAction: () => void;
}

export function TabsListView({ tabs, emptyText, onAction }: Props) {
  if (tabs.length === 0) {
    return (
      <div class="px-8 py-16 text-center text-fg-subtle text-[13px]">
        {emptyText}
      </div>
    );
  }

  return (
    <div class="px-6 py-3 space-y-0.5 max-w-4xl">
      {tabs.map((tab) => (
        <MCTabRow key={tab.id} tab={tab} onAction={onAction} />
      ))}
    </div>
  );
}
