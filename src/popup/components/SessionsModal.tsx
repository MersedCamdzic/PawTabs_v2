import { useState, useEffect, useMemo } from "preact/hooks";
import {
  FloppyDisk,
  ArrowCounterClockwise,
  Trash,
  BookmarkSimple,
  ClockCounterClockwise,
  Broom,
  Plus,
  X,
} from "@phosphor-icons/react";
import { Modal } from "./Modal";
import { RestorePromptModal } from "./RestorePromptModal";
import {
  listSessions,
  saveSession,
  deleteSession,
  formatRelativeTime,
  formatAbsoluteDateTime,
} from "@/lib/sessions";
import { listBackups, deleteBackup, restoreBackup } from "@/lib/backups";
import type { SavedSession, Backup } from "@/types";

interface Props {
  open: boolean;
  onClose: () => void;
  currentStats?: {
    windowCount: number;
    tabCount: number;
    pinnedCount: number;
  };
}

type UnifiedItem =
  | { kind: "session"; data: SavedSession; dateTime: string }
  | { kind: "backup"; data: Backup; dateTime: string };

function itemId(item: UnifiedItem): string {
  return `${item.kind}:${item.kind === "session" ? item.data.id : item.data.id}`;
}

export function SessionsModal({ open, onClose, currentStats }: Props) {
  const [sessions, setSessions] = useState<SavedSession[]>([]);
  const [backups, setBackups] = useState<Backup[]>([]);
  const [name, setName] = useState("");
  const [savingOpen, setSavingOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = async () => {
    const [s, b] = await Promise.all([listSessions(), listBackups()]);
    setSessions(s);
    setBackups(b);
  };

  useEffect(() => {
    if (open) {
      refresh();
      setSavingOpen(false);
      setName("");
    }
  }, [open]);

  const items = useMemo<UnifiedItem[]>(() => {
    const sessionItems: UnifiedItem[] = sessions.map((data) => ({
      kind: "session",
      data,
      dateTime: data.dateTime,
    }));
    const backupItems: UnifiedItem[] = backups.map((data) => ({
      kind: "backup",
      data,
      dateTime: data.createdAt,
    }));
    return [...sessionItems, ...backupItems].sort((a, b) =>
      b.dateTime.localeCompare(a.dateTime),
    );
  }, [sessions, backups]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveSession(name);
      setName("");
      setSavingOpen(false);
      await refresh();
    } finally {
      setSaving(false);
    }
  };

  const [restorePrompt, setRestorePrompt] = useState<UnifiedItem | null>(null);

  const handleRestore = async (item: UnifiedItem) => {
    if (item.kind === "session") {
      setRestorePrompt(item);
      return;
    }
    setBusyId(itemId(item));
    try {
      await restoreBackup(item.data);
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
    <Modal open={open} onClose={onClose} title="Snapshots">
      <div class="space-y-3">
        <div class="text-[10px] text-fg-subtle flex items-center gap-2.5 flex-wrap">
          <span class="inline-flex items-center gap-1">
            <BookmarkSimple size={10} weight="fill" class="text-fg-muted" />
            Manual
          </span>
          <span class="inline-flex items-center gap-1">
            <Broom size={10} weight="fill" class="text-accent" />
            Auto (Wizard)
          </span>
          <span class="inline-flex items-center gap-1">
            <ClockCounterClockwise
              size={10}
              weight="fill"
              class="text-warning"
            />
            Wizard metadata backup
          </span>
        </div>

        {items.length === 0 ? (
          <EmptyState
            icon={<BookmarkSimple size={28} weight="thin" />}
            text="No snapshots yet"
            hint="Save your current state to restore it later."
          />
        ) : (
          <ItemList>
            {items.map((item) => (
              <UnifiedRow
                key={itemId(item)}
                item={item}
                busy={busyId === itemId(item)}
                onRestore={() => handleRestore(item)}
                onDelete={() => handleDelete(item)}
              />
            ))}
          </ItemList>
        )}

        <div class="border-t border-border pt-3">
          {savingOpen ? (
            <div class="space-y-2">
              <div class="flex gap-2 items-center">
                <input
                  type="text"
                  autoFocus
                  value={name}
                  onInput={(e) =>
                    setName((e.currentTarget as HTMLInputElement).value)
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSave();
                    } else if (e.key === "Escape") {
                      setSavingOpen(false);
                      setName("");
                    }
                  }}
                  placeholder="Name this snapshot…"
                  class="flex-1 h-8 px-2.5 bg-surface border border-accent rounded-md text-[12px] placeholder:text-fg-subtle focus:outline-none focus:ring-4 focus:ring-accent/10 transition-colors"
                />
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  class="h-8 px-3 inline-flex items-center gap-1 text-[12px] font-medium rounded-md bg-accent text-white hover:bg-accent-hover disabled:opacity-40 transition-colors"
                >
                  <FloppyDisk size={12} weight="fill" />
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSavingOpen(false);
                    setName("");
                  }}
                  aria-label="Cancel"
                  class="size-8 inline-flex items-center justify-center rounded-md text-fg-muted hover:bg-surface hover:text-fg transition-colors"
                >
                  <X size={13} />
                </button>
              </div>
              {currentStats && (
                <CurrentStatePreview stats={currentStats} />
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setSavingOpen(true)}
              class="w-full px-3 py-2 flex items-center justify-between gap-2 rounded-md border border-dashed border-border hover:border-accent hover:bg-accent-subtle text-fg-muted hover:text-accent group transition-colors"
            >
              <span class="flex items-center gap-1.5 text-[12px] font-medium">
                <Plus size={12} weight="bold" />
                Snapshot current state
              </span>
              {currentStats && (
                <span class="text-[11px] text-fg-subtle group-hover:text-accent/70 truncate">
                  {currentStats.tabCount} tab
                  {currentStats.tabCount === 1 ? "" : "s"} ·{" "}
                  {currentStats.windowCount} window
                  {currentStats.windowCount === 1 ? "" : "s"}
                  {currentStats.pinnedCount > 0 && (
                    <>
                      {" · "}
                      {currentStats.pinnedCount} pinned
                    </>
                  )}
                </span>
              )}
            </button>
          )}
        </div>
      </div>
      <RestorePromptModal
        open={restorePrompt !== null}
        session={restorePrompt?.kind === "session" ? restorePrompt.data : null}
        onClose={() => setRestorePrompt(null)}
      />
    </Modal>
  );
}

function UnifiedRow(props: {
  item: UnifiedItem;
  busy: boolean;
  onRestore: () => void;
  onDelete: () => void;
}) {
  const { item } = props;

  if (item.kind === "session") {
    const s = item.data;
    const windowCount = new Set(s.tabs.map((t) => t.windowId)).size;
    const isAuto = s.auto;
    const Icon = isAuto ? Broom : BookmarkSimple;
    const iconClass = isAuto
      ? "bg-accent-subtle text-accent"
      : "bg-surface text-fg-muted";
    return (
      <div class="flex items-center gap-2 px-2.5 py-2 rounded-md border border-border hover:border-border-strong transition-colors group">
        <span
          class={`inline-flex size-6 items-center justify-center rounded shrink-0 ${iconClass}`}
        >
          <Icon size={12} weight="fill" />
        </span>
        <div class="flex-1 min-w-0">
          <div class="text-[13px] font-medium text-fg truncate flex items-center gap-1.5">
            {s.sessionName}
            {isAuto && (
              <span class="text-[9px] font-normal px-1 h-3.5 inline-flex items-center bg-accent-subtle text-accent rounded uppercase tracking-wide">
                Auto
              </span>
            )}
          </div>
          <div class="text-[11px] text-fg-subtle truncate mt-0.5">
            {s.tabs.length} tabs · {windowCount} window
            {windowCount === 1 ? "" : "s"} · {formatRelativeTime(s.dateTime)}
          </div>
          <div class="text-[10px] text-fg-subtle/70 mt-0.5 font-mono">
            {formatAbsoluteDateTime(s.dateTime)}
          </div>
        </div>
        <Actions
          busy={props.busy}
          restoreTip="Restore tabs in new windows"
          onRestore={props.onRestore}
          onDelete={props.onDelete}
        />
      </div>
    );
  }

  const b = item.data;
  return (
    <div class="flex items-center gap-2 px-2.5 py-2 rounded-md border border-border hover:border-border-strong transition-colors group">
      <span class="inline-flex size-6 items-center justify-center rounded bg-warning-subtle text-warning shrink-0">
        <ClockCounterClockwise size={12} weight="fill" />
      </span>
      <div class="flex-1 min-w-0">
        <div class="text-[13px] font-medium text-fg truncate flex items-center gap-1.5">
          {b.name}
          <span class="text-[9px] font-normal px-1 h-3.5 inline-flex items-center bg-warning-subtle text-warning rounded uppercase tracking-wide">
            Meta
          </span>
        </div>
        <div class="text-[11px] text-fg-subtle truncate mt-0.5">
          Saved data only · {formatRelativeTime(b.createdAt)}
        </div>
        <div class="text-[10px] text-fg-subtle/70 mt-0.5 font-mono">
          {formatAbsoluteDateTime(b.createdAt)}
        </div>
      </div>
      <Actions
        busy={props.busy}
        restoreTip="Restore saved data (overwrites current)"
        onRestore={props.onRestore}
        onDelete={props.onDelete}
      />
    </div>
  );
}

function Actions(props: {
  busy: boolean;
  restoreTip: string;
  onRestore: () => void;
  onDelete: () => void;
}) {
  return (
    <div class="flex items-center gap-0.5 shrink-0">
      <button
        type="button"
        onClick={props.onRestore}
        disabled={props.busy}
        aria-label="Restore"
        data-tooltip={props.restoreTip}
        data-tooltip-pos="above"
        class="size-7 inline-flex items-center justify-center rounded text-fg-muted hover:bg-accent-subtle hover:text-accent disabled:opacity-40 transition-colors"
      >
        <ArrowCounterClockwise size={13} />
      </button>
      <button
        type="button"
        onClick={props.onDelete}
        disabled={props.busy}
        aria-label="Delete"
        data-tooltip="Delete"
        data-tooltip-pos="above"
        class="size-7 inline-flex items-center justify-center rounded text-fg-muted hover:bg-danger-subtle hover:text-danger disabled:opacity-40 transition-colors"
      >
        <Trash size={13} />
      </button>
    </div>
  );
}

function CurrentStatePreview(props: {
  stats: { windowCount: number; tabCount: number; pinnedCount: number };
}) {
  return (
    <div class="text-[11px] text-fg-subtle bg-surface rounded px-2.5 py-1.5 flex items-center gap-2 flex-wrap">
      <span class="font-medium text-fg-muted">Will save:</span>
      <span>
        {props.stats.tabCount} tab{props.stats.tabCount === 1 ? "" : "s"}
      </span>
      <span class="text-border-strong">·</span>
      <span>
        {props.stats.windowCount} window
        {props.stats.windowCount === 1 ? "" : "s"}
      </span>
      {props.stats.pinnedCount > 0 && (
        <>
          <span class="text-border-strong">·</span>
          <span>{props.stats.pinnedCount} pinned</span>
        </>
      )}
    </div>
  );
}

function ItemList(props: { children: preact.ComponentChildren }) {
  return (
    <div class="space-y-1.5 max-h-[260px] overflow-y-auto pr-0.5">
      {props.children}
    </div>
  );
}

function EmptyState(props: {
  icon: preact.ComponentChildren;
  text: string;
  hint: string;
}) {
  return (
    <div class="py-8 text-center">
      <div class="text-fg-subtle mx-auto mb-2">{props.icon}</div>
      <div class="text-[13px] font-medium text-fg">{props.text}</div>
      <div class="text-[11px] text-fg-subtle mt-0.5">{props.hint}</div>
    </div>
  );
}
