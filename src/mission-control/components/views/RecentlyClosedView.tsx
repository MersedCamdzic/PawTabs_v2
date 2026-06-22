import { useState, useEffect, useMemo, useCallback } from "preact/hooks";
import {
  ClockCounterClockwise,
  ArrowSquareOut,
  Globe,
  ArrowsClockwise,
} from "@phosphor-icons/react";
import {
  listRecentlyClosedDetailed,
  restoreClosed,
} from "@/lib/recently-closed";
import type { RecentlyClosedItem } from "@/lib/recently-closed";
import { formatRelativeTime } from "@/lib/sessions";
import { getRootDomain } from "@/lib/utils";

import type { SnapshotSortKey } from "../SnapshotSortDropdown";

interface Props {
  query: string;
  sortBy: SnapshotSortKey;
  columns: 1 | 2 | 3 | 4;
}

const COLUMN_GRID: Record<1 | 2 | 3 | 4, string> = {
  1: "space-y-0.5",
  2: "grid grid-cols-1 md:grid-cols-2 gap-1",
  3: "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-1",
  4: "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-1",
};

export function RecentlyClosedView({ query, sortBy, columns }: Props) {
  const [items, setItems] = useState<RecentlyClosedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apiAvailable, setApiAvailable] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const r = await listRecentlyClosedDetailed(25);
      setItems(r.items);
      setApiAvailable(r.apiAvailable);
      setError(r.error ?? null);
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
    const list = q
      ? items.filter(
          (i) =>
            i.title.toLowerCase().includes(q) ||
            i.url.toLowerCase().includes(q),
        )
      : items;
    const sorted = [...list].sort((a, b) => {
      switch (sortBy) {
        case "date-asc":
          return a.lastModified - b.lastModified;
        case "name":
          return (a.title || a.url).localeCompare(b.title || b.url);
        case "date-desc":
        default:
          return b.lastModified - a.lastModified;
      }
    });
    return sorted;
  }, [items, query, sortBy]);

  return (
    <div class="px-6 py-3">
      <div class="flex items-start justify-between gap-3 px-3 py-2 mb-3 bg-surface border border-border rounded-md text-[11px] text-fg-muted">
        <div>
          Chrome remembers up to 25 recently closed tabs from your current
          session. They disappear when you restart the browser.
          Incognito tabs are never tracked.
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

      {!apiAvailable && (
        <div class="mb-3 px-3 py-2 bg-danger-subtle border border-danger/30 rounded-md text-[11px] text-danger">
          <div class="font-medium mb-0.5">Sessions API unavailable</div>
          <div>
            Remove and reinstall the extension to grant the 'sessions'
            permission, then come back here.
          </div>
        </div>
      )}

      {error && apiAvailable && (
        <div class="mb-3 px-3 py-2 bg-warning-subtle border border-warning/30 rounded-md text-[11px] text-warning">
          <div class="font-medium mb-0.5">Couldn't fetch recently closed</div>
          <div>{error}</div>
        </div>
      )}

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
          <div class="text-[12px] text-fg-subtle mt-1 max-w-md mx-auto">
            <strong>Test it:</strong> open any tab in Chrome (e.g.
            example.com), close it with ⌘W, then click the refresh button
            above. It should appear.
            <br />
            <br />
            If empty after a fresh extension install:{" "}
            <strong>
              remove the extension from chrome://extensions and reload it
            </strong>{" "}
            — Chrome sometimes requires re-grant of the sessions permission.
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div class="py-12 text-center text-fg-subtle text-[13px]">
          No matches for "{query}"
        </div>
      ) : (
        <div class={COLUMN_GRID[columns]}>
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
