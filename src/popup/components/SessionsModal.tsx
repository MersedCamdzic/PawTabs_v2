import { useState, useEffect } from "preact/hooks";
import {
  FloppyDisk,
  ArrowCounterClockwise,
  Trash,
  Stack,
  ClockCounterClockwise,
} from "@phosphor-icons/react";
import { Modal } from "./Modal";
import {
  listSessions,
  saveSession,
  restoreSession,
  deleteSession,
  formatRelativeTime,
} from "@/lib/sessions";
import { listBackups, deleteBackup, restoreBackup } from "@/lib/backups";
import type { SavedSession, Backup } from "@/types";

interface Props {
  open: boolean;
  onClose: () => void;
}

type View = "sessions" | "backups";

export function SessionsModal({ open, onClose }: Props) {
  const [view, setView] = useState<View>("sessions");
  const [sessions, setSessions] = useState<SavedSession[]>([]);
  const [backups, setBackups] = useState<Backup[]>([]);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = async () => {
    const [s, b] = await Promise.all([listSessions(), listBackups()]);
    setSessions(s);
    setBackups(b);
  };

  useEffect(() => {
    if (open) refresh();
  }, [open]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveSession(name);
      setName("");
      await refresh();
    } finally {
      setSaving(false);
    }
  };

  const handleRestoreSession = async (s: SavedSession) => {
    setBusyId(s.id);
    try {
      await restoreSession(s);
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteSession = async (s: SavedSession) => {
    setBusyId(s.id);
    try {
      await deleteSession(s.id);
      await refresh();
    } finally {
      setBusyId(null);
    }
  };

  const handleRestoreBackup = async (b: Backup) => {
    setBusyId(b.id);
    try {
      await restoreBackup(b);
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteBackup = async (b: Backup) => {
    setBusyId(b.id);
    try {
      await deleteBackup(b.id);
      await refresh();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Saved snapshots">
      <div class="space-y-3">
        <div class="grid grid-cols-2 gap-1 p-1 bg-surface rounded-md">
          <TabButton
            active={view === "sessions"}
            onClick={() => setView("sessions")}
          >
            Sessions ({sessions.length})
          </TabButton>
          <TabButton
            active={view === "backups"}
            onClick={() => setView("backups")}
          >
            Backups ({backups.length})
          </TabButton>
        </div>

        {view === "sessions" && (
          <>
            <div class="flex gap-2">
              <input
                type="text"
                value={name}
                onInput={(e) =>
                  setName((e.currentTarget as HTMLInputElement).value)
                }
                placeholder="Session name (optional)"
                class="flex-1 h-8 px-2.5 bg-surface border border-border rounded-md text-[12px] placeholder:text-fg-subtle focus:outline-none focus:bg-bg-elevated focus:border-accent focus:ring-4 focus:ring-accent/10 transition-colors"
              />
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                class="h-8 px-3 inline-flex items-center gap-1.5 text-[12px] font-medium rounded-md bg-accent text-white hover:bg-accent-hover disabled:opacity-40 transition-colors"
              >
                <FloppyDisk size={12} weight="fill" />
                Save
              </button>
            </div>

            {sessions.length === 0 ? (
              <EmptyState
                icon={<Stack size={28} weight="thin" />}
                text="No saved sessions yet"
                hint="Save current state to restore it later"
              />
            ) : (
              <ItemList>
                {sessions.map((s) => {
                  const windowCount = new Set(
                    s.tabs.map((t) => t.windowId),
                  ).size;
                  return (
                    <ItemRow
                      key={s.id}
                      title={s.sessionName}
                      subtitle={`${s.tabs.length} tabs · ${windowCount} window${windowCount === 1 ? "" : "s"} · ${formatRelativeTime(s.dateTime)}`}
                      busy={busyId === s.id}
                      onRestore={() => handleRestoreSession(s)}
                      onDelete={() => handleDeleteSession(s)}
                    />
                  );
                })}
              </ItemList>
            )}
          </>
        )}

        {view === "backups" && (
          <>
            <div class="text-[11px] text-fg-subtle bg-surface rounded-md px-2.5 py-2 border border-border">
              Auto-created before Wizard cleanup. Restoring overwrites your
              saved data (sessions, groups, page metadata).
            </div>

            {backups.length === 0 ? (
              <EmptyState
                icon={<ClockCounterClockwise size={28} weight="thin" />}
                text="No backups yet"
                hint="Wizard creates backups automatically before cleanup"
              />
            ) : (
              <ItemList>
                {backups.map((b) => (
                  <ItemRow
                    key={b.id}
                    title={b.name}
                    subtitle={`${b.tabCount} tabs · ${b.windowCount} window${b.windowCount === 1 ? "" : "s"} · ${formatRelativeTime(b.createdAt)}`}
                    busy={busyId === b.id}
                    onRestore={() => handleRestoreBackup(b)}
                    onDelete={() => handleDeleteBackup(b)}
                  />
                ))}
              </ItemList>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}

function TabButton(props: {
  active: boolean;
  onClick: () => void;
  children: preact.ComponentChildren;
}) {
  const cls = props.active
    ? "bg-bg-elevated text-fg shadow-xs"
    : "text-fg-muted hover:text-fg";
  return (
    <button
      type="button"
      onClick={props.onClick}
      class={`h-7 px-3 rounded text-[12px] font-medium ${cls} transition-colors`}
    >
      {props.children}
    </button>
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

function ItemRow(props: {
  title: string;
  subtitle: string;
  busy: boolean;
  onRestore: () => void;
  onDelete: () => void;
}) {
  return (
    <div class="flex items-center gap-2 px-2.5 py-2 rounded-md border border-border hover:border-border-strong transition-colors group">
      <div class="flex-1 min-w-0">
        <div class="text-[13px] font-medium text-fg truncate">
          {props.title}
        </div>
        <div class="text-[11px] text-fg-subtle truncate mt-0.5">
          {props.subtitle}
        </div>
      </div>
      <div class="flex items-center gap-0.5 shrink-0">
        <button
          type="button"
          onClick={props.onRestore}
          disabled={props.busy}
          aria-label="Restore"
          title="Restore"
          class="size-7 inline-flex items-center justify-center rounded text-fg-muted hover:bg-accent-subtle hover:text-accent disabled:opacity-40 transition-colors"
        >
          <ArrowCounterClockwise size={13} />
        </button>
        <button
          type="button"
          onClick={props.onDelete}
          disabled={props.busy}
          aria-label="Delete"
          title="Delete"
          class="size-7 inline-flex items-center justify-center rounded text-fg-muted hover:bg-danger-subtle hover:text-danger disabled:opacity-40 transition-colors"
        >
          <Trash size={13} />
        </button>
      </div>
    </div>
  );
}
