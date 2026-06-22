import { useState, useEffect, useMemo } from "preact/hooks";
import {
  ArrowCounterClockwise,
  Trash,
  BookmarkSimple,
  Browsers,
  Broom,
  ClockCounterClockwise,
  CaretDown,
} from "@phosphor-icons/react";
import {
  listSessions,
  restoreSession,
  deleteSession,
  formatRelativeTime,
  formatAbsoluteDateTime,
} from "@/lib/sessions";
import { listBackups, deleteBackup, restoreBackup } from "@/lib/backups";
import { getRootDomain } from "@/lib/utils";
import type { SavedSession, Backup } from "@/types";
import type { SnapshotSortKey } from "../SnapshotSortDropdown";

interface Props {
  query: string;
  sortBy: SnapshotSortKey;
  columns: 1 | 2 | 3 | 4;
  refreshSignal: number;
}

const COLUMN_GRID: Record<1 | 2 | 3 | 4, string> = {
  1: "grid-cols-1",
  2: "grid-cols-1 md:grid-cols-2",
  3: "grid-cols-1 md:grid-cols-2 xl:grid-cols-3",
  4: "grid-cols-1 md:grid-cols-2 xl:grid-cols-4",
};

type UnifiedItem =
  | { kind: "session"; data: SavedSession; dateTime: string }
  | { kind: "backup"; data: Backup; dateTime: string };

export function SessionsView({
  query,
  sortBy,
  columns,
  refreshSignal,
}: Props) {
  const [sessions, setSessions] = useState<SavedSession[]>([]);
  const [backups, setBackups] = useState<Backup[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const refresh = async () => {
    const [s, b] = await Promise.all([listSessions(), listBackups()]);
    setSessions(s);
    setBackups(b);
  };

  useEffect(() => {
    refresh();
  }, [refreshSignal]);

  const filtered = useMemo<UnifiedItem[]>(() => {
    const q = query.trim().toLowerCase();

    const sessionItems: UnifiedItem[] = sessions
      .filter((s) =>
        !q
          ? true
          : s.sessionName.toLowerCase().includes(q) ||
            s.tabs.some(
              (t) =>
                t.title.toLowerCase().includes(q) ||
                t.url.toLowerCase().includes(q),
            ),
      )
      .map((data) => ({ kind: "session", data, dateTime: data.dateTime }));

    const backupItems: UnifiedItem[] = backups
      .filter((b) => (!q ? true : b.name.toLowerCase().includes(q)))
      .map((data) => ({ kind: "backup", data, dateTime: data.createdAt }));

    const all = [...sessionItems, ...backupItems];

    all.sort((a, b) => {
      switch (sortBy) {
        case "date-asc":
          return a.dateTime.localeCompare(b.dateTime);
        case "name": {
          const aName =
            a.kind === "session" ? a.data.sessionName : a.data.name;
          const bName =
            b.kind === "session" ? b.data.sessionName : b.data.name;
          return aName.localeCompare(bName);
        }
        case "size-desc": {
          const aSize = a.kind === "session" ? a.data.tabs.length : a.data.tabCount;
          const bSize = b.kind === "session" ? b.data.tabs.length : b.data.tabCount;
          return bSize - aSize;
        }
        case "date-desc":
        default:
          return b.dateTime.localeCompare(a.dateTime);
      }
    });
    return all;
  }, [sessions, backups, query, sortBy]);

  const handleRestore = async (item: UnifiedItem) => {
    setBusyId(itemId(item));
    try {
      if (item.kind === "session") await restoreSession(item.data);
      else await restoreBackup(item.data);
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (item: UnifiedItem) => {
    setBusyId(itemId(item));
    try {
      if (item.kind === "session") await deleteSession(item.data.id);
      else await deleteBackup(item.data.id);
      await refresh();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div class="px-6 py-4">
      <div class="text-[11px] text-fg-subtle mb-3 flex items-center gap-3 flex-wrap">
        <span class="inline-flex items-center gap-1.5">
          <BookmarkSimple size={11} weight="fill" class="text-fg-muted" />
          Manual snapshot (tabs)
        </span>
        <span class="text-border-strong">·</span>
        <span class="inline-flex items-center gap-1.5">
          <Broom size={11} weight="fill" class="text-accent" />
          Auto (Wizard pre-cleanup)
        </span>
        <span class="text-border-strong">·</span>
        <span class="inline-flex items-center gap-1.5">
          <ClockCounterClockwise
            size={11}
            weight="fill"
            class="text-warning"
          />
          Wizard metadata backup
        </span>
      </div>

      {filtered.length === 0 ? (
        <div class="py-16 text-center">
          <BookmarkSimple
            size={32}
            weight="thin"
            class="mx-auto mb-3 text-fg-subtle"
          />
          <div class="text-[14px] font-medium">
            {sessions.length === 0 && backups.length === 0
              ? "No snapshots yet"
              : `No snapshots match "${query}"`}
          </div>
          {sessions.length === 0 && backups.length === 0 && (
            <div class="text-[12px] text-fg-subtle mt-1">
              Save the current state to restore it later.
            </div>
          )}
        </div>
      ) : (
        <div class={`grid ${COLUMN_GRID[columns]} gap-2`}>
          {filtered.map((item) => (
            <UnifiedCard
              key={itemId(item)}
              item={item}
              busy={busyId === itemId(item)}
              expanded={expandedId === itemId(item)}
              onToggle={() =>
                setExpandedId(expandedId === itemId(item) ? null : itemId(item))
              }
              onRestore={() => handleRestore(item)}
              onDelete={() => handleDelete(item)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function itemId(item: UnifiedItem): string {
  return `${item.kind}:${item.kind === "session" ? item.data.id : item.data.id}`;
}

function UnifiedCard(props: {
  item: UnifiedItem;
  busy: boolean;
  expanded: boolean;
  onToggle: () => void;
  onRestore: () => void;
  onDelete: () => void;
}) {
  if (props.item.kind === "session") {
    const s = props.item.data;
    const windowCount = new Set(s.tabs.map((t) => t.windowId)).size;
    const isAuto = s.auto;
    const iconNode = isAuto ? (
      <span
        data-tooltip="Auto snapshot — created before a Wizard cleanup"
        data-tooltip-pos="right"
        class="inline-flex size-7 items-center justify-center rounded bg-accent-subtle text-accent shrink-0"
      >
        <Broom size={14} weight="fill" />
      </span>
    ) : (
      <span
        data-tooltip="Manual snapshot — you saved this one"
        data-tooltip-pos="right"
        class="inline-flex size-7 items-center justify-center rounded bg-surface text-fg-muted shrink-0"
      >
        <BookmarkSimple size={14} weight="fill" />
      </span>
    );
    const badge = isAuto ? (
      <Badge tone="accent">Auto</Badge>
    ) : (
      <Badge tone="muted">Manual</Badge>
    );
    return (
      <UnifiedCardShell
        icon={iconNode}
        title={s.sessionName}
        badge={badge}
        subtitle={
          <span class="inline-flex items-center gap-1.5">
            <Browsers size={10} />
            {s.tabs.length} tabs · {windowCount} window
            {windowCount === 1 ? "" : "s"} · {formatRelativeTime(s.dateTime)}
          </span>
        }
        absoluteDate={formatAbsoluteDateTime(s.dateTime)}
        description={s.description}
        busy={props.busy}
        restoreLabel="Restore tabs in new windows"
        onRestore={props.onRestore}
        onDelete={props.onDelete}
        expandable={s.tabs.length > 0}
        expanded={props.expanded}
        onToggleExpand={props.onToggle}
        expandedContent={
          <div class="border-t border-border bg-surface/30 max-h-72 overflow-y-auto rounded-b-md">
            <div class="px-2 py-2 space-y-0.5">
              {s.tabs.map((t, i) => {
                const domain = getRootDomain(t.url);
                return (
                  <div
                    key={`${t.id}-${i}`}
                    class="group/row flex items-center gap-2 px-2 py-1 rounded hover:bg-bg-elevated text-[12px]"
                  >
                    {t.favIconUrl ? (
                      <img
                        src={t.favIconUrl}
                        alt=""
                        class="size-3.5 shrink-0 rounded-sm"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display =
                            "none";
                        }}
                      />
                    ) : (
                      <span class="size-3.5 shrink-0 rounded-sm bg-border" />
                    )}
                    <span class="truncate flex-1 text-fg">
                      {t.title || domain || t.url}
                    </span>
                    <span class="text-[10px] font-mono text-fg-subtle/70 shrink-0 truncate max-w-[120px]">
                      {domain}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        }
      />
    );
  }

  const b = props.item.data;
  return (
    <UnifiedCardShell
      icon={
        <span
          data-tooltip="Wizard backup — saved data (snapshots, groups, tags, notes)"
          data-tooltip-pos="right"
          class="inline-flex size-7 items-center justify-center rounded bg-warning-subtle text-warning shrink-0"
        >
          <ClockCounterClockwise size={14} weight="fill" />
        </span>
      }
      title={b.name}
      badge={<Badge tone="warning">Backup</Badge>}
      subtitle={
        <span>
          Saved data only · {formatRelativeTime(b.createdAt)}
        </span>
      }
      absoluteDate={formatAbsoluteDateTime(b.createdAt)}
      busy={props.busy}
      restoreLabel="Restore saved data (overwrites current)"
      onRestore={props.onRestore}
      onDelete={props.onDelete}
    />
  );
}

function Badge({
  tone,
  children,
}: {
  tone: "accent" | "warning" | "muted";
  children: preact.ComponentChildren;
}) {
  const cls = {
    accent: "bg-accent-subtle text-accent",
    warning: "bg-warning-subtle text-warning",
    muted: "bg-surface text-fg-muted",
  }[tone];
  return (
    <span
      class={`text-[10px] font-normal px-1.5 h-4 inline-flex items-center rounded uppercase tracking-wide ${cls}`}
    >
      {children}
    </span>
  );
}

function UnifiedCardShell(props: {
  icon: preact.ComponentChildren;
  title: string;
  badge: preact.ComponentChildren;
  subtitle: preact.ComponentChildren;
  absoluteDate: string;
  description?: string;
  busy: boolean;
  restoreLabel: string;
  onRestore: () => void;
  onDelete: () => void;
  expandable?: boolean;
  expanded?: boolean;
  onToggleExpand?: () => void;
  expandedContent?: preact.ComponentChildren;
}) {
  return (
    <div class="border border-border rounded-md hover:border-border-strong transition-colors">
      <div class="flex items-center gap-3 px-3 py-2.5">
        {props.icon}
        <div class="flex-1 min-w-0">
          <div class="text-[13px] font-medium truncate flex items-center gap-1.5">
            {props.title}
            {props.badge}
          </div>
          <div class="text-[11px] text-fg-subtle truncate mt-0.5">
            {props.subtitle}
          </div>
          <div class="text-[10px] text-fg-subtle/70 mt-0.5 font-mono">
            {props.absoluteDate}
          </div>
          {props.description && (
            <div class="text-[11px] text-fg-muted mt-1 italic whitespace-pre-wrap break-words">
              {props.description}
            </div>
          )}
        </div>
        <div class="flex items-center gap-0.5 shrink-0">
          {props.expandable && props.onToggleExpand && (
            <button
              type="button"
              onClick={props.onToggleExpand}
              aria-label={props.expanded ? "Collapse" : "Expand"}
              data-tooltip={props.expanded ? "Hide tabs" : "Show tabs"}
              data-tooltip-pos="below"
              class="size-8 inline-flex items-center justify-center rounded text-fg-muted hover:bg-surface hover:text-fg transition-colors"
            >
              <CaretDown
                size={12}
                weight="bold"
                class={`transition-transform ${props.expanded ? "rotate-180" : ""}`}
              />
            </button>
          )}
          <button
            type="button"
            onClick={props.onRestore}
            disabled={props.busy}
            aria-label="Restore"
            data-tooltip={props.restoreLabel}
            data-tooltip-pos="above"
            class="size-8 inline-flex items-center justify-center rounded text-fg-muted hover:bg-accent-subtle hover:text-accent disabled:opacity-40 transition-colors"
          >
            <ArrowCounterClockwise size={14} />
          </button>
          <button
            type="button"
            onClick={props.onDelete}
            disabled={props.busy}
            aria-label="Delete"
            data-tooltip="Delete"
            data-tooltip-pos="above"
            class="size-8 inline-flex items-center justify-center rounded text-fg-muted hover:bg-danger-subtle hover:text-danger disabled:opacity-40 transition-colors"
          >
            <Trash size={14} />
          </button>
        </div>
      </div>
      {props.expanded && props.expandedContent}
    </div>
  );
}

