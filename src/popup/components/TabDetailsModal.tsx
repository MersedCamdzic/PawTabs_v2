import { useState, useEffect } from "preact/hooks";
import {
  X,
  Plus,
  Tag,
  NotePencil,
  Trash,
  Browser,
  ArrowSquareOut,
} from "@phosphor-icons/react";
import { Modal } from "./Modal";
import {
  addTag,
  removeTag,
  addNote,
  removeNote,
  moveTabToWindow,
  moveTabToNewWindow,
  listWindowsForMove,
} from "@/lib/tabs";
import { getRootDomain } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/sessions";
import type { PawTab } from "@/types";

interface Props {
  tab: PawTab | null;
  open: boolean;
  onClose: () => void;
  onAction: () => void;
}

interface WindowItem {
  id: number;
  tabCount: number;
  firstTabTitle: string;
}

export function TabDetailsModal({ tab, open, onClose, onAction }: Props) {
  const [tagInput, setTagInput] = useState("");
  const [noteInput, setNoteInput] = useState("");
  const [windows, setWindows] = useState<WindowItem[]>([]);

  useEffect(() => {
    if (!open || !tab) return;
    setTagInput("");
    setNoteInput("");
    listWindowsForMove(tab.id).then(setWindows);
  }, [open, tab]);

  if (!tab) return null;

  const handleAddTag = async (e?: Event) => {
    e?.preventDefault();
    if (!tagInput.trim()) return;
    await addTag(tab.id, tagInput);
    setTagInput("");
    onAction();
  };

  const handleRemoveTag = async (t: string) => {
    await removeTag(tab.id, t);
    onAction();
  };

  const handleAddNote = async (e?: Event) => {
    e?.preventDefault();
    if (!noteInput.trim()) return;
    await addNote(tab.id, noteInput);
    setNoteInput("");
    onAction();
  };

  const handleRemoveNote = async (id: string) => {
    await removeNote(tab.id, id);
    onAction();
  };

  const handleMove = async (windowId: number) => {
    await moveTabToWindow(tab.id, windowId);
    onAction();
    onClose();
  };

  const handleMoveNew = async () => {
    await moveTabToNewWindow(tab.id);
    onAction();
    onClose();
  };

  const domain = getRootDomain(tab.url);

  return (
    <Modal open={open} onClose={onClose} title="Tab details">
      <div class="space-y-4">
        <div class="flex items-center gap-2.5 px-2.5 py-2 bg-surface rounded-md border border-border">
          <Favicon url={tab.favIconUrl} />
          <div class="flex-1 min-w-0">
            <div class="text-[13px] font-medium truncate">
              {tab.title || domain || "Untitled"}
            </div>
            <div class="text-[11px] text-fg-subtle truncate mt-0.5">
              {domain}
            </div>
          </div>
        </div>

        <Section icon={<Tag size={11} />} title="Tags">
          {tab.tags.length === 0 && (
            <div class="text-[11px] text-fg-subtle italic mb-1.5">
              No tags yet
            </div>
          )}
          {tab.tags.length > 0 && (
            <div class="flex flex-wrap gap-1 mb-2">
              {tab.tags.map((t) => (
                <TagChip
                  key={t}
                  label={t}
                  onRemove={() => handleRemoveTag(t)}
                />
              ))}
            </div>
          )}
          <form onSubmit={handleAddTag} class="flex gap-1.5">
            <input
              type="text"
              value={tagInput}
              onInput={(e) =>
                setTagInput((e.currentTarget as HTMLInputElement).value)
              }
              placeholder="Add tag…"
              class="flex-1 h-8 px-2.5 bg-surface border border-border rounded-md text-[12px] placeholder:text-fg-subtle focus:outline-none focus:bg-bg-elevated focus:border-accent focus:ring-4 focus:ring-accent/10 transition-colors"
            />
            <button
              type="submit"
              disabled={!tagInput.trim()}
              class="h-8 px-2 inline-flex items-center justify-center rounded-md text-fg-muted hover:bg-accent-subtle hover:text-accent disabled:opacity-40 transition-colors"
              aria-label="Add tag"
            >
              <Plus size={13} weight="bold" />
            </button>
          </form>
        </Section>

        <Section icon={<NotePencil size={11} />} title="Notes">
          {tab.notes.length === 0 && (
            <div class="text-[11px] text-fg-subtle italic mb-1.5">
              No notes yet
            </div>
          )}
          {tab.notes.length > 0 && (
            <div class="space-y-1.5 mb-2 max-h-[140px] overflow-y-auto pr-0.5">
              {tab.notes.map((n) => (
                <div
                  key={n.id}
                  class="group flex items-start gap-2 p-2 bg-surface rounded-md border border-border"
                >
                  <div class="flex-1 min-w-0">
                    <div class="text-[12px] text-fg whitespace-pre-wrap break-words">
                      {n.text}
                    </div>
                    <div class="text-[10px] text-fg-subtle mt-1">
                      {formatRelativeTime(new Date(n.createdAt).toISOString())}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveNote(n.id)}
                    aria-label="Delete note"
                    class="size-6 inline-flex items-center justify-center rounded text-fg-subtle opacity-0 group-hover:opacity-100 hover:bg-danger-subtle hover:text-danger transition-all shrink-0"
                  >
                    <Trash size={11} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <form onSubmit={handleAddNote} class="flex gap-1.5">
            <textarea
              value={noteInput}
              onInput={(e) =>
                setNoteInput((e.currentTarget as HTMLTextAreaElement).value)
              }
              placeholder="Add a note…"
              rows={2}
              class="flex-1 px-2.5 py-1.5 bg-surface border border-border rounded-md text-[12px] placeholder:text-fg-subtle focus:outline-none focus:bg-bg-elevated focus:border-accent focus:ring-4 focus:ring-accent/10 transition-colors resize-none"
            />
            <button
              type="submit"
              disabled={!noteInput.trim()}
              class="h-8 px-2 inline-flex items-center justify-center rounded-md text-fg-muted hover:bg-accent-subtle hover:text-accent disabled:opacity-40 transition-colors self-start"
              aria-label="Add note"
            >
              <Plus size={13} weight="bold" />
            </button>
          </form>
        </Section>

        <Section icon={<Browser size={11} />} title="Move to window">
          <div class="space-y-1">
            {windows
              .filter((w) => w.id !== tab.windowId)
              .map((w) => (
                <WindowOption
                  key={w.id}
                  windowId={w.id}
                  tabCount={w.tabCount}
                  preview={w.firstTabTitle}
                  onClick={() => handleMove(w.id)}
                />
              ))}
            <button
              type="button"
              onClick={handleMoveNew}
              class="w-full flex items-center gap-2 px-2.5 py-2 rounded-md border border-dashed border-border hover:border-accent hover:bg-accent-subtle text-fg-muted hover:text-accent text-[12px] transition-colors"
            >
              <ArrowSquareOut size={13} />
              Move to new window
            </button>
            {windows.filter((w) => w.id !== tab.windowId).length === 0 && (
              <div class="text-[11px] text-fg-subtle italic">
                No other windows open
              </div>
            )}
          </div>
        </Section>
      </div>
    </Modal>
  );
}

function Section(props: {
  icon: preact.ComponentChildren;
  title: string;
  children: preact.ComponentChildren;
}) {
  return (
    <div>
      <div class="text-[11px] uppercase tracking-wide text-fg-subtle mb-2 font-medium flex items-center gap-1.5">
        {props.icon}
        {props.title}
      </div>
      {props.children}
    </div>
  );
}

function TagChip(props: { label: string; onRemove: () => void }) {
  return (
    <span class="inline-flex items-center gap-1 h-6 pl-2 pr-1 bg-accent-subtle text-accent-fg rounded text-[11px] font-medium">
      {props.label}
      <button
        type="button"
        onClick={props.onRemove}
        aria-label={`Remove tag ${props.label}`}
        class="inline-flex items-center justify-center size-4 rounded hover:bg-accent/20 transition-colors"
      >
        <X size={9} weight="bold" />
      </button>
    </span>
  );
}

function Favicon({ url }: { url: string }) {
  if (!url) return <div class="size-4 shrink-0 rounded-sm bg-border" />;
  return (
    <img
      src={url}
      alt=""
      class="size-4 shrink-0 rounded-sm"
      onError={(e) => {
        (e.currentTarget as HTMLImageElement).style.display = "none";
      }}
    />
  );
}

function WindowOption(props: {
  windowId: number;
  tabCount: number;
  preview: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      class="w-full flex items-center gap-2 px-2.5 py-2 rounded-md border border-border hover:border-border-strong hover:bg-surface text-left transition-colors"
    >
      <Browser size={13} class="text-fg-muted shrink-0" />
      <div class="flex-1 min-w-0">
        <div class="text-[12px] font-medium text-fg">
          Window {props.windowId}
        </div>
        <div class="text-[10px] text-fg-subtle truncate mt-0.5">
          {props.tabCount} tab{props.tabCount === 1 ? "" : "s"} ·{" "}
          {props.preview}
        </div>
      </div>
    </button>
  );
}
