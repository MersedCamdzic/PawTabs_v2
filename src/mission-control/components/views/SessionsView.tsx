import { useState, useEffect, useMemo } from "preact/hooks";
import {
  FloppyDisk,
  ArrowCounterClockwise,
  Trash,
  Stack,
  Browsers,
} from "@phosphor-icons/react";
import {
  listSessions,
  saveSession,
  restoreSession,
  deleteSession,
  formatRelativeTime,
} from "@/lib/sessions";
import { getRootDomain } from "@/lib/utils";
import type { SavedSession } from "@/types";

interface Props {
  query: string;
}

export function SessionsView({ query }: Props) {
  const [sessions, setSessions] = useState<SavedSession[]>([]);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const refresh = async () => setSessions(await listSessions());

  useEffect(() => {
    refresh();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter(
      (s) =>
        s.sessionName.toLowerCase().includes(q) ||
        s.tabs.some(
          (t) =>
            t.title.toLowerCase().includes(q) ||
            t.url.toLowerCase().includes(q),
        ),
    );
  }, [sessions, query]);

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

  const handleRestore = async (s: SavedSession) => {
    setBusyId(s.id);
    try {
      await restoreSession(s);
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (s: SavedSession) => {
    setBusyId(s.id);
    try {
      await deleteSession(s.id);
      await refresh();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div class="px-6 py-4 max-w-4xl">
      <div class="flex gap-2 mb-4 max-w-md">
        <input
          type="text"
          value={name}
          onInput={(e) =>
            setName((e.currentTarget as HTMLInputElement).value)
          }
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
          }}
          placeholder="Session name (optional)"
          class="flex-1 h-9 px-3 bg-surface border border-border rounded-md text-[13px] placeholder:text-fg-subtle focus:outline-none focus:bg-bg-elevated focus:border-accent focus:ring-4 focus:ring-accent/10 transition-colors"
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          class="h-9 px-3.5 inline-flex items-center gap-1.5 text-[13px] font-medium rounded-md bg-accent text-white hover:bg-accent-hover disabled:opacity-40 transition-colors"
        >
          <FloppyDisk size={13} weight="fill" />
          Save session
        </button>
      </div>

      {filtered.length === 0 ? (
        <div class="py-16 text-center">
          <Stack
            size={32}
            weight="thin"
            class="mx-auto mb-3 text-fg-subtle"
          />
          <div class="text-[14px] font-medium">
            {sessions.length === 0
              ? "No saved sessions yet"
              : `No sessions match "${query}"`}
          </div>
          {sessions.length === 0 && (
            <div class="text-[12px] text-fg-subtle mt-1">
              Save the current state to restore it later.
            </div>
          )}
        </div>
      ) : (
        <div class="space-y-2">
          {filtered.map((s) => (
            <SessionCard
              key={s.id}
              session={s}
              busy={busyId === s.id}
              expanded={expandedId === s.id}
              onToggle={() =>
                setExpandedId(expandedId === s.id ? null : s.id)
              }
              onRestore={() => handleRestore(s)}
              onDelete={() => handleDelete(s)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SessionCard(props: {
  session: SavedSession;
  busy: boolean;
  expanded: boolean;
  onToggle: () => void;
  onRestore: () => void;
  onDelete: () => void;
}) {
  const windowCount = new Set(props.session.tabs.map((t) => t.windowId)).size;

  return (
    <div class="border border-border rounded-md overflow-hidden hover:border-border-strong transition-colors">
      <div
        onClick={props.onToggle}
        class="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-surface transition-colors"
      >
        <Browsers size={14} class="text-fg-muted shrink-0" />
        <div class="flex-1 min-w-0">
          <div class="text-[13px] font-medium truncate">
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
            onClick={(e) => {
              e.stopPropagation();
              props.onRestore();
            }}
            disabled={props.busy}
            aria-label="Restore"
            title="Restore"
            class="size-8 inline-flex items-center justify-center rounded text-fg-muted hover:bg-accent-subtle hover:text-accent disabled:opacity-40 transition-colors"
          >
            <ArrowCounterClockwise size={14} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              props.onDelete();
            }}
            disabled={props.busy}
            aria-label="Delete"
            title="Delete"
            class="size-8 inline-flex items-center justify-center rounded text-fg-muted hover:bg-danger-subtle hover:text-danger disabled:opacity-40 transition-colors"
          >
            <Trash size={14} />
          </button>
        </div>
      </div>

      {props.expanded && (
        <div class="border-t border-border bg-surface/30 px-3 py-2 space-y-1 max-h-72 overflow-y-auto">
          {props.session.tabs.map((t, i) => (
            <div
              key={`${t.id}-${i}`}
              class="flex items-center gap-2 px-2 py-1 text-[12px]"
            >
              <span class="text-fg-subtle font-mono text-[10px] w-8 shrink-0">
                {getRootDomain(t.url).slice(0, 8) || "—"}
              </span>
              <span class="truncate flex-1 text-fg-muted">
                {t.title || t.url}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
