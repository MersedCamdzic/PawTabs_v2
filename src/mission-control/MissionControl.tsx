import { useState, useEffect, useMemo } from "preact/hooks";
import { Sidebar } from "./components/Sidebar";
import type { View } from "./components/Sidebar";
import { Toolbar } from "./components/Toolbar";
import { OverviewView } from "./components/views/OverviewView";
import { TabsListView } from "./components/views/TabsListView";
import { TagsView } from "./components/views/TagsView";
import { SessionsView } from "./components/views/SessionsView";
import { BackupsView } from "./components/views/BackupsView";
import { RecentlyClosedView } from "./components/views/RecentlyClosedView";
import { WindowsView } from "./components/views/WindowsView";
import { useTabSnapshot } from "./hooks";
import { computeInsights } from "@/lib/stats";
import { listBackups } from "@/lib/backups";
import { listSessions } from "@/lib/sessions";

const VIEW_META: Record<View, { title: string; subtitle: string }> = {
  overview: {
    title: "Overview",
    subtitle: "A glance at your tabs, windows, and saved data.",
  },
  tabs: { title: "All tabs", subtitle: "Every tab open across all windows." },
  windows: {
    title: "Windows",
    subtitle:
      "Visualize, rename, split, merge, and reorganize windows. Use → on any tab to move it.",
  },
  pawed: { title: "Pawed", subtitle: "Tabs you have marked as important." },
  pinned: { title: "Pinned", subtitle: "Tabs you have pinned in Chrome." },
  tags: { title: "Tags", subtitle: "Browse tabs by tag." },
  sessions: {
    title: "Sessions",
    subtitle: "Save your current state and restore it later.",
  },
  "recently-closed": {
    title: "Recently closed",
    subtitle: "Tabs you have closed recently — click to reopen.",
  },
  backups: {
    title: "Backups",
    subtitle: "Auto-generated snapshots before Wizard cleanups.",
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
      return false;
    });
  }, [snapshot, query]);

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
          />
        )}

        {view === "overview" && (
          <>
            <Toolbar
              title={meta.title}
              subtitle={meta.subtitle}
              query=""
              onQueryChange={() => undefined}
            />
            {insights ? (
              <OverviewView insights={insights} />
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
            onAction={reload}
          />
        )}

        {view === "windows" && (
          <WindowsView query={query} onAction={reload} />
        )}

        {view === "pawed" && (
          <TabsListView
            tabs={pawedTabs}
            emptyText="No pawed tabs. Paw a tab from the popup to add it here."
            onAction={reload}
          />
        )}

        {view === "pinned" && (
          <TabsListView
            tabs={pinnedTabs}
            emptyText="No pinned tabs."
            onAction={reload}
          />
        )}

        {view === "tags" && snapshot && (
          <TagsView tabs={snapshot.tabs} query={query} onAction={reload} />
        )}

        {view === "sessions" && <SessionsView query={query} />}

        {view === "backups" && <BackupsView query={query} />}

        {view === "recently-closed" && <RecentlyClosedView query={query} />}

        {view === "settings" && (
          <div class="px-8 py-8 max-w-md">
            <div class="text-[13px] text-fg-muted">
              Open the popup and click the gear icon to manage settings.
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
