import { useState, useMemo } from "preact/hooks";
import { Tag } from "@phosphor-icons/react";
import type { PawTab } from "@/types";
import { MCTabRow } from "../MCTabRow";

interface Props {
  tabs: PawTab[];
  query: string;
  windowTitles: Record<number, string>;
  onAction: () => void;
  onOpenDetails: (tab: PawTab) => void;
}

export function TagsView({
  tabs,
  query,
  windowTitles,
  onAction,
  onOpenDetails,
}: Props) {
  const [selected, setSelected] = useState<string | null>(null);

  const tagCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const tab of tabs) {
      for (const tag of tab.tags) {
        map.set(tag, (map.get(tag) ?? 0) + 1);
      }
    }
    return Array.from(map.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
  }, [tabs]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tagCounts;
    return tagCounts.filter((t) => t.tag.toLowerCase().includes(q));
  }, [tagCounts, query]);

  const tagsTabs = useMemo(() => {
    if (!selected) return [];
    return tabs.filter((t) => t.tags.includes(selected));
  }, [tabs, selected]);

  if (tagCounts.length === 0) {
    return (
      <div class="px-8 py-16 text-center">
        <Tag size={32} weight="thin" class="mx-auto mb-3 text-fg-subtle" />
        <div class="text-[14px] font-medium">No tags yet</div>
        <div class="text-[12px] text-fg-subtle mt-1">
          Add tags to tabs in the popup to organize them here.
        </div>
      </div>
    );
  }

  return (
    <div class="px-6 py-4 grid grid-cols-[220px_1fr] gap-6">
      <div class="space-y-0.5">
        <div class="text-[10px] uppercase tracking-wide text-fg-subtle font-medium mb-2 px-2">
          {filtered.length} tag{filtered.length === 1 ? "" : "s"}
        </div>
        {filtered.map((t) => {
          const active = selected === t.tag;
          return (
            <button
              key={t.tag}
              type="button"
              onClick={() => setSelected(active ? null : t.tag)}
              class={`w-full h-8 px-2.5 flex items-center justify-between rounded-md text-[12px] transition-colors ${
                active
                  ? "bg-accent-subtle text-accent"
                  : "text-fg-muted hover:bg-surface hover:text-fg"
              }`}
            >
              <span class="truncate flex items-center gap-1.5">
                <Tag size={11} weight={active ? "fill" : "regular"} />
                {t.tag}
              </span>
              <span
                class={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                  active ? "bg-accent text-white" : "bg-surface text-fg-subtle"
                }`}
              >
                {t.count}
              </span>
            </button>
          );
        })}
      </div>

      <div>
        {selected ? (
          <>
            <div class="text-[11px] uppercase tracking-wide text-fg-subtle font-medium mb-2 flex items-center gap-1.5">
              <Tag size={11} weight="fill" class="text-accent" />
              {selected} — {tagsTabs.length} tab
              {tagsTabs.length === 1 ? "" : "s"}
            </div>
            <div class="space-y-0.5">
              {tagsTabs.map((t) => (
                <MCTabRow
                  key={t.id}
                  tab={t}
                  windowTitle={windowTitles[t.windowId]}
                  onAction={onAction}
                  onOpenDetails={onOpenDetails}
                />
              ))}
            </div>
          </>
        ) : (
          <div class="py-16 text-center text-fg-subtle text-[13px]">
            Select a tag to view its tabs
          </div>
        )}
      </div>
    </div>
  );
}
