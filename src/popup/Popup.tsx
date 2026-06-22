import { useMemo, useState, useEffect } from "preact/hooks";
import { lazy, Suspense } from "preact/compat";
import {
  MagnifyingGlass,
  Gear,
  GridFour,
  Broom,
  PawPrint,
  BookmarkSimple,
} from "@phosphor-icons/react";
import { useTabSnapshot } from "./hooks";
import { TabGroupSection } from "./components/TabGroupSection";
import { GroupBy } from "./components/GroupBy";
import { OrderBy } from "./components/OrderBy";
import { getAllWindowTitles } from "@/lib/windows";
import { orderTabsInGroups } from "@/lib/grouping";

const WizardModal = lazy(() =>
  import("./components/WizardModal").then((m) => ({ default: m.WizardModal })),
);
const SessionsModal = lazy(() =>
  import("./components/SessionsModal").then((m) => ({
    default: m.SessionsModal,
  })),
);
const SettingsModal = lazy(() =>
  import("./components/SettingsModal").then((m) => ({
    default: m.SettingsModal,
  })),
);
const TabDetailsModal = lazy(() =>
  import("./components/TabDetailsModal").then((m) => ({
    default: m.TabDetailsModal,
  })),
);
const CommandPalette = lazy(() =>
  import("./components/CommandPalette").then((m) => ({
    default: m.CommandPalette,
  })),
);
import { groupTabs } from "@/lib/grouping";
import { getPreferences, setPreference } from "@/lib/preferences";
import type {
  GroupBy as GroupByType,
  OrderBy as OrderByType,
  PawTab,
} from "@/types";

export function Popup() {
  const { snapshot, error, reload } = useTabSnapshot();
  const [query, setQuery] = useState("");
  const [grouping, setGrouping] = useState<GroupByType>("window");
  const [ordering, setOrdering] = useState<OrderByType>("none");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [windowTitles, setWindowTitles] = useState<Record<number, string>>({});
  const [wizardOpen, setWizardOpen] = useState(false);
  const [sessionsOpen, setSessionsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [detailsTab, setDetailsTab] = useState<PawTab | null>(null);

  const refreshWindowTitles = async () => {
    setWindowTitles(await getAllWindowTitles());
  };

  const liveDetailsTab = useMemo<PawTab | null>(() => {
    if (!detailsTab || !snapshot) return detailsTab;
    return snapshot.tabs.find((t) => t.id === detailsTab.id) ?? detailsTab;
  }, [detailsTab, snapshot]);

  useEffect(() => {
    getPreferences().then((prefs) => {
      setGrouping(prefs.grouping);
      setOrdering(prefs.ordering);
      setCollapsed(new Set(prefs.collapsedGroups));
    });
    refreshWindowTitles();
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const updateGrouping = (next: GroupByType) => {
    setGrouping(next);
    setPreference("grouping", next);
  };

  const updateOrdering = (next: OrderByType) => {
    setOrdering(next);
    setPreference("ordering", next);
  };

  const toggleCollapsed = (key: string) => {
    const next = new Set(collapsed);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setCollapsed(next);
    setPreference("collapsedGroups", Array.from(next));
  };

  const handleAction = () => {
    reload();
    refreshWindowTitles();
  };

  const filtered = useMemo<PawTab[]>(() => {
    if (!snapshot) return [];
    const q = query.trim().toLowerCase();
    if (!q) return snapshot.tabs;
    return snapshot.tabs.filter((t) => {
      if (t.title.toLowerCase().includes(q)) return true;
      if (t.url.toLowerCase().includes(q)) return true;
      if (t.tags.some((tag) => tag.toLowerCase().includes(q))) return true;
      if (t.notes.some((n) => n.text.toLowerCase().includes(q))) return true;
      return false;
    });
  }, [snapshot, query]);

  const groups = useMemo(
    () => orderTabsInGroups(groupTabs(filtered, grouping, windowTitles), ordering),
    [filtered, grouping, ordering, windowTitles],
  );

  const openMissionControl = async () => {
    const url = chrome.runtime.getURL("src/mission-control/index.html");
    await chrome.tabs.create({ url });
    window.close();
  };

  return (
    <div class="w-[420px] min-h-[560px] max-h-[600px] bg-bg text-fg flex flex-col">
      <header class="flex items-center justify-between px-4 pt-4 pb-3">
        <div class="flex items-center gap-1.5 text-fg-muted">
          <PawPrint size={13} weight="fill" class="text-accent" />
          <h1 class="text-[13px] font-semibold tracking-tight">PawTabs</h1>
        </div>
        <div class="flex items-center gap-1">
          <IconButton
            label="Saved sessions"
            onClick={() => setSessionsOpen(true)}
          >
            <BookmarkSimple size={16} weight="regular" />
          </IconButton>
          <IconButton label="Wizard" onClick={() => setWizardOpen(true)}>
            <Broom size={16} weight="regular" />
          </IconButton>
          <IconButton label="Mission Control" onClick={openMissionControl}>
            <GridFour size={16} weight="regular" />
          </IconButton>
          <IconButton label="Settings" onClick={() => setSettingsOpen(true)}>
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

      <section class="px-4 pb-2 flex items-center justify-between gap-2">
        <span class="text-[11px] text-fg-subtle">
          {snapshot ? `${filtered.length} of ${snapshot.tabCount}` : ""}
        </span>
        <div class="flex items-center gap-1.5">
          <OrderBy value={ordering} onChange={updateOrdering} />
          <GroupBy value={grouping} onChange={updateGrouping} />
        </div>
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
              grouping={grouping}
              showHeader={grouping !== "none"}
              collapsed={collapsed.has(group.key)}
              onToggle={() => toggleCollapsed(group.key)}
              onAction={handleAction}
              onOpenDetails={setDetailsTab}
            />
          ))}
      </div>

      <footer class="border-t border-border px-4 py-2 flex items-center justify-between text-[11px] text-fg-subtle">
        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          class="hover:text-fg transition-colors inline-flex items-center gap-1.5"
        >
          <span class="font-mono bg-surface border border-border px-1 rounded text-[10px]">
            ⌘K
          </span>
          <span>command palette</span>
        </button>
        <span class="font-mono">⌘⇧Y to open</span>
      </footer>

      <Suspense fallback={null}>
        {wizardOpen && (
          <WizardModal
            open={wizardOpen}
            onClose={() => setWizardOpen(false)}
            onComplete={reload}
          />
        )}
        {sessionsOpen && (
          <SessionsModal
            open={sessionsOpen}
            onClose={() => setSessionsOpen(false)}
            currentStats={
              snapshot
                ? {
                    windowCount: snapshot.windowCount,
                    tabCount: snapshot.tabCount,
                    pinnedCount: snapshot.tabs.filter((t) => t.pinned).length,
                  }
                : undefined
            }
          />
        )}
        {settingsOpen && (
          <SettingsModal
            open={settingsOpen}
            onClose={() => setSettingsOpen(false)}
          />
        )}
        {detailsTab !== null && (
          <TabDetailsModal
            tab={liveDetailsTab}
            open={detailsTab !== null}
            onClose={() => setDetailsTab(null)}
            onAction={reload}
          />
        )}
        {paletteOpen && (
          <CommandPalette
            open={paletteOpen}
            onClose={() => setPaletteOpen(false)}
            snapshot={snapshot}
            onOpenMissionControl={openMissionControl}
            onOpenWizard={() => setWizardOpen(true)}
            onOpenSessions={() => setSessionsOpen(true)}
            onOpenSettings={() => setSettingsOpen(true)}
          />
        )}
      </Suspense>
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
