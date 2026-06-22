import { useState, useEffect } from "preact/hooks";
import {
  FloppyDisk,
  ArrowCounterClockwise,
  Trash,
  BookmarkSimple,
  ClockCounterClockwise,
  Plus,
  X,
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
  currentStats?: {
    windowCount: number;
    tabCount: number;
    pinnedCount: number;
  };
}

type View = "sessions" | "backups";

export function SessionsModal({ open, onClose, currentStats }: Props) {
  const [view, setView] = useState<View>("sessions");
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
            {sessions.length === 0 ? (
              <EmptyState
                icon={<BookmarkSimple size={28} weight="thin" />}
                text="No saved sessions yet"
                hint="Save your current state to restore it later."
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
                    Save current state
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
                hint="Wizard creates backups automatically before cleanup."
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
