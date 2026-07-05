import { useState, useEffect, useMemo, useCallback } from "preact/hooks";
import {
  ClockCounterClockwise,
  ArrowUUpLeft,
  Globe,
  ArrowsClockwise,
  Trash,
  Tag,
  PawPrint,
  NotePencil,
  Prohibit,
} from "@phosphor-icons/react";
import {
  listRecentlyClosedDetailed,
  restoreClosed,
} from "@/lib/recently-closed";
import type { RecentlyClosedItem } from "@/lib/recently-closed";
import { formatRelativeTime } from "@/lib/sessions";
import { getRootDomain } from "@/lib/utils";
import { storage } from "@/lib/storage";
import { getTaggedMap } from "@/lib/tagged-urls";
import { getPawedUrlSet } from "@/lib/pawed";
import type { Note } from "@/types";

import type { SnapshotSortKey } from "../SnapshotSortDropdown";

import type { PawTab } from "@/types";

interface Props {
  query: string;
  sortBy: SnapshotSortKey;
  columns: 1 | 2 | 3 | 4;
  clearSignal?: number;
  reopenAllSignal?: number;
  refreshSignal?: number;
  onVisibleCountChange?: (n: number) => void;
  onOpenClosedDetails?: (synthetic: PawTab) => void;
}

function itemKey(item: RecentlyClosedItem): string {
  return `${item.url}::${item.lastModified}`;
}

function buildSyntheticTab(
  item: RecentlyClosedItem,
  tags: string[],
  pawed: boolean,
  notes: Note[],
): PawTab {
  return {
    id: -1,
    windowId: -1,
    url: item.url,
    title: item.title,
    favIconUrl: item.favIconUrl,
    audible: false,
    muted: false,
    discarded: false,
    pinned: false,
    saved: false,
    starred: pawed,
    tags,
    notes,
  };
}

const COLUMN_GRID: Record<1 | 2 | 3 | 4, string> = {
  1: "space-y-0.5",
  2: "grid grid-cols-1 md:grid-cols-2 gap-1",
  3: "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-1",
  4: "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-1",
};

export function RecentlyClosedView({
  query,
  sortBy,
  columns,
  clearSignal,
  reopenAllSignal,
  refreshSignal,
  onVisibleCountChange,
  onOpenClosedDetails,
}: Props) {
  const [items, setItems] = useState<RecentlyClosedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apiAvailable, setApiAvailable] = useState(true);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [tagsByUrl, setTagsByUrl] = useState<Record<string, string[]>>({});
  const [notesByUrl, setNotesByUrl] = useState<Record<string, Note[]>>({});
  const [pawedUrls, setPawedUrls] = useState<Set<string>>(new Set());

  useEffect(() => {
    storage.get("hiddenRecentlyClosed").then((arr) => {
      if (arr && arr.length > 0) setHidden(new Set(arr));
    });
  }, []);

  const persistHidden = async (next: Set<string>) => {
    setHidden(next);
    await storage.set("hiddenRecentlyClosed", Array.from(next));
  };

  const hideOne = async (item: RecentlyClosedItem) => {
    const next = new Set(hidden);
    next.add(itemKey(item));
    await persistHidden(next);
  };

  const hideAllVisible = async (visible: RecentlyClosedItem[]) => {
    const next = new Set(hidden);
    for (const it of visible) next.add(itemKey(it));
    await persistHidden(next);
  };

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [r, taggedMap, paws, notesMap] = await Promise.all([
        listRecentlyClosedDetailed(25),
        getTaggedMap(),
        getPawedUrlSet(),
        storage.get("notesByUrl"),
      ]);
      setItems(r.items);
      setApiAvailable(r.apiAvailable);
      setError(r.error ?? null);
      const tagLookup: Record<string, string[]> = {};
      for (const [url, entry] of Object.entries(taggedMap)) {
        if (entry.tags.length > 0) tagLookup[url] = entry.tags;
      }
      setTagsByUrl(tagLookup);
      setNotesByUrl(notesMap ?? {});
      setPawedUrls(paws);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (refreshSignal !== undefined && refreshSignal > 0) refresh();
  }, [refreshSignal, refresh]);

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

  const visible = useMemo(
    () => items.filter((i) => !hidden.has(itemKey(i))),
    [items, hidden],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? visible.filter(
          (i) =>
            i.title.toLowerCase().includes(q) ||
            i.url.toLowerCase().includes(q),
        )
      : visible;
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
  }, [visible, query, sortBy]);

  useEffect(() => {
    onVisibleCountChange?.(visible.length);
  }, [visible.length, onVisibleCountChange]);

  const lastClearSignal = useMemo(() => clearSignal ?? 0, [clearSignal]);
  useEffect(() => {
    if (lastClearSignal <= 0) return;
    hideAllVisible(visible);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastClearSignal]);

  const lastReopenSignal = useMemo(
    () => reopenAllSignal ?? 0,
    [reopenAllSignal],
  );
  useEffect(() => {
    if (lastReopenSignal <= 0) return;
    const urls = visible.map((v) => v.url).filter(Boolean);
    if (urls.length === 0) return;
    chrome.windows.create({ url: urls, focused: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastReopenSignal]);

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
          {filtered.map((item, i) => {
            const itemTags = tagsByUrl[item.url] ?? [];
            const itemNotes = notesByUrl[item.url] ?? [];
            const isPawed = pawedUrls.has(item.url);
            const openDetails = () =>
              onOpenClosedDetails?.(
                buildSyntheticTab(item, itemTags, isPawed, itemNotes),
              );
            return (
              <div
                key={`${item.sessionId}-${i}`}
                onClick={() => {
                  if (onOpenClosedDetails) openDetails();
                  else handleReopen(item);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    if (onOpenClosedDetails) openDetails();
                    else handleReopen(item);
                  }
                }}
                role="button"
                tabIndex={0}
                title="Open details"
                class="group flex items-start gap-3 px-3 py-2.5 rounded-md hover:bg-surface cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-accent/20"
              >
                {item.favIconUrl ? (
                  <img
                    src={item.favIconUrl}
                    alt=""
                    class="size-5 shrink-0 rounded mt-0.5 grayscale opacity-70"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display =
                        "none";
                    }}
                  />
                ) : (
                  <Globe
                    size={16}
                    class="text-fg-subtle shrink-0 mt-0.5 opacity-70"
                  />
                )}
                <div class="flex-1 min-w-0">
                  <div class="flex items-start gap-1.5 text-[13px] leading-snug line-clamp-2 text-fg-muted italic">
                    <span
                      title="Closed — tab is gone, click to reopen URL"
                      class="shrink-0 inline-flex mt-1 text-danger"
                    >
                      <Prohibit size={12} weight="bold" />
                    </span>
                    {isPawed && (
                      <span
                        title="Pawed"
                        class="shrink-0 inline-flex mt-1 text-accent"
                      >
                        <PawPrint size={12} weight="fill" />
                      </span>
                    )}
                    {itemTags.length > 0 && (
                      <span
                        title={itemTags.join(", ")}
                        class="shrink-0 inline-flex items-center gap-0.5 mt-1 text-purple-600 text-[11px] font-semibold"
                      >
                        <Tag size={11} weight="fill" />
                        {itemTags.length}
                      </span>
                    )}
                    {itemNotes.length > 0 && (
                      <span
                        title={itemNotes
                          .map((n) => n.text)
                          .join("\n\n")
                          .slice(0, 300)}
                        class="shrink-0 inline-flex items-center gap-0.5 mt-1 text-cyan-600 text-[11px] font-semibold"
                      >
                        <NotePencil size={11} weight="fill" />
                        {itemNotes.length}
                      </span>
                    )}
                    <span class="min-w-0 not-italic text-fg-muted">
                      {item.title || getRootDomain(item.url) || "Untitled"}
                    </span>
                  </div>
                  <div class="text-[11px] text-fg-subtle leading-tight mt-1 break-all line-clamp-2">
                    {item.url}
                  </div>
                  <div class="text-[10px] text-fg-subtle/70 mt-1">
                    {formatRelativeTime(
                      new Date(item.lastModified).toISOString(),
                    )}
                  </div>
                </div>
                <div class="flex items-center gap-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      hideOne(item);
                    }}
                    aria-label="Remove from list"
                    data-tooltip="Remove from list (Chrome still remembers it)"
                    data-tooltip-pos="above"
                    class="size-8 inline-flex items-center justify-center rounded text-fg-muted opacity-0 group-hover:opacity-100 hover:bg-danger-subtle hover:text-danger transition-all"
                  >
                    <Trash size={13} />
                  </button>
                  <span
                    class="w-px h-4 mx-1 bg-border opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-hidden="true"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReopen(item);
                    }}
                    disabled={!item.sessionId}
                    aria-label="Reopen"
                    data-tooltip="Reopen tab"
                    data-tooltip-pos="above"
                    class="size-8 inline-flex items-center justify-center rounded text-fg-muted opacity-0 group-hover:opacity-100 hover:bg-accent-subtle hover:text-accent disabled:opacity-20 transition-all"
                  >
                    <ArrowUUpLeft size={14} weight="bold" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
