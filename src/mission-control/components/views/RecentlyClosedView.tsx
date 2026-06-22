import { useState, useEffect, useMemo } from "preact/hooks";
import {
  ClockCounterClockwise,
  ArrowSquareOut,
  Globe,
} from "@phosphor-icons/react";
import {
  listRecentlyClosed,
  restoreClosed,
} from "@/lib/recently-closed";
import type { RecentlyClosedItem } from "@/lib/recently-closed";
import { formatRelativeTime } from "@/lib/sessions";
import { getRootDomain } from "@/lib/utils";

interface Props {
  query: string;
}

export function RecentlyClosedView({ query }: Props) {
  const [items, setItems] = useState<RecentlyClosedItem[]>([]);

  useEffect(() => {
    listRecentlyClosed(50).then(setItems);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.title.toLowerCase().includes(q) || i.url.toLowerCase().includes(q),
    );
  }, [items, query]);

  if (items.length === 0) {
    return (
      <div class="px-8 py-16 text-center">
        <ClockCounterClockwise
          size={32}
          weight="thin"
          class="mx-auto mb-3 text-fg-subtle"
        />
        <div class="text-[14px] font-medium">No recently closed tabs</div>
        <div class="text-[12px] text-fg-subtle mt-1">
          Tabs you close will appear here for quick reopening.
        </div>
      </div>
    );
  }

  return (
    <div class="px-6 py-3 space-y-0.5 max-w-4xl">
      {filtered.map((item, i) => (
        <div
          key={`${item.sessionId}-${i}`}
          class="group flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-surface transition-colors"
        >
          {item.favIconUrl ? (
            <img
              src={item.favIconUrl}
              alt=""
              class="size-5 shrink-0 rounded"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <Globe size={16} class="text-fg-subtle shrink-0" />
          )}
          <div class="flex-1 min-w-0">
            <div class="text-[13px] truncate">
              {item.title || getRootDomain(item.url) || "Untitled"}
            </div>
            <div class="text-[11px] text-fg-subtle truncate mt-0.5">
              {getRootDomain(item.url)} ·{" "}
              {formatRelativeTime(new Date(item.lastModified).toISOString())}
            </div>
          </div>
          <button
            type="button"
            onClick={() => restoreClosed(item.sessionId)}
            disabled={!item.sessionId}
            aria-label="Reopen"
            title="Reopen tab"
            class="size-8 inline-flex items-center justify-center rounded text-fg-muted opacity-0 group-hover:opacity-100 hover:bg-accent-subtle hover:text-accent disabled:opacity-20 transition-all"
          >
            <ArrowSquareOut size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}
