import { useState, useRef, useEffect } from "preact/hooks";
import {
  PawPrint,
  PushPin,
  Tag,
  ArrowsLeftRight,
  Plus,
  Browser,
  CaretDown,
  NotePencil,
} from "@phosphor-icons/react";
import {
  setStarredMany,
  setPinnedMany,
  addTagToMany,
  addNoteToMany,
  moveManyToWindow,
  moveManyToNewWindow,
  listWindowsForMove,
} from "@/lib/tabs";

interface Props {
  selectedIds: number[];
  onClear: () => void;
  onAction: () => void;
}

type Mode = "default" | "tag" | "note" | "move";

export function SelectionBar({ selectedIds, onClear, onAction }: Props) {
  const [mode, setMode] = useState<Mode>("default");
  const [tagInput, setTagInput] = useState("");
  const [noteInput, setNoteInput] = useState("");
  const [windows, setWindows] = useState<
    { id: number; tabCount: number; firstTabTitle: string }[]
  >([]);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mode === "move") {
      const first = selectedIds[0];
      if (first !== undefined) listWindowsForMove(first).then(setWindows);
    }
  }, [mode, selectedIds]);

  useEffect(() => {
    if (mode === "default") return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setMode("default");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [mode]);

  const wrap = (fn: () => Promise<void>) => async () => {
    setBusy(true);
    try {
      await fn();
      onAction();
      onClear();
    } finally {
      setBusy(false);
    }
  };

  const handlePaw = wrap(() => setStarredMany(selectedIds, true));
  const handlePin = wrap(() => setPinnedMany(selectedIds, true));

  const handleAddTag = async () => {
    if (!tagInput.trim()) return;
    setBusy(true);
    try {
      await addTagToMany(selectedIds, tagInput);
      setTagInput("");
      setMode("default");
      onAction();
      onClear();
    } finally {
      setBusy(false);
    }
  };

  const handleAddNote = async () => {
    if (!noteInput.trim()) return;
    setBusy(true);
    try {
      await addNoteToMany(selectedIds, noteInput);
      setNoteInput("");
      setMode("default");
      onAction();
      onClear();
    } finally {
      setBusy(false);
    }
  };

  const handleMoveTo = (windowId: number) =>
    wrap(() => moveManyToWindow(selectedIds, windowId))();

  const handleMoveNew = wrap(() => moveManyToNewWindow(selectedIds));

  return (
    <div
      ref={ref}
      class="sticky bottom-2 z-20 mx-2 mb-2 px-3 py-2 bg-bg-elevated border border-border rounded-lg shadow-md flex flex-col gap-2"
    >
      <div class="flex items-center gap-2">
        <span class="text-[12px] font-semibold text-fg">
          {selectedIds.length} selected
        </span>
        <span class="text-[10px] text-fg-subtle">·</span>

        <div class="flex items-center gap-0.5 ml-auto">
          <ActionBtn title="Paw all" onClick={handlePaw} disabled={busy} tone="accent">
            <PawPrint size={13} />
          </ActionBtn>
          <ActionBtn title="Pin all" onClick={handlePin} disabled={busy} tone="warning">
            <PushPin size={13} />
          </ActionBtn>
          <ActionBtn
            title="Tag all"
            onClick={() => setMode(mode === "tag" ? "default" : "tag")}
            disabled={busy}
            tone="accent"
            active={mode === "tag"}
          >
            <Tag size={13} />
          </ActionBtn>
          <ActionBtn
            title="Add note to all"
            onClick={() => setMode(mode === "note" ? "default" : "note")}
            disabled={busy}
            tone="accent"
            active={mode === "note"}
          >
            <NotePencil size={13} />
          </ActionBtn>
          <ActionBtn
            title="Move all to another window"
            onClick={() => setMode(mode === "move" ? "default" : "move")}
            disabled={busy}
            tone="accent"
            active={mode === "move"}
          >
            <ArrowsLeftRight size={13} />
          </ActionBtn>
          <span class="w-px h-4 mx-1 bg-border" />
          <button
            type="button"
            onClick={onClear}
            disabled={busy}
            title="Clear selection (Esc)"
            aria-label="Close selection"
            class="h-7 px-2.5 text-[11px] font-medium rounded text-fg-muted hover:bg-surface hover:text-fg disabled:opacity-40 transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {mode === "tag" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAddTag();
          }}
          class="flex gap-1.5"
        >
          <input
            type="text"
            autoFocus
            value={tagInput}
            onInput={(e) =>
              setTagInput((e.currentTarget as HTMLInputElement).value)
            }
            placeholder={`Add tag to ${selectedIds.length} tabs…`}
            class="flex-1 h-7 px-2.5 bg-surface border border-accent rounded text-[12px] placeholder:text-fg-subtle focus:outline-none focus:ring-4 focus:ring-accent/10"
          />
          <button
            type="submit"
            disabled={!tagInput.trim() || busy}
            class="h-7 px-2.5 text-[11px] font-medium rounded bg-accent text-white hover:bg-accent-hover disabled:opacity-40 transition-colors inline-flex items-center gap-1"
          >
            <Plus size={11} weight="bold" />
            Add
          </button>
        </form>
      )}

      {mode === "note" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAddNote();
          }}
          class="flex gap-1.5"
        >
          <textarea
            autoFocus
            value={noteInput}
            onInput={(e) =>
              setNoteInput((e.currentTarget as HTMLTextAreaElement).value)
            }
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleAddNote();
              }
            }}
            placeholder={`Note for ${selectedIds.length} tabs…`}
            rows={2}
            class="flex-1 px-2.5 py-1.5 bg-surface border border-accent rounded text-[12px] placeholder:text-fg-subtle focus:outline-none focus:ring-4 focus:ring-accent/10 resize-none"
          />
          <button
            type="submit"
            disabled={!noteInput.trim() || busy}
            class="h-7 px-2.5 text-[11px] font-medium rounded bg-accent text-white hover:bg-accent-hover disabled:opacity-40 transition-colors inline-flex items-center gap-1 shrink-0 self-start"
          >
            <Plus size={11} weight="bold" />
            Add
          </button>
        </form>
      )}

      {mode === "move" && (
        <div class="flex flex-col gap-1 max-h-[140px] overflow-y-auto">
          {windows.map((w) => (
            <button
              key={w.id}
              type="button"
              onClick={() => handleMoveTo(w.id)}
              disabled={busy}
              class="flex items-center gap-2 px-2 py-1.5 rounded text-[11px] text-left border border-border hover:border-border-strong hover:bg-surface transition-colors disabled:opacity-40"
            >
              <Browser size={11} class="text-fg-muted" />
              <span class="flex-1 truncate">
                Window {w.id}{" "}
                <span class="text-fg-subtle">
                  · {w.tabCount} tab{w.tabCount === 1 ? "" : "s"}
                </span>
              </span>
              <CaretDown
                size={9}
                weight="bold"
                class="-rotate-90 text-fg-subtle"
              />
            </button>
          ))}
          <button
            type="button"
            onClick={handleMoveNew}
            disabled={busy}
            class="flex items-center gap-2 px-2 py-1.5 rounded text-[11px] border border-dashed border-border hover:border-accent hover:bg-accent-subtle text-fg-muted hover:text-accent transition-colors disabled:opacity-40"
          >
            <Plus size={11} weight="bold" />
            <span class="flex-1 text-left">Move to new window</span>
          </button>
        </div>
      )}
    </div>
  );
}

const TONE_CLASSES = {
  accent: "hover:bg-accent-subtle hover:text-accent",
  warning: "hover:bg-warning-subtle hover:text-warning",
  danger: "hover:bg-danger-subtle hover:text-danger",
  muted: "hover:bg-surface hover:text-fg",
} as const;

function ActionBtn(props: {
  title: string;
  onClick: () => void;
  disabled: boolean;
  tone: keyof typeof TONE_CLASSES;
  active?: boolean;
  children: preact.ComponentChildren;
}) {
  const activeBg = props.active ? "bg-accent-subtle text-accent" : "text-fg-muted";
  return (
    <button
      type="button"
      onClick={props.onClick}
      disabled={props.disabled}
      title={props.title}
      aria-label={props.title}
      class={`size-7 inline-flex items-center justify-center rounded ${activeBg} ${TONE_CLASSES[props.tone]} disabled:opacity-40 transition-colors`}
    >
      {props.children}
    </button>
  );
}
