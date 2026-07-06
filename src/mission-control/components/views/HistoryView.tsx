import { useState, useEffect, useMemo, useCallback } from "preact/hooks";
import {
  ClockClockwise,
  ArrowUUpLeft,
  Globe,
  ArrowsClockwise,
  Trash,
  Tag,
  PawPrint,
  NotePencil,
  Prohibit,
  Broadcast,
} from "@phosphor-icons/react";
import {
  searchHistory,
  deleteHistoryUrl,
  deleteHistoryUrls,
  clearAllHistory,
  type HistoryEntry,
  type HistoryRange,
} from "@/lib/history";
import { formatRelativeTime } from "@/lib/sessions";
import { getRootDomain } from "@/lib/utils";
import { storage } from "@/lib/storage";
import { getTaggedMap } from "@/lib/tagged-urls";
import { getPawedUrlSet } from "@/lib/pawed";
import type { Note, PawTab } from "@/types";

import type { SnapshotSortKey } from "../SnapshotSortDropdown";

interface Props {
  query: string;
  sortBy: SnapshotSortKey;
  columns: 1 | 2 | 3 | 4;
  openTabs: PawTab[];
  clearFilteredSignal?: number;
  clearAllSignal?: number;
  refreshSignal?: number;
  onVisibleCountChange?: (n: number) => void;
  onOpenLiveDetails?: (tab: PawTab) => void;
  onOpenClosedDetails?: (synthetic: PawTab) => void;
}

const COLUMN_GRID: Record<1 | 2 | 3 | 4, string> = {
  1: "space-y-0.5",
  2: "grid grid-cols-1 md:grid-cols-2 gap-1",
  3: "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-1",
  4: "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-1",
};

const RANGE_LABEL: Record<HistoryRange, string> = {
  "24h": "Last 24 h",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  all: "All time",
};

function buildSyntheticTab(
  entry: HistoryEntry,
  tags: string[],
  pawed: boolean,
  notes: Note[],
  favIconUrl: string,
): PawTab {
  return {
    id: -1,
    windowId: -1,
    url: entry.url,
    title: entry.title,
    favIconUrl,
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

export function HistoryView({
  query,
  sortBy,
  columns,
  openTabs,
  clearFilteredSignal,
  clearAllSignal,
  refreshSignal,
  onVisibleCountChange,
  onOpenLiveDetails,
  onOpenClosedDetails,
}: Props) {
  const [range, setRange] = useState<HistoryRange>("7d");
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tagsByUrl, setTagsByUrl] = useState<Record<string, string[]>>({});
  const [notesByUrl, setNotesByUrl] = useState<Record<string, Note[]>>({});
  const [pawedUrls, setPawedUrls] = useState<Set<string>>(new Set());

  const openTabsByUrl = useMemo(() => {
    const map = new Map<string, PawTab>();
    for (const t of openTabs) if (t.url) map.set(t.url, t);
    return map;
  }, [openTabs]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [rows, taggedMap, paws, notesMap] = await Promise.all([
        searchHistory({ range, maxResults: 500 }),
        getTaggedMap(),
        getPawedUrlSet(),
        storage.get("notesByUrl"),
      ]);
      setEntries(rows);
      const tagLookup: Record<string, string[]> = {};
      for (const [url, entry] of Object.entries(taggedMap)) {
        if (entry.tags.length > 0) tagLookup[url] = entry.tags;
      }
      setTagsByUrl(tagLookup);
      setNotesByUrl(notesMap ?? {});
      setPawedUrls(paws);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (refreshSignal !== undefined && refreshSignal > 0) refresh();
  }, [refreshSignal, refresh]);

  useEffect(() => {
    if (!chrome.history?.onVisited) return;
    let pending = 0;
    const debouncedRefresh = () => {
      if (pending) window.clearTimeout(pending);
      pending = window.setTimeout(() => refresh(), 800);
    };
    chrome.history.onVisited.addListener(debouncedRefresh);
    chrome.history.onVisitRemoved.addListener(debouncedRefresh);
    return () => {
      if (pending) window.clearTimeout(pending);
      chrome.history.onVisited.removeListener(debouncedRefresh);
      chrome.history.onVisitRemoved.removeListener(debouncedRefresh);
    };
  }, [refresh]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? entries.filter(
          (e) =>
            e.title.toLowerCase().includes(q) ||
            e.url.toLowerCase().includes(q),
        )
      : entries;
    const sorted = [...list].sort((a, b) => {
      switch (sortBy) {
        case "date-asc":
          return a.lastVisitTime - b.lastVisitTime;
        case "name":
          return (a.title || a.url).localeCompare(b.title || b.url);
        case "date-desc":
        default:
          return b.lastVisitTime - a.lastVisitTime;
      }
    });
    return sorted;
  }, [entries, query, sortBy]);

  useEffect(() => {
    onVisibleCountChange?.(filtered.length);
  }, [filtered.length, onVisibleCountChange]);

  const lastClearFilteredSignal = useMemo(
    () => clearFilteredSignal ?? 0,
    [clearFilteredSignal],
  );
  useEffect(() => {
    if (lastClearFilteredSignal <= 0) return;
    const urls = filtered.map((f) => f.url);
    if (urls.length === 0) return;
    (async () => {
      await deleteHistoryUrls(urls);
      await refresh();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastClearFilteredSignal]);

  const lastClearAllSignal = useMemo(
    () => clearAllSignal ?? 0,
    [clearAllSignal],
  );
  useEffect(() => {
    if (lastClearAllSignal <= 0) return;
    (async () => {
      await clearAllHistory();
      await refresh();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastClearAllSignal]);

  const handleDeleteOne = async (entry: HistoryEntry) => {
    await deleteHistoryUrl(entry.url);
    setEntries((prev) => prev.filter((e) => e.id !== entry.id));
  };

  const handleReopen = async (entry: HistoryEntry) => {
    const openTab = openTabsByUrl.get(entry.url);
    if (openTab && openTab.id > 0) {
      await chrome.tabs.update(openTab.id, { active: true });
      if (openTab.windowId > 0) {
        await chrome.windows.update(openTab.windowId, { focused: true });
      }
      return;
    }
    await chrome.tabs.create({ url: entry.url, active: false });
  };

  const openDetails = (entry: HistoryEntry) => {
    const openTab = openTabsByUrl.get(entry.url);
    if (openTab && openTab.id > 0) {
      onOpenLiveDetails?.(openTab);
      return;
    }
    const tags = tagsByUrl[entry.url] ?? [];
    const notes = notesByUrl[entry.url] ?? [];
    const pawed = pawedUrls.has(entry.url);
    onOpenClosedDetails?.(
      buildSyntheticTab(entry, tags, pawed, notes, ""),
    );
  };

  return (
    <div class="px-6 py-3">
      <div class="flex items-start justify-between gap-3 px-3 py-2 mb-3 bg-surface border border-border rounded-md text-[11px] text-fg-muted">
        <div class="flex-1">
          Chrome browser history. Click any entry for full details — tags,
          notes, and paw the URL. Currently open URLs show a live
          <Broadcast size={10} weight="bold" class="inline mx-0.5 text-success" />
          indicator.
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          data-tooltip="Refresh"
          data-tooltip-pos="below"
          class="size-7 inline-flex items-center justify-center rounded text-fg-muted hover:bg-accent-subtle hover:text-accent disabled:opacity-40 transition-colors shrink-0"
        >
          <ArrowsClockwise
            size={12}
            class={loading ? "animate-spin" : ""}
          />
        </button>
      </div>

      <div class="flex items-center gap-1 mb-3 flex-wrap">
        <span class="text-[10px] uppercase tracking-wider text-fg-subtle font-semibold mr-2">
          Range
        </span>
        {(Object.keys(RANGE_LABEL) as HistoryRange[]).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRange(r)}
            class={`h-7 px-2.5 text-[11px] font-medium rounded-md transition-colors ${
              range === r
                ? "bg-accent text-white"
                : "text-fg-muted hover:bg-surface hover:text-fg"
            }`}
          >
            {RANGE_LABEL[r]}
          </button>
        ))}
      </div>

      {error && (
        <div class="mb-3 px-3 py-2 bg-warning-subtle border border-warning/30 rounded-md text-[11px] text-warning">
          <div class="font-medium mb-0.5">Couldn't fetch history</div>
          <div>{error}</div>
        </div>
      )}

      {entries.length === 0 && !loading ? (
        <div class="py-16 text-center">
          <ClockClockwise
            size={32}
            weight="thin"
            class="mx-auto mb-3 text-fg-subtle"
          />
          <div class="text-[14px] font-medium">
            No history in {RANGE_LABEL[range]}
          </div>
          <div class="text-[12px] text-fg-subtle mt-1 max-w-md mx-auto">
            Try a wider range, or browse a few sites and refresh.
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div class="py-12 text-center text-fg-subtle text-[13px]">
          No matches for "{query}" in {RANGE_LABEL[range]}
        </div>
      ) : (
        <div class={COLUMN_GRID[columns]}>
          {filtered.map((entry) => {
            const itemTags = tagsByUrl[entry.url] ?? [];
            const itemNotes = notesByUrl[entry.url] ?? [];
            const isPawed = pawedUrls.has(entry.url);
            const openTab = openTabsByUrl.get(entry.url);
            const isOpen = Boolean(openTab && openTab.id > 0);
            return (
              <div
                key={entry.id}
                onClick={() => openDetails(entry)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openDetails(entry);
                  }
                }}
                role="button"
                tabIndex={0}
                title="Open details"
                class="group flex items-start gap-3 px-3 py-2.5 rounded-md hover:bg-surface cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-accent/20"
              >
                {openTab?.favIconUrl ? (
                  <img
                    src={openTab.favIconUrl}
                    alt=""
                    class="size-5 shrink-0 rounded mt-0.5"
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
                  <div class="flex items-start gap-1.5 text-[13px] leading-snug line-clamp-2">
                    <span
                      title={isOpen ? "Currently open" : "Not open — click to reopen"}
                      class={`shrink-0 inline-flex mt-1 ${
                        isOpen ? "text-success" : "text-danger"
                      }`}
                    >
                      {isOpen ? (
                        <Broadcast size={12} weight="bold" />
                      ) : (
                        <Prohibit size={12} weight="bold" />
                      )}
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
                    <span
                      class={`min-w-0 ${
                        isOpen ? "text-fg" : "text-fg-muted italic"
                      }`}
                    >
                      {entry.title ||
                        getRootDomain(entry.url) ||
                        "Untitled"}
                    </span>
                  </div>
                  <div class="text-[11px] text-fg-subtle leading-tight mt-1 break-all line-clamp-2">
                    {entry.url}
                  </div>
                  <div class="text-[10px] text-fg-subtle/70 mt-1 flex items-center gap-2">
                    <span>
                      {formatRelativeTime(
                        new Date(entry.lastVisitTime).toISOString(),
                      )}
                    </span>
                    {entry.visitCount > 1 && (
                      <span>· {entry.visitCount} visits</span>
                    )}
                  </div>
                </div>
                <div class="flex items-center gap-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteOne(entry);
                    }}
                    aria-label="Delete from history"
                    data-tooltip="Delete from Chrome history"
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
                      handleReopen(entry);
                    }}
                    aria-label={isOpen ? "Jump to tab" : "Reopen"}
                    data-tooltip={
                      isOpen ? "Jump to open tab" : "Reopen in new tab"
                    }
                    data-tooltip-pos="above"
                    class="size-8 inline-flex items-center justify-center rounded text-fg-muted opacity-0 group-hover:opacity-100 hover:bg-accent-subtle hover:text-accent transition-all"
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
