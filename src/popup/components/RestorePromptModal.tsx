import { useState } from "preact/hooks";
import { Info, Browsers, ArrowsIn, ArrowsClockwise } from "@phosphor-icons/react";
import { Modal } from "./Modal";
import type { SavedSession } from "@/types";
import type { RestoreMode } from "@/lib/sessions";

interface Props {
  open: boolean;
  session: SavedSession | null;
  onClose: () => void;
  onConfirm: (mode: RestoreMode) => Promise<void> | void;
}

export function RestorePromptModal({ open, session, onClose, onConfirm }: Props) {
  const [mode, setMode] = useState<RestoreMode>("per-window");
  const [infoOpen, setInfoOpen] = useState<Record<RestoreMode, boolean>>({
    "per-window": false,
    "single-window": false,
    "reuse-if-exists": false,
  });
  const [saving, setSaving] = useState(false);

  if (!session) return null;

  const windowCount = new Set(
    session.tabs.map((t) => t.windowId ?? 0),
  ).size;

  const handleGo = async () => {
    setSaving(true);
    try {
      await onConfirm(mode);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Restore session"
      subtitle={session.sessionName}
      closeOnBackdrop={false}
      footer={
        <div class="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            class="h-8 px-3 text-[12px] font-medium rounded-md text-fg-muted hover:bg-surface hover:text-fg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleGo}
            disabled={saving}
            class="h-8 px-3 text-[12px] font-medium rounded-md bg-accent text-white hover:bg-accent-hover disabled:opacity-40 transition-colors"
          >
            {saving ? "Restoring…" : "Restore"}
          </button>
        </div>
      }
    >
      <div class="text-[11px] text-fg-subtle mb-3">
        {session.tabs.length} tabs from {windowCount} window
        {windowCount === 1 ? "" : "s"}. How should they open?
      </div>

      <div class="space-y-2">
        <RestoreOption
          value="per-window"
          selected={mode === "per-window"}
          onSelect={() => setMode("per-window")}
          icon={<Browsers size={16} weight="fill" />}
          title="One new window per original"
          summary={`Opens ${windowCount} new window${windowCount === 1 ? "" : "s"}, keeping the source layout.`}
          infoOpen={infoOpen["per-window"]}
          onToggleInfo={() =>
            setInfoOpen((s) => ({ ...s, "per-window": !s["per-window"] }))
          }
          detail={
            "Each tab remembers which Chrome window it came from at save time. Choosing this recreates that split — good for restoring workspaces where windows meant different contexts (e.g., Posao / Vikend)."
          }
        />
        <RestoreOption
          value="single-window"
          selected={mode === "single-window"}
          onSelect={() => setMode("single-window")}
          icon={<ArrowsIn size={16} weight="bold" />}
          title="All tabs in one new window"
          summary="Merges everything into a single new window."
          infoOpen={infoOpen["single-window"]}
          onToggleInfo={() =>
            setInfoOpen((s) => ({
              ...s,
              "single-window": !s["single-window"],
            }))
          }
          detail={
            "Handy if you don't care about the original layout, or the snapshot spans many windows and you want a flat list to triage."
          }
        />
        <RestoreOption
          value="reuse-if-exists"
          selected={mode === "reuse-if-exists"}
          onSelect={() => setMode("reuse-if-exists")}
          icon={<ArrowsClockwise size={16} weight="bold" />}
          title="Reuse the original window if it still exists"
          summary="Adds tabs back to matching Chrome windows; opens new ones for windows that are gone."
          infoOpen={infoOpen["reuse-if-exists"]}
          onToggleInfo={() =>
            setInfoOpen((s) => ({
              ...s,
              "reuse-if-exists": !s["reuse-if-exists"],
            }))
          }
          detail={
            "Chrome window IDs change on restart. This only matches sessions saved during the current Chrome run. If none match, this behaves like 'per-window'."
          }
        />
      </div>
    </Modal>
  );
}

function RestoreOption(props: {
  value: RestoreMode;
  selected: boolean;
  onSelect: () => void;
  icon: preact.ComponentChildren;
  title: string;
  summary: string;
  infoOpen: boolean;
  onToggleInfo: () => void;
  detail: string;
}) {
  return (
    <div
      class={`border rounded-md transition-colors ${
        props.selected
          ? "border-accent bg-accent-subtle/40"
          : "border-border bg-bg hover:border-border-strong"
      }`}
    >
      <button
        type="button"
        onClick={props.onSelect}
        class="w-full flex items-start gap-2.5 p-3 text-left"
      >
        <span
          class={`size-4 mt-0.5 rounded-full border-2 shrink-0 inline-flex items-center justify-center ${
            props.selected
              ? "border-accent bg-accent"
              : "border-border bg-bg"
          }`}
        >
          {props.selected && (
            <span class="size-1.5 rounded-full bg-white" />
          )}
        </span>
        <span
          class={`shrink-0 mt-0.5 ${props.selected ? "text-accent" : "text-fg-subtle"}`}
        >
          {props.icon}
        </span>
        <span class="flex-1 min-w-0">
          <span
            class={`text-[12px] font-semibold block ${props.selected ? "text-accent" : "text-fg"}`}
          >
            {props.title}
          </span>
          <span class="text-[11px] text-fg-muted mt-0.5 block leading-snug">
            {props.summary}
          </span>
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            props.onToggleInfo();
          }}
          aria-label="More info"
          title="More info"
          class={`size-6 shrink-0 inline-flex items-center justify-center rounded transition-colors ${
            props.infoOpen
              ? "bg-accent-subtle text-accent"
              : "text-fg-subtle hover:bg-surface hover:text-fg"
          }`}
        >
          <Info size={12} weight={props.infoOpen ? "fill" : "regular"} />
        </button>
      </button>
      {props.infoOpen && (
        <div class="px-3 pb-3 -mt-1 text-[11px] text-fg-subtle leading-relaxed">
          {props.detail}
        </div>
      )}
    </div>
  );
}
