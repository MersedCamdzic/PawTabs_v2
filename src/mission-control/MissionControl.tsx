import { useState, useEffect, useMemo } from "preact/hooks";
import { lazy, Suspense } from "preact/compat";
import { Sidebar } from "./components/Sidebar";
import type { View } from "./components/Sidebar";
import { Toolbar } from "./components/Toolbar";
import { OverviewView } from "./components/views/OverviewView";
import { TabsListView } from "./components/views/TabsListView";
import { PawedView } from "./components/views/PawedView";
import { PinnedView } from "./components/views/PinnedView";
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
import { SnapshotPromptModal } from "./components/SnapshotPromptModal";
import { BulkActionsMenu } from "./components/BulkActionsMenu";
import { ConfirmModal } from "@/popup/components/ConfirmModal";
import {
  BulkUrlActionsMenu,
  type BulkUrlItem,
} from "./components/BulkUrlActionsMenu";
import { FloppyDisk, Trash, ArrowUUpLeft } from "@phosphor-icons/react";
import { TagsView } from "./components/views/TagsView";
import { SessionsView } from "./components/views/SessionsView";
import { BackupsView } from "./components/views/BackupsView";
import { RecentlyClosedView } from "./components/views/RecentlyClosedView";
import { HistoryView } from "./components/views/HistoryView";
import { WindowsView } from "./components/views/WindowsView";
import { useTabSnapshot } from "./hooks";
import { computeInsights } from "@/lib/stats";
import { listBackups } from "@/lib/backups";
import { listSessions } from "@/lib/sessions";
import { getAllWindowTitles, getAllWindowMeta } from "@/lib/windows";
import type { PawTab, GroupBy, OrderBy } from "@/types";

const TabDetailsModal = lazy(() =>
  import("@/popup/components/TabDetailsModal").then((m) => ({
    default: m.TabDetailsModal,
  })),
);
const WizardModal = lazy(() =>
  import("@/popup/components/WizardModal").then((m) => ({
    default: m.WizardModal,
  })),
);

const VIEW_META: Record<View, { title: string; subtitle: string }> = {
  overview: {
    title: "Overview",
    subtitle: "A glance at your tabs, windows, and saved data.",
  },
  tabs: { title: "Open tabs", subtitle: "Every tab currently open across all windows." },
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
      "Saved states of your tabs + metadata backups, all in one place. Restore any to roll back.",
  },
  "recently-closed": {
    title: "Recently closed",
    subtitle:
      "Chrome's own list of tabs you closed recently — click to reopen.",
  },
  history: {
    title: "History",
    subtitle:
      "Search Chrome's full browsing history. Click any entry to paw, tag, or reopen.",
  },
  backups: {
    title: "Wizard backups",
    subtitle:
      "Automatic safety nets created before each Cleanup Wizard run.",
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
  const [windowMeta, setWindowMeta] = useState<
    Record<number, { title?: string; color?: import("@/types").WindowColor }>
  >({});
  const [detailsTab, setDetailsTab] = useState<PawTab | null>(null);
  const [closedDetailsTab, setClosedDetailsTab] = useState<PawTab | null>(null);
  const [pawedBulkItems, setPawedBulkItems] = useState<BulkUrlItem[]>([]);
  const [tagsBulkState, setTagsBulkState] = useState<{
    activeTag: string | null;
    items: BulkUrlItem[];
  }>({ activeTag: null, items: [] });
  const [rcVisibleCount, setRcVisibleCount] = useState(0);
  const [rcClearSignal, setRcClearSignal] = useState(0);
  const [rcReopenSignal, setRcReopenSignal] = useState(0);
  const [rcConfirmClearOpen, setRcConfirmClearOpen] = useState(false);
  const [rcConfirmReopenOpen, setRcConfirmReopenOpen] = useState(false);
  const [historyVisibleCount, setHistoryVisibleCount] = useState(0);
  const [historyClearFilteredSignal, setHistoryClearFilteredSignal] =
    useState(0);
  const [historyClearAllSignal, setHistoryClearAllSignal] = useState(0);
  const [historyConfirmFilteredOpen, setHistoryConfirmFilteredOpen] =
    useState(false);
  const [historyConfirmAllOpen, setHistoryConfirmAllOpen] = useState(false);
  const [urlDataSignal, setUrlDataSignal] = useState(0);
  const bumpAll = () => {
    reload();
    setUrlDataSignal((n) => n + 1);
  };
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
  const [snapshotPromptOpen, setSnapshotPromptOpen] = useState(false);
  const [snapshotsRefreshSignal, setSnapshotsRefreshSignal] = useState(0);
  const [wizardOpen, setWizardOpen] = useState(false);
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
    const [titles, meta] = await Promise.all([
      getAllWindowTitles(),
      getAllWindowMeta(),
    ]);
    setWindowTitles(titles);
    setWindowMeta(meta);
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
      <Sidebar
        view={view}
        onChange={setView}
        onOpenCleanup={() => setWizardOpen(true)}
        counts={counts}
      />

      <main class="flex-1 overflow-y-auto">
        {view !== "overview" && (
          <Toolbar
            title={meta.title}
            subtitle={meta.subtitle}
            query={query}
            onQueryChange={setQuery}
            searchActions={
              view === "tabs" || view === "pinned" ? (
                <>
                  <BulkActionsMenu
                    tabs={view === "pinned" ? pinnedTabs : filteredTabs}
                    onAction={bumpAll}
                  />
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
              ) : view === "pawed" ? (
                <>
                  <BulkUrlActionsMenu
                    items={pawedBulkItems}
                    mode="pawed"
                    onAction={bumpAll}
                  />
                  <ColumnsPicker
                    value={currentColumns}
                    onChange={setCurrentColumns}
                  />
                </>
              ) : view === "windows" ? (
                <>
                  <BulkActionsMenu tabs={filteredTabs} onAction={reload} />
                  <WindowsSortDropdown
                    value={windowsSort}
                    onChange={setWindowsSort}
                  />
                  <ColumnsPicker
                    value={windowsColumns > 3 ? 3 : windowsColumns}
                    onChange={setWindowsColumns}
                    max={3}
                  />
                </>
              ) : view === "sessions" || view === "backups" ? (
                <>
                  <button
                    type="button"
                    onClick={() => setSnapshotPromptOpen(true)}
                    class="h-9 px-3 inline-flex items-center gap-1.5 text-[12px] font-medium rounded-md bg-accent text-white hover:bg-accent-hover transition-colors"
                  >
                    <FloppyDisk size={12} weight="fill" />
                    Snapshot now
                  </button>
                  <SnapshotSortDropdown
                    value={currentSnapshotSort}
                    onChange={setCurrentSnapshotSort}
                  />
                  <ColumnsPicker
                    value={currentSnapshotColumns}
                    onChange={setCurrentSnapshotColumns}
                  />
                </>
              ) : view === "tags" ? (
                <>
                  <BulkUrlActionsMenu
                    items={tagsBulkState.items}
                    mode="tags"
                    activeTag={tagsBulkState.activeTag}
                    label={
                      tagsBulkState.activeTag
                        ? `Bulk "${tagsBulkState.activeTag}"`
                        : "Bulk"
                    }
                    onAction={bumpAll}
                  />
                  <SnapshotSortDropdown
                    value={currentSnapshotSort}
                    onChange={setCurrentSnapshotSort}
                    options={[
                      { value: "date-desc", label: "Newest first" },
                      { value: "date-asc", label: "Oldest first" },
                      { value: "name", label: "Title (A→Z)" },
                    ]}
                  />
                  <ColumnsPicker
                    value={currentSnapshotColumns}
                    onChange={setCurrentSnapshotColumns}
                  />
                </>
              ) : view === "recently-closed" ? (
                <>
                  <div class="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        if (rcVisibleCount === 0) return;
                        setRcConfirmReopenOpen(true);
                      }}
                      disabled={rcVisibleCount === 0}
                      class="h-9 px-3 inline-flex items-center gap-1.5 text-[12px] font-medium rounded-md border border-accent/30 text-accent bg-accent-subtle hover:border-accent hover:bg-accent hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      title="Reopen all visible tabs in one new window"
                    >
                      <ArrowUUpLeft size={13} weight="bold" />
                      Reopen all
                      <span class="text-[10px] font-mono px-1.5 h-4 inline-flex items-center rounded bg-accent/15 text-accent">
                        {rcVisibleCount}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (rcVisibleCount === 0) return;
                        setRcConfirmClearOpen(true);
                      }}
                      disabled={rcVisibleCount === 0}
                      class="h-9 px-3 inline-flex items-center gap-1.5 text-[12px] font-medium rounded-md border border-danger/30 text-danger bg-danger-subtle hover:border-danger hover:bg-danger hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      title="Hide all currently listed items"
                    >
                      <Trash size={13} weight="fill" />
                      Clear all
                      <span class="text-[10px] font-mono px-1.5 h-4 inline-flex items-center rounded bg-danger/15 text-danger">
                        {rcVisibleCount}
                      </span>
                    </button>
                  </div>
                  <span
                    class="w-px h-6 bg-border mx-1"
                    aria-hidden="true"
                  />
                  <div class="flex items-center gap-1.5">
                    <SnapshotSortDropdown
                      value={currentSnapshotSort}
                      onChange={setCurrentSnapshotSort}
                      options={[
                        { value: "date-desc", label: "Newest first" },
                        { value: "date-asc", label: "Oldest first" },
                        { value: "name", label: "Title (A→Z)" },
                      ]}
                    />
                    <ColumnsPicker
                      value={currentSnapshotColumns}
                      onChange={setCurrentSnapshotColumns}
                    />
                  </div>
                </>
              ) : view === "history" ? (
                <>
                  <div class="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        if (historyVisibleCount === 0) return;
                        setHistoryConfirmFilteredOpen(true);
                      }}
                      disabled={historyVisibleCount === 0}
                      class="h-9 px-3 inline-flex items-center gap-1.5 text-[12px] font-medium rounded-md border border-warning/30 text-warning bg-warning-subtle hover:border-warning hover:bg-warning hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      title="Delete only the entries currently visible from Chrome history"
                    >
                      <Trash size={13} weight="fill" />
                      Clear filtered
                      <span class="text-[10px] font-mono px-1.5 h-4 inline-flex items-center rounded bg-warning/15 text-warning">
                        {historyVisibleCount}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setHistoryConfirmAllOpen(true)}
                      class="h-9 px-3 inline-flex items-center gap-1.5 text-[12px] font-medium rounded-md border border-danger/30 text-danger bg-danger-subtle hover:border-danger hover:bg-danger hover:text-white transition-colors"
                      title="Delete ALL Chrome browsing history"
                    >
                      <Trash size={13} weight="fill" />
                      Clear all history
                    </button>
                  </div>
                  <span
                    class="w-px h-6 bg-border mx-1"
                    aria-hidden="true"
                  />
                  <div class="flex items-center gap-1.5">
                    <SnapshotSortDropdown
                      value={currentSnapshotSort}
                      onChange={setCurrentSnapshotSort}
                      options={[
                        { value: "date-desc", label: "Newest first" },
                        { value: "date-asc", label: "Oldest first" },
                        { value: "name", label: "Title (A→Z)" },
                      ]}
                    />
                    <ColumnsPicker
                      value={currentSnapshotColumns}
                      onChange={setCurrentSnapshotColumns}
                    />
                  </div>
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
            windowMeta={windowMeta}
            columns={currentColumns}
            grouping={currentGrouping}
            ordering={currentOrdering}
            onAction={bumpAll}
            onOpenDetails={setDetailsTab}
          />
        )}

        {view === "windows" && (
          <WindowsView
            query={query}
            sortBy={windowsSort}
            columns={
              (windowsColumns > 3 ? 3 : windowsColumns) as 1 | 2 | 3
            }
            onAction={() => {
              reload();
              refreshWindowTitles();
            }}
            onOpenDetails={setDetailsTab}
            refreshSignal={urlDataSignal}
          />
        )}

        {view === "pawed" && (
          <PawedView
            query={query}
            columns={currentColumns}
            openTabs={snapshot?.tabs ?? []}
            windowMeta={windowMeta}
            onAction={bumpAll}
            onFilteredChange={setPawedBulkItems}
            onOpenDetails={setDetailsTab}
            onOpenClosedDetails={setClosedDetailsTab}
            refreshSignal={urlDataSignal}
          />
        )}

        {view === "pinned" && (
          <PinnedView
            tabs={pinnedTabs}
            emptyText="No pinned tabs."
            windowMeta={windowMeta}
            columns={currentColumns}
            onAction={bumpAll}
            onOpenDetails={setDetailsTab}
            refreshSignal={urlDataSignal}
          />
        )}

        {view === "tags" && (
          <TagsView
            query={query}
            sortBy={currentSnapshotSort}
            columns={currentSnapshotColumns}
            openTabs={snapshot?.tabs ?? []}
            onAction={bumpAll}
            onOpenDetails={setDetailsTab}
            onOpenClosedDetails={setClosedDetailsTab}
            onSelectionChange={setTagsBulkState}
            refreshSignal={urlDataSignal}
          />
        )}

        {view === "sessions" && (
          <SessionsView
            query={query}
            sortBy={currentSnapshotSort}
            columns={currentSnapshotColumns}
            refreshSignal={snapshotsRefreshSignal}
          />
        )}

        {view === "backups" && (
          <BackupsView
            query={query}
            sortBy={currentSnapshotSort}
            columns={currentSnapshotColumns}
          />
        )}

        {view === "recently-closed" && (
          <RecentlyClosedView
            query={query}
            sortBy={currentSnapshotSort}
            columns={currentSnapshotColumns}
            clearSignal={rcClearSignal}
            reopenAllSignal={rcReopenSignal}
            onVisibleCountChange={setRcVisibleCount}
            onOpenClosedDetails={setClosedDetailsTab}
            refreshSignal={urlDataSignal}
          />
        )}

        {view === "history" && (
          <HistoryView
            query={query}
            sortBy={currentSnapshotSort}
            columns={currentSnapshotColumns}
            openTabs={snapshot?.tabs ?? []}
            clearFilteredSignal={historyClearFilteredSignal}
            clearAllSignal={historyClearAllSignal}
            refreshSignal={urlDataSignal}
            onVisibleCountChange={setHistoryVisibleCount}
            onOpenLiveDetails={setDetailsTab}
            onOpenClosedDetails={setClosedDetailsTab}
          />
        )}

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
            onAction={bumpAll}
          />
        )}
        {closedDetailsTab !== null && (
          <TabDetailsModal
            tab={closedDetailsTab}
            closedMode
            open={closedDetailsTab !== null}
            onClose={() => setClosedDetailsTab(null)}
            onAction={bumpAll}
          />
        )}
      </Suspense>

      <SnapshotPromptModal
        open={snapshotPromptOpen}
        onClose={() => setSnapshotPromptOpen(false)}
        onSaved={() => setSnapshotsRefreshSignal((n) => n + 1)}
      />

      <ConfirmModal
        open={rcConfirmClearOpen}
        title="Clear recently closed"
        message={
          <>
            Hide{" "}
            <span class="font-semibold text-fg">
              {rcVisibleCount} item{rcVisibleCount === 1 ? "" : "s"}
            </span>{" "}
            from the recently closed list? Chrome still remembers them
            internally — this only clears them here.
          </>
        }
        confirmLabel="Clear all"
        tone="danger"
        onConfirm={() => {
          setRcClearSignal((n) => n + 1);
          setRcConfirmClearOpen(false);
        }}
        onCancel={() => setRcConfirmClearOpen(false)}
      />

      <ConfirmModal
        open={rcConfirmReopenOpen}
        title="Reopen all"
        message={
          <>
            Open{" "}
            <span class="font-semibold text-fg">
              {rcVisibleCount} tab{rcVisibleCount === 1 ? "" : "s"}
            </span>{" "}
            in a new window?
          </>
        }
        confirmLabel="Reopen in new window"
        tone="accent"
        onConfirm={() => {
          setRcReopenSignal((n) => n + 1);
          setRcConfirmReopenOpen(false);
        }}
        onCancel={() => setRcConfirmReopenOpen(false)}
      />

      <ConfirmModal
        open={historyConfirmFilteredOpen}
        title="Clear filtered history"
        message={
          <>
            Permanently delete{" "}
            <span class="font-semibold text-fg">
              {historyVisibleCount} entr
              {historyVisibleCount === 1 ? "y" : "ies"}
            </span>{" "}
            from Chrome browsing history? This affects only the entries
            currently shown by your search + date range. Cannot be undone.
          </>
        }
        confirmLabel="Delete filtered"
        tone="danger"
        onConfirm={() => {
          setHistoryClearFilteredSignal((n) => n + 1);
          setHistoryConfirmFilteredOpen(false);
        }}
        onCancel={() => setHistoryConfirmFilteredOpen(false)}
      />

      <ConfirmModal
        open={historyConfirmAllOpen}
        title="Clear ALL Chrome history"
        message={
          <>
            Permanently delete your{" "}
            <span class="font-semibold text-fg">entire</span> Chrome
            browsing history? This nukes every URL Chrome remembers, not
            just the ones filtered here. Cannot be undone.
          </>
        }
        confirmLabel="Delete everything"
        tone="danger"
        onConfirm={() => {
          setHistoryClearAllSignal((n) => n + 1);
          setHistoryConfirmAllOpen(false);
        }}
        onCancel={() => setHistoryConfirmAllOpen(false)}
      />

      <Suspense fallback={null}>
        {wizardOpen && (
          <WizardModal
            open={wizardOpen}
            onClose={() => setWizardOpen(false)}
            onComplete={() => {
              reload();
              setSnapshotsRefreshSignal((n) => n + 1);
            }}
          />
        )}
      </Suspense>
    </div>
  );
}
