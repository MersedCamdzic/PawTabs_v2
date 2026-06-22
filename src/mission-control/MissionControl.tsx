import { useState, useEffect, useMemo } from "preact/hooks";
import { lazy, Suspense } from "preact/compat";
import { Sidebar } from "./components/Sidebar";
import type { View } from "./components/Sidebar";
import { Toolbar } from "./components/Toolbar";
import { OverviewView } from "./components/views/OverviewView";
import { TabsListView } from "./components/views/TabsListView";
import { ColumnsPicker } from "./components/ColumnsPicker";
import { GroupByDropdown } from "./components/GroupByDropdown";
import { OrderByDropdown } from "./components/OrderByDropdown";
import {
  WindowsSortDropdown,
  type WindowsSortKey,
} from "./components/WindowsSortDropdown";
import {
  SnapshotSortDropdown,
  type SnapshotSortKey,
} from "./components/SnapshotSortDropdown";
import { TagsView } from "./components/views/TagsView";
import { SessionsView } from "./components/views/SessionsView";
import { BackupsView } from "./components/views/BackupsView";
import { RecentlyClosedView } from "./components/views/RecentlyClosedView";
import { WindowsView } from "./components/views/WindowsView";
import { useTabSnapshot } from "./hooks";
import { computeInsights } from "@/lib/stats";
import { listBackups } from "@/lib/backups";
import { listSessions } from "@/lib/sessions";
import { getAllWindowTitles } from "@/lib/windows";
import type { PawTab, GroupBy, OrderBy } from "@/types";

const TabDetailsModal = lazy(() =>
  import("@/popup/components/TabDetailsModal").then((m) => ({
    default: m.TabDetailsModal,
  })),
);

const VIEW_META: Record<View, { title: string; subtitle: string }> = {
  overview: {
    title: "Overview",
    subtitle: "A glance at your tabs, windows, and saved data.",
  },
  tabs: { title: "All tabs", subtitle: "Every tab open across all windows." },
  windows: {
    title: "Windows",
    subtitle:
      "Visualize, rename, split, merge windows. Use ⋯ on a card to move tabs, split, or close non-pinned.",
  },
  pawed: { title: "Pawed", subtitle: "Tabs you have marked as important." },
  pinned: { title: "Pinned", subtitle: "Tabs you have pinned in Chrome." },
  tags: { title: "Tags", subtitle: "Browse tabs by tag." },
  sessions: {
    title: "Snapshots",
    subtitle:
      "Save the current state of all your windows and tabs to restore later.",
  },
  "recently-closed": {
    title: "Recently closed",
    subtitle:
      "Chrome's own list of tabs you closed recently — click to reopen.",
  },
  backups: {
    title: "Wizard backups",
    subtitle:
      "Automatic safety nets created before each Cleanup Wizard run — restore here if you regret a cleanup.",
  },
  settings: {
    title: "Settings",
    subtitle: "Configure PawTabs. (Use the popup gear icon — coming here soon.)",
  },
};

export function MissionControl() {
  const { snapshot, reload } = useTabSnapshot();
  const [view, setView] = useState<View>("overview");
  const [query, setQuery] = useState("");
  const [sessionCount, setSessionCount] = useState(0);
  const [backupCount, setBackupCount] = useState(0);
  const [windowTitles, setWindowTitles] = useState<Record<number, string>>({});
  const [detailsTab, setDetailsTab] = useState<PawTab | null>(null);
  const [columnsByView, setColumnsByView] = useState<
    Record<string, 1 | 2 | 3 | 4>
  >({});
  const [groupingByView, setGroupingByView] = useState<
    Record<string, GroupBy>
  >({});
  const [orderingByView, setOrderingByView] = useState<
    Record<string, OrderBy>
  >({});

  const currentColumns = columnsByView[view] ?? 1;
  const setCurrentColumns = (n: 1 | 2 | 3 | 4) => {
    setColumnsByView((prev) => ({ ...prev, [view]: n }));
  };
  const currentGrouping = groupingByView[view] ?? "none";
  const setCurrentGrouping = (g: GroupBy) => {
    setGroupingByView((prev) => ({ ...prev, [view]: g }));
  };
  const currentOrdering = orderingByView[view] ?? "none";
  const setCurrentOrdering = (o: OrderBy) => {
    setOrderingByView((prev) => ({ ...prev, [view]: o }));
  };

  const [windowsSort, setWindowsSort] = useState<WindowsSortKey>("default");
  const [windowsColumns, setWindowsColumns] = useState<1 | 2 | 3 | 4>(3);
  const [snapshotSortByView, setSnapshotSortByView] = useState<
    Record<string, SnapshotSortKey>
  >({});
  const [snapshotColumnsByView, setSnapshotColumnsByView] = useState<
    Record<string, 1 | 2 | 3 | 4>
  >({});
  const currentSnapshotSort = snapshotSortByView[view] ?? "date-desc";
  const currentSnapshotColumns = snapshotColumnsByView[view] ?? 1;
  const setCurrentSnapshotSort = (s: SnapshotSortKey) =>
    setSnapshotSortByView((prev) => ({ ...prev, [view]: s }));
  const setCurrentSnapshotColumns = (n: 1 | 2 | 3 | 4) =>
    setSnapshotColumnsByView((prev) => ({ ...prev, [view]: n }));

  const refreshWindowTitles = async () => {
    setWindowTitles(await getAllWindowTitles());
  };

  useEffect(() => {
    refreshWindowTitles();
  }, []);

  const liveDetailsTab = useMemo<PawTab | null>(() => {
    if (!detailsTab || !snapshot) return detailsTab;
    return snapshot.tabs.find((t) => t.id === detailsTab.id) ?? detailsTab;
  }, [detailsTab, snapshot]);

  useEffect(() => {
    const refresh = async () => {
      const [s, b] = await Promise.all([listSessions(), listBackups()]);
      setSessionCount(s.length);
      setBackupCount(b.length);
    };
    refresh();
  }, [view]);

  useEffect(() => {
    setQuery("");
  }, [view]);

  const insights = useMemo(
    () => (snapshot ? computeInsights(snapshot.tabs, snapshot.windowCount) : null),
    [snapshot],
  );

  const filteredTabs = useMemo(() => {
    if (!snapshot) return [];
    const q = query.trim().toLowerCase();
    return snapshot.tabs.filter((t) => {
      if (!q) return true;
      if (t.title.toLowerCase().includes(q)) return true;
      if (t.url.toLowerCase().includes(q)) return true;
      if (t.tags.some((tag) => tag.toLowerCase().includes(q))) return true;
      if (t.notes.some((n) => n.text.toLowerCase().includes(q))) return true;
      const winTitle = windowTitles[t.windowId];
      if (winTitle && winTitle.toLowerCase().includes(q)) return true;
      return false;
    });
  }, [snapshot, query, windowTitles]);

  const pawedTabs = useMemo(
    () => filteredTabs.filter((t) => t.starred),
    [filteredTabs],
  );
  const pinnedTabs = useMemo(
    () => filteredTabs.filter((t) => t.pinned),
    [filteredTabs],
  );

  const tagsCount = useMemo(() => {
    if (!snapshot) return 0;
    const tags = new Set<string>();
    for (const t of snapshot.tabs) for (const tag of t.tags) tags.add(tag);
    return tags.size;
  }, [snapshot]);

  const counts = {
    tabs: snapshot?.tabCount ?? 0,
    windows: snapshot?.windowCount ?? 0,
    pawed: snapshot?.tabs.filter((t) => t.starred).length ?? 0,
    pinned: snapshot?.tabs.filter((t) => t.pinned).length ?? 0,
    tags: tagsCount,
    sessions: sessionCount,
    backups: backupCount,
  };

  const meta = VIEW_META[view];

  return (
    <div class="flex h-screen bg-bg text-fg">
      <Sidebar view={view} onChange={setView} counts={counts} />

      <main class="flex-1 overflow-y-auto">
        {view !== "overview" && (
          <Toolbar
            title={meta.title}
            subtitle={meta.subtitle}
            query={query}
            onQueryChange={setQuery}
            searchActions={
              ["tabs", "pawed", "pinned"].includes(view) ? (
                <>
                  <GroupByDropdown
                    value={currentGrouping}
                    onChange={setCurrentGrouping}
                  />
                  <OrderByDropdown
                    value={currentOrdering}
                    onChange={setCurrentOrdering}
                  />
                  <ColumnsPicker
                    value={currentColumns}
                    onChange={setCurrentColumns}
                  />
                </>
              ) : view === "windows" ? (
                <>
                  <WindowsSortDropdown
                    value={windowsSort}
                    onChange={setWindowsSort}
                  />
                  <ColumnsPicker
                    value={windowsColumns}
                    onChange={setWindowsColumns}
                  />
                </>
              ) : view === "sessions" || view === "backups" ? (
                <>
                  <SnapshotSortDropdown
                    value={currentSnapshotSort}
                    onChange={setCurrentSnapshotSort}
                  />
                  <ColumnsPicker
                    value={currentSnapshotColumns}
                    onChange={setCurrentSnapshotColumns}
                  />
                </>
              ) : undefined
            }
          />
        )}

        {view === "overview" && (
          <>
            <Toolbar
              title={meta.title}
              subtitle={meta.subtitle}
              query=""
              onQueryChange={() => undefined}
              showSearch={false}
            />
            {insights && snapshot ? (
              <OverviewView
                insights={insights}
                tabs={snapshot.tabs}
                windowTitles={windowTitles}
                onChangeView={setView}
                onOpenDetails={setDetailsTab}
              />
            ) : (
              <div class="px-8 py-12 text-fg-subtle text-[13px]">Loading…</div>
            )}
          </>
        )}

        {view === "tabs" && (
          <TabsListView
            tabs={filteredTabs}
            emptyText={
              query ? `No tabs match "${query}"` : "No tabs open"
            }
            windowTitles={windowTitles}
            columns={currentColumns}
            grouping={currentGrouping}
            ordering={currentOrdering}
            onAction={reload}
            onOpenDetails={setDetailsTab}
          />
        )}

        {view === "windows" && (
          <WindowsView
            query={query}
            sortBy={windowsSort}
            columns={windowsColumns}
            onAction={() => {
              reload();
              refreshWindowTitles();
            }}
            onOpenDetails={setDetailsTab}
          />
        )}

        {view === "pawed" && (
          <TabsListView
            tabs={pawedTabs}
            emptyText="No pawed tabs. Paw a tab from the popup to add it here."
            windowTitles={windowTitles}
            columns={currentColumns}
            grouping={currentGrouping}
            ordering={currentOrdering}
            onAction={reload}
            onOpenDetails={setDetailsTab}
          />
        )}

        {view === "pinned" && (
          <TabsListView
            tabs={pinnedTabs}
            emptyText="No pinned tabs."
            windowTitles={windowTitles}
            columns={currentColumns}
            grouping={currentGrouping}
            ordering={currentOrdering}
            onAction={reload}
            onOpenDetails={setDetailsTab}
          />
        )}

        {view === "tags" && snapshot && (
          <TagsView
            tabs={snapshot.tabs}
            query={query}
            windowTitles={windowTitles}
            onAction={reload}
            onOpenDetails={setDetailsTab}
          />
        )}

        {view === "sessions" && (
          <SessionsView
            query={query}
            sortBy={currentSnapshotSort}
            columns={currentSnapshotColumns}
          />
        )}

        {view === "backups" && (
          <BackupsView
            query={query}
            sortBy={currentSnapshotSort}
            columns={currentSnapshotColumns}
          />
        )}

        {view === "recently-closed" && <RecentlyClosedView query={query} />}

        {view === "settings" && (
          <div class="px-8 py-8 max-w-md">
            <div class="text-[13px] text-fg-muted">
              Open the popup and click the gear icon to manage settings.
            </div>
          </div>
        )}
      </main>

      <Suspense fallback={null}>
        {detailsTab !== null && (
          <TabDetailsModal
            tab={liveDetailsTab}
            open={detailsTab !== null}
            onClose={() => setDetailsTab(null)}
            onAction={reload}
          />
        )}
      </Suspense>
    </div>
  );
}
