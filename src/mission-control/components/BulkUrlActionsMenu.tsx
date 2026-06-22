import { useState, useEffect, useRef } from "preact/hooks";
import {
  Lightning,
  Tag,
  PawPrint,
  ArrowSquareOut,
  Plus,
  CaretDown,
  X,
} from "@phosphor-icons/react";
import {
  openManyUrls,
  addTagToManyUrls,
  unpawManyUrls,
  removeTagFromManyUrls,
  setStarredManyByUrl,
} from "@/lib/tabs";

export interface BulkUrlItem {
  url: string;
  title: string;
  favIconUrl: string;
}

interface Props {
  items: BulkUrlItem[];
  label?: string;
  mode: "pawed" | "tags";
  activeTag?: string | null;
  onAction: () => void;
}

type Panel = null | "tag";

export function BulkUrlActionsMenu({
  items,
  label,
  mode,
  activeTag,
  onAction,
}: Props) {
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<Panel>(null);
  const [tagInput, setTagInput] = useState("");
  const [busy, setBusy] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const count = items.length;

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const w = wrapperRef.current;
      if (w && !w.contains(e.target as Node)) {
        setOpen(false);
        setPanel(null);
      }
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (panel) setPanel(null);
        else setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", esc);
    };
  }, [open, panel]);

  const runAndClose = async (action: () => Promise<void>) => {
    if (busy || count === 0) return;
    setBusy(true);
    try {
      await action();
      onAction();
      setOpen(false);
      setPanel(null);
      setTagInput("");
    } finally {
      setBusy(false);
    }
  };

  const handleOpenAll = () =>
    runAndClose(() => openManyUrls(items.map((i) => i.url)));

  const handleOpenInNewWindow = () =>
    runAndClose(() =>
      openManyUrls(
        items.map((i) => i.url),
        { newWindow: true },
      ),
    );

  const handlePawAll = () =>
    runAndClose(() => setStarredManyByUrl(items, true));

  const handleUnpawAll = () => {
    if (
      !confirm(
        `Remove paw from ${count} URL${count === 1 ? "" : "s"}? They'll stay in any open tabs.`,
      )
    )
      return;
    runAndClose(() => unpawManyUrls(items.map((i) => i.url)));
  };

  const handleAddTag = () => {
    if (!tagInput.trim()) return;
    runAndClose(() => addTagToManyUrls(items, tagInput));
  };

  const handleRemoveActiveTag = () => {
    if (!activeTag) return;
    if (
      !confirm(
        `Remove tag "${activeTag}" from ${count} URL${count === 1 ? "" : "s"}?`,
      )
    )
      return;
    runAndClose(() =>
      removeTagFromManyUrls(
        items.map((i) => i.url),
        activeTag,
      ),
    );
  };

  const buttonLabel = label ?? "Bulk";
  const disabled = count === 0;

  return (
    <div class="relative" ref={wrapperRef}>
      <button
        type="button"
        onClick={() => {
          if (disabled) return;
          setOpen((o) => !o);
          setPanel(null);
        }}
        disabled={disabled}
        data-tooltip={
          disabled
            ? "Nothing to act on"
            : `Bulk actions on ${count} URL${count === 1 ? "" : "s"}`
        }
        data-tooltip-pos="below"
        class={`h-9 px-3 inline-flex items-center gap-1.5 text-[12px] font-medium rounded-md border transition-colors ${
          disabled
            ? "border-border text-fg-subtle bg-surface cursor-not-allowed opacity-60"
            : open
              ? "border-accent text-accent bg-accent-subtle"
              : "border-border text-fg-muted hover:border-accent hover:text-accent bg-bg"
        }`}
      >
        <Lightning size={12} weight="fill" />
        {buttonLabel}
        <span
          class={`text-[10px] font-mono px-1.5 h-4 inline-flex items-center rounded ${
            disabled
              ? "bg-bg text-fg-subtle"
              : open
                ? "bg-accent/15 text-accent"
                : "bg-surface text-fg-muted"
          }`}
        >
          {count}
        </span>
        <CaretDown
          size={10}
          weight="bold"
          class={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div class="absolute right-0 top-full mt-1 w-[300px] bg-bg-elevated border border-border rounded-lg shadow-xl z-30 overflow-hidden">
          {panel === null && (
            <>
              <div class="px-3 py-2 border-b border-border bg-surface/50">
                <div class="text-[11px] text-fg-subtle">Acts on</div>
                <div class="text-[12px] font-semibold text-fg">
                  {count} URL{count === 1 ? "" : "s"}
                </div>
              </div>
              <div class="p-1">
                <Group title="Open">
                  <Item
                    icon={<ArrowSquareOut size={12} />}
                    label="Open all in tabs"
                    onClick={handleOpenAll}
                    tone="accent"
                  />
                  <Item
                    icon={<Plus size={12} weight="bold" />}
                    label="Open all in NEW window"
                    onClick={handleOpenInNewWindow}
                    tone="accent"
                  />
                </Group>
                <Group title="Organize">
                  <Item
                    icon={<Tag size={12} weight="fill" />}
                    label="Add tag…"
                    onClick={() => setPanel("tag")}
                    tone="accent"
                  />
                  {mode === "tags" && activeTag && (
                    <Item
                      icon={<Tag size={12} />}
                      label={`Remove tag "${activeTag}"`}
                      onClick={handleRemoveActiveTag}
                      tone="danger"
                    />
                  )}
                  {mode === "tags" && (
                    <Item
                      icon={<PawPrint size={12} weight="fill" />}
                      label="Paw all"
                      onClick={handlePawAll}
                      tone="accent"
                    />
                  )}
                  {mode === "pawed" && (
                    <Item
                      icon={<PawPrint size={12} />}
                      label="Unpaw all"
                      onClick={handleUnpawAll}
                      tone="danger"
                    />
                  )}
                </Group>
              </div>
            </>
          )}

          {panel === "tag" && (
            <div>
              <div class="flex items-center gap-1 px-3 py-2 border-b border-border bg-surface/50">
                <button
                  type="button"
                  onClick={() => setPanel(null)}
                  aria-label="Back"
                  class="size-6 inline-flex items-center justify-center rounded text-fg-muted hover:bg-bg-elevated hover:text-fg transition-colors"
                >
                  <X size={11} />
                </button>
                <span class="text-[12px] font-semibold text-fg">
                  Add tag to all
                </span>
              </div>
              <div class="p-3">
                <input
                  type="text"
                  autoFocus
                  value={tagInput}
                  onInput={(e) =>
                    setTagInput((e.currentTarget as HTMLInputElement).value)
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  placeholder={`Tag for ${count} URL${count === 1 ? "" : "s"}…`}
                  class="w-full h-9 px-3 bg-surface border border-border rounded-md text-[12px] placeholder:text-fg-subtle focus:outline-none focus:bg-bg-elevated focus:border-accent focus:ring-4 focus:ring-accent/10 transition-colors"
                />
                <div class="mt-2 flex justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPanel(null)}
                    class="h-8 px-3 text-[11px] text-fg-muted hover:text-fg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAddTag}
                    disabled={!tagInput.trim() || busy}
                    class="h-8 px-3 text-[11px] font-medium rounded-md bg-accent text-white hover:bg-accent-hover disabled:opacity-40 transition-colors"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Group(props: {
  title: string;
  children: preact.ComponentChildren;
}) {
  return (
    <div class="mb-1 last:mb-0">
      <div class="px-2 pt-1 pb-0.5 text-[9px] uppercase tracking-wider text-fg-subtle font-semibold">
        {props.title}
      </div>
      {props.children}
    </div>
  );
}

const TONE_BG = {
  accent: "hover:bg-accent-subtle hover:text-accent",
  warning: "hover:bg-warning-subtle hover:text-warning",
  danger: "hover:bg-danger-subtle hover:text-danger",
} as const;

function Item(props: {
  icon: preact.ComponentChildren;
  label: string;
  onClick: () => void;
  tone?: keyof typeof TONE_BG;
}) {
  const tone = props.tone
    ? TONE_BG[props.tone]
    : "hover:bg-surface hover:text-fg";
  return (
    <button
      type="button"
      onClick={props.onClick}
      class={`w-full flex items-center gap-2 px-2 h-8 rounded text-[12px] text-fg-muted transition-colors ${tone}`}
    >
      <span class="text-fg-subtle">{props.icon}</span>
      <span class="truncate">{props.label}</span>
    </button>
  );
}
