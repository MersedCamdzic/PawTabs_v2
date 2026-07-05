import { useState, useEffect, useMemo, useCallback } from "preact/hooks";
import {
  PawPrint,
  Globe,
  ArrowSquareOut,
  ArrowUUpLeft,
  Trash,
  PushPin,
  Broadcast,
  Moon,
  Prohibit,
  Browsers,
  X,
} from "@phosphor-icons/react";
import { listPawed, unpawTab } from "@/lib/pawed";
import { focusTab, closeTab } from "@/lib/chrome";
import { getRootDomain } from "@/lib/utils";
import { WINDOW_COLOR_STYLES } from "@/lib/window-colors";
import type { PawTab, PawedEntry, WindowColor } from "@/types";

interface Props {
  query: string;
  columns: 1 | 2 | 3 | 4;
  openTabs: PawTab[];
  windowMeta: Record<number, { title?: string; color?: WindowColor }>;
  onAction: () => void;
  onFilteredChange?: (
    items: { url: string; title: string; favIconUrl: string }[],
  ) => void;
  onOpenDetails?: (tab: PawTab) => void;
  onOpenClosedDetails?: (synthetic: PawTab) => void;
  refreshSignal?: number;
}

const COLUMN_LAYOUT: Record<1 | 2 | 3 | 4, string> = {
  1: "space-y-0.5",
  2: "grid grid-cols-1 md:grid-cols-2 gap-1",
  3: "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-1",
  4: "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-1",
};

interface Row {
  entry: PawedEntry;
  openTab: PawTab | null;
}

export function PawedView({
  query,
  columns,
  openTabs,
  windowMeta,
  onAction,
  onFilteredChange,
  onOpenDetails,
  onOpenClosedDetails,
  refreshSignal,
}: Props) {
  const [entries, setEntries] = useState<PawedEntry[]>([]);

  const refresh = useCallback(async () => {
    setEntries(await listPawed());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (refreshSignal !== undefined && refreshSignal > 0) refresh();
  }, [refreshSignal, refresh]);

  const rows = useMemo<Row[]>(() => {
    const openByUrl = new Map<string, PawTab>();
    for (const t of openTabs) openByUrl.set(t.url, t);
    const q = query.trim().toLowerCase();
    return entries
      .filter((e) =>
        !q
          ? true
          : e.title.toLowerCase().includes(q) ||
            e.url.toLowerCase().includes(q),
      )
      .map((entry) => ({ entry, openTab: openByUrl.get(entry.url) ?? null }));
  }, [entries, openTabs, query]);

  useEffect(() => {
    if (!onFilteredChange) return;
    onFilteredChange(
      rows.map((r) => ({
        url: r.entry.url,
        title: r.entry.title,
        favIconUrl: r.entry.favIconUrl,
      })),
    );
  }, [rows, onFilteredChange]);

  const handleRowClick = async (row: Row) => {
    if (row.openTab && onOpenDetails) {
      onOpenDetails(row.openTab);
      return;
    }
    if (row.openTab) {
      await focusTab(row.openTab.id, row.openTab.windowId);
      return;
    }
    if (onOpenClosedDetails) {
      const { getNotesForUrl } = await import("@/lib/tabs");
      const { getTagsForUrl } = await import("@/lib/tagged-urls");
      const [notes, tags] = await Promise.all([
        getNotesForUrl(row.entry.url),
        getTagsForUrl(row.entry.url),
      ]);
      onOpenClosedDetails({
        id: -1,
        windowId: -1,
        url: row.entry.url,
        title: row.entry.title,
        favIconUrl: row.entry.favIconUrl,
        audible: false,
        muted: false,
        discarded: false,
        pinned: false,
        saved: false,
        starred: true,
        tags,
        notes,
      });
      return;
    }
    await chrome.tabs.create({ url: row.entry.url });
  };

  const handleJump = async (row: Row) => {
    if (row.openTab) {
      await focusTab(row.openTab.id, row.openTab.windowId);
    } else {
      await chrome.tabs.create({ url: row.entry.url });
    }
  };

  const handleUnpaw = async (entry: PawedEntry) => {
    await unpawTab(entry.url);
    await refresh();
    onAction();
  };

  const handleCloseTab = async (row: Row) => {
    if (!row.openTab) return;
    await closeTab(row.openTab.id);
    onAction();
  };

  if (entries.length === 0) {
    return (
      <div class="px-8 py-16 text-center">
        <PawPrint
          size={32}
          weight="thin"
          class="mx-auto mb-3 text-fg-subtle"
        />
        <div class="text-[14px] font-medium">No pawed tabs yet</div>
        <div class="text-[12px] text-fg-subtle mt-1 max-w-md mx-auto">
          Click the 🐾 icon on any tab to save it here. Pawed tabs persist
          even after you close them — open them again from this list.
        </div>
      </div>
    );
  }

  return (
    <div class="px-6 py-3">
      {rows.length === 0 && query.trim() && (
        <div class="py-12 text-center text-fg-subtle text-[13px]">
          No pawed tabs match "{query}"
        </div>
      )}
      <div class={COLUMN_LAYOUT[columns]}>
        {rows.map((row) => {
          const wm = row.openTab
            ? windowMeta[row.openTab.windowId]
            : undefined;
          return (
            <PawedRow
              key={row.entry.url}
              row={row}
              windowName={wm?.title ?? null}
              windowColor={wm?.color ?? null}
              onOpen={() => handleRowClick(row)}
              onJump={() => handleJump(row)}
              onUnpaw={() => handleUnpaw(row.entry)}
              onCloseTab={() => handleCloseTab(row)}
            />
          );
        })}
      </div>
    </div>
  );
}

function PawedRow(props: {
  row: Row;
  windowName: string | null;
  windowColor: WindowColor | null;
  onOpen: () => void;
  onJump: () => void;
  onUnpaw: () => void;
  onCloseTab: () => void;
}) {
  const { row, windowName, windowColor } = props;
  const { entry, openTab } = row;
  const domain = getRootDomain(entry.url);
  const isOpen = openTab !== null;
  const isInactive = isOpen && openTab.discarded;
  const isPinned = isOpen && openTab.pinned;
  const windowColorStyle = windowColor ? WINDOW_COLOR_STYLES[windowColor] : null;

  let stateIcon: preact.ComponentChildren;
  let stateColor: string;
  let stateTooltip: string;
  if (!isOpen) {
    stateIcon = <Prohibit size={12} weight="bold" />;
    stateColor = "text-danger";
    stateTooltip = "Closed — tab is gone, click to reopen URL";
  } else if (isInactive) {
    stateIcon = <Moon size={12} weight="fill" />;
    stateColor = "text-fg-subtle";
    stateTooltip = "Open but inactive (discarded from memory)";
  } else {
    stateIcon = <Broadcast size={12} weight="bold" />;
    stateColor = "text-success";
    stateTooltip = "Open and active";
  }

  return (
    <div
      onClick={props.onOpen}
      class="group flex items-start gap-3 px-3 py-2.5 rounded-md hover:bg-surface cursor-pointer transition-colors"
    >
      {entry.favIconUrl ? (
        <img
          src={entry.favIconUrl}
          alt=""
          class={`size-5 shrink-0 rounded mt-0.5 ${isOpen && !isInactive ? "" : "grayscale opacity-70"}`}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      ) : (
        <Globe
          size={16}
          class={`text-fg-subtle shrink-0 mt-0.5 ${isOpen && !isInactive ? "" : "opacity-70"}`}
        />
      )}
      <div class="flex-1 min-w-0">
        <div
          class={`flex items-start gap-1.5 text-[13px] leading-snug line-clamp-2 ${
            isOpen && !isInactive
              ? "text-fg"
              : isInactive
                ? "text-fg-muted italic"
                : "text-fg-muted"
          }`}
        >
          <span
            title={stateTooltip}
            class={`shrink-0 inline-flex mt-1 ${stateColor}`}
          >
            {stateIcon}
          </span>
          <span
            title="Pawed"
            class="shrink-0 inline-flex mt-1 text-accent"
          >
            <PawPrint size={12} weight="fill" />
          </span>
          {isPinned && (
            <span
              title="Pinned"
              class="shrink-0 inline-flex mt-1 text-warning"
            >
              <PushPin size={12} weight="fill" />
            </span>
          )}
          <span class="min-w-0">{entry.title || domain || entry.url}</span>
        </div>
        <div class="text-[11px] text-fg-subtle leading-tight mt-1 break-all line-clamp-2">
          {entry.url}
        </div>
        {isOpen && openTab && (
          <div class="flex flex-wrap items-center gap-1 mt-2">
            {windowName ? (
              <span
                class={`inline-flex items-center gap-1 h-5 px-1.5 rounded text-[10px] font-medium ${
                  windowColorStyle ? windowColorStyle.headerBg : "bg-surface"
                } ${
                  windowColorStyle
                    ? windowColorStyle.titleText
                    : "text-fg-muted"
                }`}
              >
                <Browsers
                  size={9}
                  weight="fill"
                  class={
                    windowColorStyle
                      ? windowColorStyle.iconText
                      : "text-fg-subtle"
                  }
                />
                {windowName}
              </span>
            ) : (
              <span class="inline-flex items-center gap-1 h-5 px-1.5 rounded text-[10px] font-medium bg-surface text-fg-muted">
                <Browsers size={9} weight="fill" class="text-fg-subtle" />
                Window {openTab.windowId}
              </span>
            )}
          </div>
        )}
      </div>
      <div class="flex items-center gap-0.5 shrink-0">
        <button
          type="button"
          onClick={
            isOpen
              ? (e) => {
                  e.stopPropagation();
                  props.onJump();
                }
              : undefined
          }
          disabled={!isOpen}
          aria-label={
            isOpen ? "Jump to this tab" : "Jump unavailable — tab is closed"
          }
          data-tooltip={
            isOpen ? "Jump to this tab" : "Jump unavailable — tab is closed"
          }
          data-tooltip-pos="above"
          class={`size-8 inline-flex items-center justify-center rounded transition-all ${
            isOpen
              ? "text-fg-muted opacity-0 group-hover:opacity-100 hover:bg-accent-subtle hover:text-accent"
              : "text-fg-subtle/40 opacity-0 group-hover:opacity-100 cursor-not-allowed"
          }`}
        >
          <ArrowSquareOut size={13} />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            props.onUnpaw();
          }}
          aria-label="Unpaw — remove from list"
          data-tooltip="Unpaw — remove from list"
          data-tooltip-pos="above"
          class="size-8 inline-flex items-center justify-center rounded text-fg-muted opacity-0 group-hover:opacity-100 hover:bg-danger-subtle hover:text-danger transition-all"
        >
          <Trash size={13} />
        </button>
        <span
          class="w-px h-4 mx-1 bg-border opacity-0 group-hover:opacity-100 transition-opacity"
          aria-hidden="true"
        />
        {isOpen ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              props.onCloseTab();
            }}
            aria-label="Close this tab"
            data-tooltip="Close this tab"
            data-tooltip-pos="above"
            class="size-8 inline-flex items-center justify-center rounded text-fg-muted opacity-0 group-hover:opacity-100 hover:bg-danger-subtle hover:text-danger transition-all"
          >
            <X size={13} />
          </button>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              props.onJump();
            }}
            aria-label="Restore in a new tab"
            data-tooltip="Restore in a new tab"
            data-tooltip-pos="above"
            class="size-8 inline-flex items-center justify-center rounded text-fg-muted opacity-0 group-hover:opacity-100 hover:bg-accent-subtle hover:text-accent transition-all"
          >
            <ArrowUUpLeft size={14} weight="bold" />
          </button>
        )}
      </div>
    </div>
  );
}
