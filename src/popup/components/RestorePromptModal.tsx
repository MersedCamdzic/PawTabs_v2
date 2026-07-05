import { useState, useEffect, useRef } from "preact/hooks";
import { Info, Browsers, ArrowsIn, ArrowsClockwise } from "@phosphor-icons/react";
import { Modal } from "./Modal";
import { restoreSession } from "@/lib/sessions";
import type { SavedSession } from "@/types";
import type { RestoreMode, RestoreProgress } from "@/lib/sessions";

interface Props {
  open: boolean;
  session: SavedSession | null;
  onClose: () => void;
  onDone?: () => void;
}

export function RestorePromptModal({ open, session, onClose, onDone }: Props) {
  const [mode, setMode] = useState<RestoreMode>("per-window");
  const [infoOpen, setInfoOpen] = useState<Record<RestoreMode, boolean>>({
    "per-window": false,
    "single-window": false,
    "reuse-if-exists": false,
  });
  const [progress, setProgress] = useState<RestoreProgress | null>(null);
  const [running, setRunning] = useState(false);
  const [closeExisting, setCloseExisting] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!open) {
      setProgress(null);
      setRunning(false);
      abortRef.current?.abort();
      abortRef.current = null;
    }
  }, [open]);

  if (!session) return null;

  const windowCount = new Set(
    session.tabs.map((t) => t.windowId ?? 0),
  ).size;

  const handleGo = async () => {
    const controller = new AbortController();
    abortRef.current = controller;
    setRunning(true);
    setProgress({ done: 0, total: session.tabs.length });
    try {
      await restoreSession(session, {
        mode,
        signal: controller.signal,
        onProgress: (p) => setProgress(p),
        lazyPlaceholders: true,
        batchSize: 10,
        delayMs: 120,
        closeExistingWindows: closeExisting,
      });
      onDone?.();
      onClose();
    } catch (err) {
      if ((err as Error).name !== "AbortError") console.error(err);
    } finally {
      setRunning(false);
    }
  };

  const handleCancel = () => {
    if (running) {
      abortRef.current?.abort();
      setRunning(false);
      return;
    }
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Restore session"
      subtitle={session.sessionName}
      closeOnBackdrop={false}
      footer={
        <div class="flex items-center justify-between gap-2">
          <div class="text-[11px] text-fg-subtle">
            {running && progress
              ? `${progress.done} of ${progress.total} tabs opened`
              : "Tabs open as inert placeholders (no network) — they navigate to the real URL only when you click them."}
          </div>
          <div class="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCancel}
              class="h-8 px-3 text-[12px] font-medium rounded-md text-fg-muted hover:bg-surface hover:text-fg transition-colors"
            >
              {running ? "Stop" : "Cancel"}
            </button>
            {!running && (
              <button
                type="button"
                onClick={handleGo}
                class="h-8 px-3 text-[12px] font-medium rounded-md bg-accent text-white hover:bg-accent-hover transition-colors"
              >
                Restore
              </button>
            )}
          </div>
        </div>
      }
    >
      <div class="text-[11px] text-fg-subtle mb-3">
        {session.tabs.length} tabs from {windowCount} window
        {windowCount === 1 ? "" : "s"}. How should they open?
      </div>

      {running && progress && (
        <div class="mb-3 p-3 bg-accent-subtle/40 border border-accent/30 rounded-md">
          <div class="flex items-center justify-between text-[12px] font-medium text-accent mb-2">
            <span>Restoring…</span>
            <span>
              {progress.done} / {progress.total}
            </span>
          </div>
          <div class="h-1.5 bg-bg rounded-full overflow-hidden">
            <div
              class="h-full bg-accent transition-all"
              style={{
                width: `${
                  progress.total > 0
                    ? Math.round((progress.done / progress.total) * 100)
                    : 0
                }%`,
              }}
            />
          </div>
          {progress.currentUrl && (
            <div class="text-[10px] text-fg-subtle mt-1.5 truncate font-mono">
              {progress.currentUrl}
            </div>
          )}
          <div class="text-[10px] text-fg-subtle mt-1.5">
            Tabs open as inert placeholders — no network hits until you
            click a tab.
          </div>
        </div>
      )}

      <label
        class={`flex items-start gap-2.5 p-3 mb-3 border rounded-md cursor-pointer transition-colors ${
          closeExisting
            ? "border-warning/40 bg-warning-subtle/40"
            : "border-border bg-bg hover:border-border-strong"
        }`}
      >
        <input
          type="checkbox"
          checked={closeExisting}
          onChange={(e) =>
            setCloseExisting((e.currentTarget as HTMLInputElement).checked)
          }
          class="mt-0.5 size-4 accent-warning cursor-pointer shrink-0"
        />
        <div class="flex-1 min-w-0">
          <div
            class={`text-[12px] font-semibold ${
              closeExisting ? "text-warning" : "text-fg"
            }`}
          >
            Close all current windows first
          </div>
          <div class="text-[11px] text-fg-muted mt-0.5 leading-snug">
            Wipes your current tabs, then restores the snapshot. Unchecked =
            keep your current windows and add the snapshot alongside them.
          </div>
        </div>
      </label>

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
            "Each tab remembers which Chrome window it came from at save time. Choosing this recreates that split — good for restoring workspaces where windows meant different contexts (e.g., Work / Weekend)."
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
