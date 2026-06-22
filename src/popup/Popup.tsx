import { useMemo, useState, useEffect } from "preact/hooks";
import {
  MagnifyingGlass,
  Gear,
  GridFour,
  Sparkle,
  PawPrint,
} from "@phosphor-icons/react";
import { useTabSnapshot } from "./hooks";
import { TabGroupSection } from "./components/TabGroupSection";
import { GroupBy } from "./components/GroupBy";
import { groupTabs } from "@/lib/grouping";
import { storage } from "@/lib/storage";
import type { GroupBy as GroupByType, PawTab } from "@/types";

export function Popup() {
  const { snapshot, error, reload } = useTabSnapshot();
  const [query, setQuery] = useState("");
  const [grouping, setGrouping] = useState<GroupByType>("window");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  useEffect(() => {
    storage.get("preferences").then((prefs) => {
      if (prefs?.grouping) setGrouping(prefs.grouping);
      if (prefs?.collapsedGroups) setCollapsed(new Set(prefs.collapsedGroups));
    });
  }, []);

  const updateGrouping = (next: GroupByType) => {
    setGrouping(next);
    storage.update("preferences", (prev) => ({
      grouping: next,
      collapsedGroups: prev?.collapsedGroups ?? [],
    }));
  };

  const toggleCollapsed = (key: string) => {
    const next = new Set(collapsed);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setCollapsed(next);
    storage.update("preferences", (prev) => ({
      grouping: prev?.grouping ?? "window",
      collapsedGroups: Array.from(next),
    }));
  };

  const filtered = useMemo<PawTab[]>(() => {
    if (!snapshot) return [];
    const q = query.trim().toLowerCase();
    if (!q) return snapshot.tabs;
    return snapshot.tabs.filter(
      (t) =>
        t.title.toLowerCase().includes(q) || t.url.toLowerCase().includes(q),
    );
  }, [snapshot, query]);

  const groups = useMemo(
    () => groupTabs(filtered, grouping),
    [filtered, grouping],
  );

  const openMissionControl = async () => {
    const url = chrome.runtime.getURL("src/mission-control/index.html");
    await chrome.tabs.create({ url });
    window.close();
  };

  return (
    <div class="w-[420px] min-h-[560px] max-h-[600px] bg-bg text-fg flex flex-col">
      <header class="flex items-center justify-between px-4 pt-4 pb-3">
        <div class="flex items-center gap-2">
          <span class="inline-flex size-7 items-center justify-center rounded-md bg-accent-subtle text-accent">
            <PawPrint size={16} weight="fill" />
          </span>
          <h1 class="text-[15px] font-semibold tracking-tight">PawTabs</h1>
        </div>
        <div class="flex items-center gap-1">
          <IconButton label="Wizard">
            <Sparkle size={16} weight="regular" />
          </IconButton>
          <IconButton label="Mission Control" onClick={openMissionControl}>
            <GridFour size={16} weight="regular" />
          </IconButton>
          <IconButton label="Settings">
            <Gear size={16} weight="regular" />
          </IconButton>
        </div>
      </header>

      <section class="px-4 pb-3">
        <div class="grid grid-cols-3 gap-2">
          <Stat value={snapshot?.windowCount ?? 0} label="Windows" />
          <Stat value={snapshot?.tabCount ?? 0} label="Tabs" />
          <Stat
            value={snapshot?.inactiveCount ?? 0}
            label="Inactive"
            tone="warning"
          />
        </div>
      </section>

      <section class="px-4 pb-3">
        <div class="relative">
          <MagnifyingGlass
            size={14}
            class="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle peer-focus:text-accent pointer-events-none"
          />
          <input
            type="text"
            value={query}
            onInput={(e) =>
              setQuery((e.currentTarget as HTMLInputElement).value)
            }
            placeholder="Search tabs"
            class="peer w-full h-9 pl-8 pr-3 bg-surface border border-border rounded-md text-[13px] placeholder:text-fg-subtle focus:outline-none focus:bg-bg-elevated focus:border-accent focus:ring-4 focus:ring-accent/10 transition-colors"
          />
        </div>
      </section>

      <section class="px-4 pb-2 flex items-center justify-between">
        <span class="text-[11px] text-fg-subtle">
          {snapshot ? `${filtered.length} of ${snapshot.tabCount}` : ""}
        </span>
        <GroupBy value={grouping} onChange={updateGrouping} />
      </section>

      <div class="border-t border-border" />

      <div class="flex-1 px-2 py-2 overflow-y-auto">
        {error && (
          <div class="px-2 py-3 text-[12px] text-danger bg-danger-subtle rounded-md m-2">
            {error}
          </div>
        )}

        {!snapshot && !error && (
          <div class="text-fg-subtle text-[13px] text-center py-12">
            Loading tabs…
          </div>
        )}

        {snapshot && filtered.length === 0 && (
          <div class="text-fg-subtle text-[13px] text-center py-12">
            {query ? `No tabs match "${query}"` : "No tabs open"}
          </div>
        )}

        {snapshot &&
          groups.map((group) => (
            <TabGroupSection
              key={group.key}
              group={group}
              showHeader={grouping !== "none"}
              collapsed={collapsed.has(group.key)}
              onToggle={() => toggleCollapsed(group.key)}
              onAction={reload}
            />
          ))}
      </div>

      <footer class="border-t border-border px-4 py-2 flex items-center justify-between text-[11px] text-fg-subtle">
        <span>PawTabs v2</span>
        <span class="font-mono">⌘⇧Y</span>
      </footer>
    </div>
  );
}

function IconButton(props: {
  label: string;
  onClick?: () => void;
  children: preact.ComponentChildren;
}) {
  return (
    <button
      type="button"
      title={props.label}
      aria-label={props.label}
      onClick={props.onClick}
      class="size-7 inline-flex items-center justify-center rounded-md text-fg-muted hover:bg-accent-subtle hover:text-accent transition-colors"
    >
      {props.children}
    </button>
  );
}

function Stat(props: {
  value: number;
  label: string;
  tone?: "default" | "warning";
}) {
  const valueColor =
    props.tone === "warning" && props.value > 0 ? "text-warning" : "text-fg";
  return (
    <div class="bg-surface border border-border rounded-md p-3 hover:border-border-strong transition-colors">
      <div class={`text-[18px] font-semibold leading-tight ${valueColor}`}>
        {props.value}
      </div>
      <div class="text-[11px] text-fg-muted uppercase tracking-wide mt-0.5">
        {props.label}
      </div>
    </div>
  );
}
