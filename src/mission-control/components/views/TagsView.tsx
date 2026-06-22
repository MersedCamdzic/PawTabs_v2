import { useState, useEffect, useMemo, useCallback } from "preact/hooks";
import {
  Tag,
  Globe,
  ArrowSquareOut,
  ArrowUUpLeft,
  Trash,
  X,
} from "@phosphor-icons/react";
import {
  listTags,
  removeTagFromUrl,
  type TagAggregate,
} from "@/lib/tagged-urls";
import { focusTab } from "@/lib/chrome";
import { getRootDomain } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/sessions";
import type { PawTab, TaggedUrlEntry } from "@/types";

interface Props {
  query: string;
  openTabs: PawTab[];
  onAction: () => void;
}

export function TagsView({ query, openTabs, onAction }: Props) {
  const [tagList, setTagList] = useState<TagAggregate[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setTagList(await listTags());
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
    return found?.entries ?? [];
  }, [selected, tagList]);

  const openByUrl = useMemo(() => {
    const map = new Map<string, PawTab>();
    for (const t of openTabs) map.set(t.url, t);
    return map;
  }, [openTabs]);

  const handleOpen = async (entry: TaggedUrlEntry) => {
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
              {selected} — {selectedEntries.length} tab
              {selectedEntries.length === 1 ? "" : "s"}
            </div>
            <div class="space-y-0.5">
              {selectedEntries.map((entry) => (
                <TaggedRow
                  key={entry.url}
                  entry={entry}
                  openTab={openByUrl.get(entry.url) ?? null}
                  onOpen={() => handleOpen(entry)}
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
    </div>
  );
}

function TaggedRow(props: {
  entry: TaggedUrlEntry;
  openTab: PawTab | null;
  onOpen: () => void;
  onRemoveTag: () => void;
}) {
  const { entry, openTab } = props;
  const domain = getRootDomain(entry.url);
  const isOpen = openTab !== null;

  return (
    <div
      onClick={props.onOpen}
      class="group flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-surface cursor-pointer transition-colors"
    >
      {entry.favIconUrl ? (
        <img
          src={entry.favIconUrl}
          alt=""
          class={`size-5 shrink-0 rounded ${isOpen ? "" : "grayscale opacity-70"}`}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      ) : (
        <Globe
          size={16}
          class={`text-fg-subtle shrink-0 ${isOpen ? "" : "opacity-70"}`}
        />
      )}
      <div class="flex-1 min-w-0">
        <div
          class={`text-[13px] leading-snug line-clamp-2 ${isOpen ? "text-fg" : "text-fg-muted"}`}
        >
          {entry.title || domain}
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
            props.onOpen();
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
          aria-label="Remove from this tag"
          data-tooltip="Remove from this tag"
          data-tooltip-pos="above"
          class="size-8 inline-flex items-center justify-center rounded text-fg-muted opacity-0 group-hover:opacity-100 hover:bg-danger-subtle hover:text-danger transition-all"
        >
          <X size={13} />
        </button>
      </div>
    </div>
  );
}
