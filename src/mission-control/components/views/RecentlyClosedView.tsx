import { useState, useEffect, useMemo, useCallback } from "preact/hooks";
import {
  ClockCounterClockwise,
  ArrowSquareOut,
  Globe,
  ArrowsClockwise,
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
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const next = await listRecentlyClosed(50);
      setItems(next);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const handler = () => refresh();
    if (chrome.sessions?.onChanged) {
      chrome.sessions.onChanged.addListener(handler);
      return () => chrome.sessions.onChanged.removeListener(handler);
    }
    return undefined;
  }, [refresh]);

  const handleReopen = async (item: RecentlyClosedItem) => {
    await restoreClosed(item.sessionId);
    await refresh();
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.title.toLowerCase().includes(q) || i.url.toLowerCase().includes(q),
    );
  }, [items, query]);

  return (
    <div class="px-6 py-3 max-w-4xl">
      <div class="flex items-start justify-between gap-3 px-3 py-2 mb-3 bg-surface border border-border rounded-md text-[11px] text-fg-muted">
        <div>
          Chrome remembers up to 25 recently closed tabs from your current
          session. They disappear when you restart the browser.
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          data-tooltip="Refresh list"
          data-tooltip-pos="below"
          class="size-7 inline-flex items-center justify-center rounded text-fg-muted hover:bg-accent-subtle hover:text-accent disabled:opacity-40 transition-colors shrink-0"
        >
          <ArrowsClockwise
            size={12}
            class={loading ? "animate-spin" : ""}
          />
        </button>
      </div>

      {items.length === 0 ? (
        <div class="py-16 text-center">
          <ClockCounterClockwise
            size={32}
            weight="thin"
            class="mx-auto mb-3 text-fg-subtle"
          />
          <div class="text-[14px] font-medium">
            {loading ? "Loading…" : "No recently closed tabs"}
          </div>
          <div class="text-[12px] text-fg-subtle mt-1">
            Close a tab in Chrome — it'll show up here for quick reopening.
            <br />
            If you closed tabs but don't see them: try refreshing, or it may be
            a private window.
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div class="py-12 text-center text-fg-subtle text-[13px]">
          No matches for "{query}"
        </div>
      ) : (
        <div class="space-y-0.5">
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
                    (e.currentTarget as HTMLImageElement).style.display =
                      "none";
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
                  {formatRelativeTime(
                    new Date(item.lastModified).toISOString(),
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleReopen(item)}
                disabled={!item.sessionId}
                aria-label="Reopen"
                data-tooltip="Reopen tab"
                data-tooltip-pos="left"
                class="size-8 inline-flex items-center justify-center rounded text-fg-muted opacity-0 group-hover:opacity-100 hover:bg-accent-subtle hover:text-accent disabled:opacity-20 transition-all"
              >
                <ArrowSquareOut size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
