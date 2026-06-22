import { useState, useEffect, useMemo, useCallback } from "preact/hooks";
import {
  PawPrint,
  Globe,
  ArrowSquareOut,
  ArrowUUpLeft,
  Trash,
} from "@phosphor-icons/react";
import { listPawed, unpawTab } from "@/lib/pawed";
import { focusTab } from "@/lib/chrome";
import { getRootDomain } from "@/lib/utils";
import { formatRelativeTime, formatAbsoluteDateTime } from "@/lib/sessions";
import type { PawTab, PawedEntry } from "@/types";

interface Props {
  query: string;
  columns: 1 | 2 | 3 | 4;
  openTabs: PawTab[];
  onAction: () => void;
  onFilteredChange?: (
    items: { url: string; title: string; favIconUrl: string }[],
  ) => void;
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
  onAction,
  onFilteredChange,
}: Props) {
  const [entries, setEntries] = useState<PawedEntry[]>([]);

  const refresh = useCallback(async () => {
    setEntries(await listPawed());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

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

  const handleOpen = async (row: Row) => {
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
        {rows.map((row) => (
          <PawedRow
            key={row.entry.url}
            row={row}
            onOpen={() => handleOpen(row)}
            onUnpaw={() => handleUnpaw(row.entry)}
          />
        ))}
      </div>
    </div>
  );
}

function PawedRow(props: {
  row: Row;
  onOpen: () => void;
  onUnpaw: () => void;
}) {
  const { entry, openTab } = props.row;
  const domain = getRootDomain(entry.url);
  const isOpen = openTab !== null;
  const isInactive = isOpen && openTab.discarded;

  let pawColor: string;
  let pawTooltip: string;
  if (!isOpen) {
    pawColor = "bg-danger-subtle text-danger";
    pawTooltip = "Closed — click to reopen URL";
  } else if (isInactive) {
    pawColor = "bg-surface text-fg-subtle";
    pawTooltip = "Open but inactive (discarded) — click to wake + jump";
  } else {
    pawColor = "bg-success-subtle text-success";
    pawTooltip = "Open and active — click to jump";
  }

  return (
    <div
      onClick={props.onOpen}
      class="group flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-surface cursor-pointer transition-colors"
    >
      <span
        data-tooltip={pawTooltip}
        data-tooltip-pos="right"
        class={`inline-flex size-7 items-center justify-center rounded-full shrink-0 ${pawColor}`}
      >
        <PawPrint size={14} weight="fill" />
      </span>

      {entry.favIconUrl ? (
        <img
          src={entry.favIconUrl}
          alt=""
          class={`size-5 shrink-0 rounded ${isOpen && !isInactive ? "" : "grayscale opacity-70"}`}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      ) : (
        <Globe
          size={16}
          class={`text-fg-subtle shrink-0 ${isOpen && !isInactive ? "" : "opacity-70"}`}
        />
      )}

      <div class="flex-1 min-w-0">
        <div
          class={`text-[13px] leading-snug line-clamp-2 break-words ${
            isOpen && !isInactive
              ? "text-fg"
              : isInactive
                ? "text-fg-muted italic"
                : "text-fg-muted"
          }`}
        >
          {entry.title || domain || entry.url}
        </div>
        <div class="text-[11px] text-fg-subtle leading-tight mt-1 break-all line-clamp-2">
          {entry.url}
        </div>
        <div class="text-[10px] text-fg-subtle/70 mt-0.5 font-mono">
          Pawed {formatRelativeTime(new Date(entry.pawedAt).toISOString())} ·{" "}
          {formatAbsoluteDateTime(new Date(entry.pawedAt).toISOString())}
        </div>
      </div>

      <div class="flex items-center gap-0.5 shrink-0">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            props.onOpen();
          }}
          aria-label={isOpen ? "Jump to tab" : "Open URL"}
          data-tooltip={isOpen ? "Jump to tab" : "Open URL in new tab"}
          data-tooltip-pos="above"
          class="size-8 inline-flex items-center justify-center rounded text-fg-muted opacity-0 group-hover:opacity-100 hover:bg-accent-subtle hover:text-accent transition-all"
        >
          {isOpen ? (
            <ArrowSquareOut size={13} />
          ) : (
            <ArrowUUpLeft size={14} weight="bold" />
          )}
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            props.onUnpaw();
          }}
          aria-label="Unpaw"
          data-tooltip="Unpaw — remove from list"
          data-tooltip-pos="above"
          class="size-8 inline-flex items-center justify-center rounded text-fg-muted opacity-0 group-hover:opacity-100 hover:bg-danger-subtle hover:text-danger transition-all"
        >
          <Trash size={13} />
        </button>
      </div>
    </div>
  );
}
