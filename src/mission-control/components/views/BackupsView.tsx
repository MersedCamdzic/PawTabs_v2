import { useState, useEffect, useMemo } from "preact/hooks";
import {
  ArrowCounterClockwise,
  Trash,
  ClockCounterClockwise,
} from "@phosphor-icons/react";
import { listBackups, restoreBackup, deleteBackup } from "@/lib/backups";
import { formatRelativeTime } from "@/lib/sessions";
import type { Backup } from "@/types";

import type { SnapshotSortKey } from "../SnapshotSortDropdown";

interface Props {
  query: string;
  sortBy: SnapshotSortKey;
  columns: 1 | 2 | 3 | 4;
}

const COLUMN_GRID: Record<1 | 2 | 3 | 4, string> = {
  1: "grid-cols-1",
  2: "grid-cols-1 md:grid-cols-2",
  3: "grid-cols-1 md:grid-cols-2 xl:grid-cols-3",
  4: "grid-cols-1 md:grid-cols-2 xl:grid-cols-4",
};

export function BackupsView({ query, sortBy, columns }: Props) {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = async () => setBackups(await listBackups());

  useEffect(() => {
    refresh();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? backups.filter((b) => b.name.toLowerCase().includes(q))
      : backups;
    const sorted = [...list].sort((a, b) => {
      switch (sortBy) {
        case "date-asc":
          return a.createdAt.localeCompare(b.createdAt);
        case "name":
          return a.name.localeCompare(b.name);
        case "size-desc":
          return b.tabCount - a.tabCount;
        case "date-desc":
        default:
          return b.createdAt.localeCompare(a.createdAt);
      }
    });
    return sorted;
  }, [backups, query, sortBy]);

  const handleRestore = async (b: Backup) => {
    setBusyId(b.id);
    try {
      await restoreBackup(b);
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (b: Backup) => {
    setBusyId(b.id);
    try {
      await deleteBackup(b.id);
      await refresh();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div class="px-6 py-4">
      <div class="text-[12px] text-fg-muted bg-accent-subtle/30 border border-accent/20 rounded-md px-3 py-2.5 mb-4 space-y-1">
        <div class="font-medium text-fg flex items-center gap-1.5">
          What's a Wizard backup?
        </div>
        <div>
          Every time you run the Cleanup Wizard (broom icon), PawTabs first
          makes a snapshot of your saved data — snapshots, groups, tags,
          notes, pinned/pawed state. You can restore it here if you want to
          undo. Open tabs are NOT touched by restore.
        </div>
      </div>

      {filtered.length === 0 ? (
        <div class="py-16 text-center">
          <ClockCounterClockwise
            size={32}
            weight="thin"
            class="mx-auto mb-3 text-fg-subtle"
          />
          <div class="text-[14px] font-medium">
            {backups.length === 0
              ? "No backups yet"
              : `No backups match "${query}"`}
          </div>
        </div>
      ) : (
        <div class={`grid ${COLUMN_GRID[columns]} gap-2`}>
          {filtered.map((b) => (
            <div
              key={b.id}
              class="border border-border rounded-md px-3 py-2.5 hover:border-border-strong transition-colors flex items-center gap-3"
            >
              <ClockCounterClockwise size={14} class="text-fg-muted shrink-0" />
              <div class="flex-1 min-w-0">
                <div class="text-[13px] font-medium truncate">{b.name}</div>
                <div class="text-[11px] text-fg-subtle truncate mt-0.5">
                  {b.tabCount} tabs · {b.windowCount} window
                  {b.windowCount === 1 ? "" : "s"} ·{" "}
                  {formatRelativeTime(b.createdAt)}
                </div>
              </div>
              <div class="flex items-center gap-0.5 shrink-0">
                <button
                  type="button"
                  onClick={() => handleRestore(b)}
                  disabled={busyId === b.id}
                  aria-label="Restore"
                  title="Restore"
                  class="size-8 inline-flex items-center justify-center rounded text-fg-muted hover:bg-accent-subtle hover:text-accent disabled:opacity-40 transition-colors"
                >
                  <ArrowCounterClockwise size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(b)}
                  disabled={busyId === b.id}
                  aria-label="Delete"
                  title="Delete"
                  class="size-8 inline-flex items-center justify-center rounded text-fg-muted hover:bg-danger-subtle hover:text-danger disabled:opacity-40 transition-colors"
                >
                  <Trash size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
