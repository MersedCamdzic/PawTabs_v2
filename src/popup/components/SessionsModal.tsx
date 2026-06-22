import { useState, useEffect } from "preact/hooks";
import {
  FloppyDisk,
  ArrowCounterClockwise,
  Trash,
  Stack,
} from "@phosphor-icons/react";
import { Modal } from "./Modal";
import {
  listSessions,
  saveSession,
  restoreSession,
  deleteSession,
  formatRelativeTime,
} from "@/lib/sessions";
import type { SavedSession } from "@/types";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function SessionsModal({ open, onClose }: Props) {
  const [sessions, setSessions] = useState<SavedSession[]>([]);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = async () => {
    setSessions(await listSessions());
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

  const handleRestore = async (session: SavedSession) => {
    setBusyId(session.id);
    try {
      await restoreSession(session);
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (session: SavedSession) => {
    setBusyId(session.id);
    try {
      await deleteSession(session.id);
      await refresh();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Sessions">
      <div class="space-y-3">
        <div>
          <div class="text-[11px] uppercase tracking-wide text-fg-subtle mb-1.5 font-medium">
            Save current state
          </div>
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
        </div>

        <div class="border-t border-border" />

        <div>
          <div class="text-[11px] uppercase tracking-wide text-fg-subtle mb-1.5 font-medium">
            Saved ({sessions.length})
          </div>

          {sessions.length === 0 ? (
            <div class="py-8 text-center text-fg-subtle text-[12px]">
              <Stack
                size={28}
                weight="thin"
                class="mx-auto mb-2 text-fg-subtle"
              />
              No saved sessions yet
            </div>
          ) : (
            <div class="space-y-1.5 max-h-[280px] overflow-y-auto pr-0.5">
              {sessions.map((s) => (
                <SessionItem
                  key={s.id}
                  session={s}
                  busy={busyId === s.id}
                  onRestore={() => handleRestore(s)}
                  onDelete={() => handleDelete(s)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

function SessionItem(props: {
  session: SavedSession;
  busy: boolean;
  onRestore: () => void;
  onDelete: () => void;
}) {
  const windowCount = new Set(
    props.session.tabs.map((t) => t.windowId),
  ).size;

  return (
    <div class="flex items-center gap-2 px-2.5 py-2 rounded-md border border-border hover:border-border-strong transition-colors group">
      <div class="flex-1 min-w-0">
        <div class="text-[13px] font-medium text-fg truncate">
          {props.session.sessionName}
        </div>
        <div class="text-[11px] text-fg-subtle truncate mt-0.5">
          {props.session.tabs.length} tabs · {windowCount} window
          {windowCount === 1 ? "" : "s"} ·{" "}
          {formatRelativeTime(props.session.dateTime)}
        </div>
      </div>
      <div class="flex items-center gap-0.5 shrink-0">
        <button
          type="button"
          onClick={props.onRestore}
          disabled={props.busy}
          aria-label="Restore session"
          title="Restore"
          class="size-7 inline-flex items-center justify-center rounded text-fg-muted hover:bg-accent-subtle hover:text-accent disabled:opacity-40 transition-colors"
        >
          <ArrowCounterClockwise size={13} />
        </button>
        <button
          type="button"
          onClick={props.onDelete}
          disabled={props.busy}
          aria-label="Delete session"
          title="Delete"
          class="size-7 inline-flex items-center justify-center rounded text-fg-muted hover:bg-danger-subtle hover:text-danger disabled:opacity-40 transition-colors"
        >
          <Trash size={13} />
        </button>
      </div>
    </div>
  );
}
