import { useState, useEffect, useMemo, useCallback } from "preact/hooks";
import {
  Tag,
  Globe,
  ArrowSquareOut,
  ArrowUUpLeft,
  Trash,
  PawPrint,
  PushPin,
  Moon,
  Circle,
} from "@phosphor-icons/react";
import {
  listTags,
  removeTagFromUrl,
  type TagAggregate,
} from "@/lib/tagged-urls";
import { removeTagFromManyUrls } from "@/lib/tabs";
import { getPawedUrlSet } from "@/lib/pawed";
import { focusTab } from "@/lib/chrome";
import { getRootDomain } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/sessions";
import type { PawTab, TaggedUrlEntry } from "@/types";
import type { SnapshotSortKey } from "../SnapshotSortDropdown";
import { ConfirmModal } from "@/popup/components/ConfirmModal";

interface Props {
  query: string;
  sortBy: SnapshotSortKey;
  columns: 1 | 2 | 3 | 4;
  openTabs: PawTab[];
  onAction: () => void;
  onOpenDetails?: (tab: PawTab) => void;
  onSelectionChange?: (
    info: {
      activeTag: string | null;
      items: { url: string; title: string; favIconUrl: string }[];
    },
  ) => void;
}

const COLUMN_LAYOUT: Record<1 | 2 | 3 | 4, string> = {
  1: "space-y-0.5",
  2: "grid grid-cols-1 md:grid-cols-2 gap-1",
  3: "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-1",
  4: "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-1",
};

export function TagsView({
  query,
  sortBy,
  columns,
  openTabs,
  onAction,
  onOpenDetails,
  onSelectionChange,
}: Props) {
  const [tagList, setTagList] = useState<TagAggregate[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<TagAggregate | null>(null);
  const [pawedUrls, setPawedUrls] = useState<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    const [tags, paws] = await Promise.all([listTags(), getPawedUrlSet()]);
    setTagList(tags);
    setPawedUrls(paws);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tagList;
    return tagList.filter((t) => t.tag.toLowerCase().includes(q));
  }, [tagList, query]);

  const selectedEntries = useMemo<TaggedUrlEntry[]>(() => {
    if (!selected) return [];
    const found = tagList.find((t) => t.tag === selected);
    const list = [...(found?.entries ?? [])];
    list.sort((a, b) => {
      switch (sortBy) {
        case "date-asc":
          return a.updatedAt - b.updatedAt;
        case "name":
          return (a.title || a.url).localeCompare(b.title || b.url);
        case "date-desc":
        default:
          return b.updatedAt - a.updatedAt;
      }
    });
    return list;
  }, [selected, tagList, sortBy]);

  useEffect(() => {
    if (!onSelectionChange) return;
    onSelectionChange({
      activeTag: selected,
      items: selectedEntries.map((e) => ({
        url: e.url,
        title: e.title,
        favIconUrl: e.favIconUrl,
      })),
    });
  }, [selected, selectedEntries, onSelectionChange]);

  const openByUrl = useMemo(() => {
    const map = new Map<string, PawTab>();
    for (const t of openTabs) map.set(t.url, t);
    return map;
  }, [openTabs]);

  const handleRowClick = async (entry: TaggedUrlEntry) => {
    const tab = openByUrl.get(entry.url);
    if (tab && onOpenDetails) {
      onOpenDetails(tab);
      return;
    }
    if (tab) {
      await focusTab(tab.id, tab.windowId);
    } else {
      await chrome.tabs.create({ url: entry.url });
    }
  };

  const handleJump = async (entry: TaggedUrlEntry) => {
    const tab = openByUrl.get(entry.url);
    if (tab) {
      await focusTab(tab.id, tab.windowId);
    } else {
      await chrome.tabs.create({ url: entry.url });
    }
  };

  const handleRemoveTag = async (entry: TaggedUrlEntry, tag: string) => {
    await removeTagFromUrl(entry.url, tag);
    await refresh();
    onAction();
  };

  const confirmDeleteTag = async () => {
    if (!pendingDelete) return;
    const tag = pendingDelete;
    setPendingDelete(null);
    await removeTagFromManyUrls(
      tag.entries.map((e) => e.url),
      tag.tag,
    );
    if (selected === tag.tag) setSelected(null);
    await refresh();
    onAction();
  };

  if (tagList.length === 0) {
    return (
      <div class="px-8 py-16 text-center">
        <Tag size={32} weight="thin" class="mx-auto mb-3 text-fg-subtle" />
        <div class="text-[14px] font-medium">No tags yet</div>
        <div class="text-[12px] text-fg-subtle mt-1 max-w-md mx-auto">
          Add tags to any tab via its Tab Details modal. Tags persist by URL,
          so they survive when you close tabs — perfect for custom lists like
          "research", "shopping", "vikend".
        </div>
      </div>
    );
  }

  return (
    <div class="px-6 py-4 grid grid-cols-[240px_1fr] gap-6">
      <div class="space-y-0.5">
        <div class="text-[10px] uppercase tracking-wide text-fg-subtle font-medium mb-2 px-2">
          {filtered.length} tag{filtered.length === 1 ? "" : "s"}
        </div>
        {filtered.map((t) => {
          const active = selected === t.tag;
          return (
            <div
              key={t.tag}
              onClick={() => setSelected(active ? null : t.tag)}
              class={`group w-full h-8 px-2.5 flex items-center gap-1.5 rounded-md text-[12px] transition-colors cursor-pointer ${
                active
                  ? "bg-accent-subtle text-accent"
                  : "text-fg-muted hover:bg-surface hover:text-fg"
              }`}
            >
              <Tag size={11} weight={active ? "fill" : "regular"} />
              <span class="truncate flex-1">{t.tag}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setPendingDelete(t);
                }}
                aria-label={`Delete tag ${t.tag}`}
                title={`Delete tag "${t.tag}" from all URLs`}
                class="size-5 inline-flex items-center justify-center rounded text-fg-subtle opacity-0 group-hover:opacity-100 hover:bg-danger-subtle hover:text-danger transition-all"
              >
                <Trash size={10} />
              </button>
              <span
                class={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                  active ? "bg-accent text-white" : "bg-surface text-fg-subtle"
                }`}
              >
                {t.count}
              </span>
            </div>
          );
        })}
      </div>

      <div>
        {selected ? (
          <>
            <div class="text-[11px] uppercase tracking-wide text-fg-subtle font-medium mb-2 flex items-center gap-1.5">
              <Tag size={11} weight="fill" class="text-accent" />
              {selected} — {selectedEntries.length} tab
              {selectedEntries.length === 1 ? "" : "s"}
            </div>
            <div class={COLUMN_LAYOUT[columns]}>
              {selectedEntries.map((entry) => (
                <TaggedRow
                  key={entry.url}
                  entry={entry}
                  openTab={openByUrl.get(entry.url) ?? null}
                  pawed={pawedUrls.has(entry.url)}
                  onOpen={() => handleRowClick(entry)}
                  onJump={() => handleJump(entry)}
                  onRemoveTag={() => handleRemoveTag(entry, selected)}
                />
              ))}
            </div>
          </>
        ) : (
          <div class="py-16 text-center text-fg-subtle text-[13px]">
            Select a tag to view its URLs
          </div>
        )}
      </div>

      <ConfirmModal
        open={pendingDelete !== null}
        title="Delete tag"
        message={
          pendingDelete ? (
            <>
              Remove the tag{" "}
              <span class="font-semibold text-fg">"{pendingDelete.tag}"</span>{" "}
              from{" "}
              <span class="font-semibold text-fg">
                {pendingDelete.count} URL
                {pendingDelete.count === 1 ? "" : "s"}
              </span>
              ? This clears it everywhere it's used. Tabs and paw status
              stay untouched.
            </>
          ) : null
        }
        confirmLabel="Delete tag"
        tone="danger"
        onConfirm={confirmDeleteTag}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}

function TaggedRow(props: {
  entry: TaggedUrlEntry;
  openTab: PawTab | null;
  pawed: boolean;
  onOpen: () => void;
  onJump: () => void;
  onRemoveTag: () => void;
}) {
  const { entry, openTab, pawed } = props;
  const domain = getRootDomain(entry.url);
  const isOpen = openTab !== null;
  const isInactive = isOpen && openTab.discarded;
  const isPinned = isOpen && openTab.pinned;

  let statusDotClass: string;
  let statusTooltip: string;
  if (!isOpen) {
    statusDotClass = "text-danger";
    statusTooltip = "Closed — click to reopen";
  } else if (isInactive) {
    statusDotClass = "text-fg-subtle";
    statusTooltip = "Open but inactive (discarded)";
  } else {
    statusDotClass = "text-success";
    statusTooltip = "Open and active";
  }

  return (
    <div
      onClick={props.onOpen}
      class="group flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-surface cursor-pointer transition-colors"
    >
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
          class={`flex items-center gap-1.5 text-[13px] leading-snug line-clamp-2 ${
            isOpen && !isInactive
              ? "text-fg"
              : isInactive
                ? "text-fg-muted italic"
                : "text-fg-muted"
          }`}
        >
          <span
            title={statusTooltip}
            class={`shrink-0 inline-flex ${statusDotClass}`}
          >
            <Circle size={8} weight="fill" />
          </span>
          <span class="truncate">{entry.title || domain}</span>
          {pawed && (
            <span
              title="Pawed"
              class="shrink-0 inline-flex text-accent"
            >
              <PawPrint size={11} weight="fill" />
            </span>
          )}
          {isPinned && (
            <span
              title="Pinned"
              class="shrink-0 inline-flex text-warning"
            >
              <PushPin size={11} weight="fill" />
            </span>
          )}
          {isInactive && (
            <span
              title="Inactive (discarded)"
              class="shrink-0 inline-flex text-fg-subtle"
            >
              <Moon size={11} weight="fill" />
            </span>
          )}
        </div>
        <div class="text-[11px] text-fg-subtle leading-tight mt-1 break-all line-clamp-2">
          {entry.url}
        </div>
        <div class="text-[10px] text-fg-subtle/70 mt-0.5">
          Tagged {formatRelativeTime(new Date(entry.updatedAt).toISOString())}
        </div>
      </div>
      <div class="flex items-center gap-0.5 shrink-0">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            props.onJump();
          }}
          aria-label={isOpen ? "Jump" : "Open"}
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
            props.onRemoveTag();
          }}
          aria-label="Remove tag from URL"
          data-tooltip="Remove tag from URL"
          data-tooltip-pos="above"
          class="size-8 inline-flex items-center justify-center rounded text-fg-muted opacity-0 group-hover:opacity-100 hover:bg-danger-subtle hover:text-danger transition-all"
        >
          <Trash size={13} />
        </button>
      </div>
    </div>
  );
}
