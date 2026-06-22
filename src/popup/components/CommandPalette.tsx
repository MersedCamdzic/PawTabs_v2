import { useState, useEffect, useMemo, useRef } from "preact/hooks";
import {
  MagnifyingGlass,
  Globe,
  GridFour,
  Broom,
  BookmarkSimple,
  Gear,
  Sun,
  Moon,
  CornersOut,
} from "@phosphor-icons/react";
import { focusTab } from "@/lib/chrome";
import { getRootDomain } from "@/lib/utils";
import { applyTheme } from "@/lib/theme";
import { setPreference, getPreferences } from "@/lib/preferences";
import type { PawTab, Theme } from "@/types";

type ActionId =
  | "open-mission-control"
  | "run-wizard"
  | "open-sessions"
  | "open-settings"
  | "cycle-theme";

type Item =
  | { kind: "tab"; key: string; tab: PawTab }
  | {
      kind: "action";
      key: string;
      id: ActionId;
      label: string;
      hint?: string;
      icon: preact.ComponentChildren;
    };

interface Props {
  open: boolean;
  onClose: () => void;
  snapshot: { tabs: PawTab[] } | null;
  onOpenMissionControl: () => void;
  onOpenWizard: () => void;
  onOpenSessions: () => void;
  onOpenSettings: () => void;
}

export function CommandPalette({
  open,
  onClose,
  snapshot,
  onOpenMissionControl,
  onOpenWizard,
  onOpenSessions,
  onOpenSettings,
}: Props) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
    }
  }, [open]);

  const cycleTheme = async () => {
    const prefs = await getPreferences();
    const next: Theme =
      prefs.theme === "light"
        ? "dark"
        : prefs.theme === "dark"
          ? "system"
          : "light";
    await setPreference("theme", next);
    applyTheme(next);
  };

  const actions = useMemo<Item[]>(
    () => [
      {
        kind: "action",
        key: "act-mc",
        id: "open-mission-control",
        label: "Open Pack (dashboard)",
        hint: "Dashboard",
        icon: <GridFour size={14} />,
      },
      {
        kind: "action",
        key: "act-wiz",
        id: "run-wizard",
        label: "Cleanup Wizard",
        hint: "Close inactive, remove duplicates…",
        icon: <Broom size={14} />,
      },
      {
        kind: "action",
        key: "act-save",
        id: "open-sessions",
        label: "Save current session",
        hint: "Saved snapshots",
        icon: <BookmarkSimple size={14} />,
      },
      {
        kind: "action",
        key: "act-set",
        id: "open-settings",
        label: "Settings",
        icon: <Gear size={14} />,
      },
      {
        kind: "action",
        key: "act-theme",
        id: "cycle-theme",
        label: "Cycle theme (Light → Dark → System)",
        icon: <Sun size={14} />,
      },
    ],
    [],
  );

  const items = useMemo<Item[]>(() => {
    const q = query.trim().toLowerCase();
    const tabItems: Item[] =
      snapshot?.tabs.map((t) => ({
        kind: "tab" as const,
        key: `tab-${t.id}`,
        tab: t,
      })) ?? [];

    if (!q) {
      return [...actions, ...tabItems.slice(0, 8)];
    }

    const matchedActions = actions.filter(
      (a) => a.kind === "action" && a.label.toLowerCase().includes(q),
    );
    const matchedTabs = tabItems.filter(
      (i) =>
        i.kind === "tab" &&
        (i.tab.title.toLowerCase().includes(q) ||
          i.tab.url.toLowerCase().includes(q) ||
          i.tab.tags.some((tag) => tag.toLowerCase().includes(q)) ||
          i.tab.notes.some((n) => n.text.toLowerCase().includes(q))),
    );
    return [...matchedActions, ...matchedTabs];
  }, [query, snapshot, actions]);

  useEffect(() => {
    if (selectedIndex >= items.length) setSelectedIndex(0);
  }, [items.length, selectedIndex]);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.children[selectedIndex] as
      | HTMLElement
      | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex, open]);

  const execute = async (item: Item) => {
    if (item.kind === "tab") {
      await focusTab(item.tab.id, item.tab.windowId);
      window.close();
      return;
    }
    onClose();
    switch (item.id) {
      case "open-mission-control":
        onOpenMissionControl();
        break;
      case "run-wizard":
        onOpenWizard();
        break;
      case "open-sessions":
        onOpenSessions();
        break;
      case "open-settings":
        onOpenSettings();
        break;
      case "cycle-theme":
        cycleTheme();
        break;
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = items[selectedIndex];
      if (item) execute(item);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div
      class="fixed inset-0 z-50 flex items-start justify-center pt-16 bg-black/30 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        class="w-[380px] bg-bg-elevated border border-border rounded-lg shadow-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div class="flex items-center gap-2 px-3 h-10 border-b border-border">
          <MagnifyingGlass size={14} class="text-fg-subtle shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onInput={(e) => {
              setQuery((e.currentTarget as HTMLInputElement).value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search tabs or run a command…"
            class="flex-1 h-full bg-transparent text-[13px] placeholder:text-fg-subtle focus:outline-none"
          />
          <kbd class="text-[10px] font-mono text-fg-subtle bg-surface px-1.5 py-0.5 rounded">
            Esc
          </kbd>
        </div>

        <div
          ref={listRef}
          class="max-h-[320px] overflow-y-auto py-1"
        >
          {items.length === 0 && (
            <div class="px-3 py-6 text-center text-[12px] text-fg-subtle">
              No matches for "{query}"
            </div>
          )}
          {items.map((item, i) => (
            <CommandRow
              key={item.key}
              item={item}
              selected={i === selectedIndex}
              onClick={() => execute(item)}
              onHover={() => setSelectedIndex(i)}
            />
          ))}
        </div>

        <div class="flex items-center justify-between gap-3 px-3 py-1.5 border-t border-border text-[10px] text-fg-subtle bg-surface/50">
          <div class="flex items-center gap-2">
            <Hint label="↑↓" /> navigate
            <Hint label="↵" /> select
          </div>
          <span class="font-mono">{items.length} results</span>
        </div>
      </div>
    </div>
  );
}

function CommandRow(props: {
  item: Item;
  selected: boolean;
  onClick: () => void;
  onHover: () => void;
}) {
  const cls = props.selected
    ? "bg-accent-subtle text-accent"
    : "text-fg hover:bg-surface";

  if (props.item.kind === "tab") {
    const tab = props.item.tab;
    const domain = getRootDomain(tab.url);
    return (
      <button
        type="button"
        onClick={props.onClick}
        onMouseMove={props.onHover}
        class={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-[12px] transition-colors ${cls}`}
      >
        {tab.favIconUrl ? (
          <img src={tab.favIconUrl} alt="" class="size-4 shrink-0 rounded-sm" />
        ) : (
          <Globe size={14} class="text-fg-subtle shrink-0" />
        )}
        <span class="flex-1 truncate">{tab.title || domain}</span>
        <span
          class={`text-[10px] truncate max-w-[80px] ${
            props.selected ? "text-accent/70" : "text-fg-subtle"
          }`}
        >
          {domain}
        </span>
        <CornersOut
          size={11}
          class={props.selected ? "opacity-100" : "opacity-0"}
        />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={props.onClick}
      onMouseMove={props.onHover}
      class={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-[12px] transition-colors ${cls}`}
    >
      <span
        class={
          props.selected ? "text-accent" : "text-fg-muted"
        }
      >
        {props.item.icon}
      </span>
      <span class="flex-1 truncate font-medium">{props.item.label}</span>
      {props.item.hint && (
        <span
          class={`text-[10px] ${props.selected ? "text-accent/70" : "text-fg-subtle"}`}
        >
          {props.item.hint}
        </span>
      )}
    </button>
  );
}

function Hint(props: { label: string }) {
  return (
    <kbd class="font-mono bg-surface border border-border px-1 rounded text-fg-muted">
      {props.label}
    </kbd>
  );
}

// Re-export Moon to keep tree-shaker happy if user toggles theme via this UI
export const _internal = { Moon };
