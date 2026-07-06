import { useState, useEffect } from "preact/hooks";
import { Database, Trash, Play, ArrowUUpLeft } from "@phosphor-icons/react";
import { seedDemoData, clearDemoData } from "@/lib/demo-seed";
import {
  isDemoModeActive,
  enterDemoMode,
  exitDemoMode,
} from "@/lib/demo-mode";
import { ConfirmModal } from "@/popup/components/ConfirmModal";

type PendingAction = null | "seed" | "clear" | "enter" | "exit";

export function DemoDataPanel({ onDone }: { onDone?: () => void }) {
  const [busy, setBusy] = useState(false);
  const [demoActive, setDemoActive] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingAction>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  useEffect(() => {
    isDemoModeActive().then(setDemoActive);
  }, []);

  const wrap = async (fn: () => Promise<void>, label: string) => {
    setBusy(true);
    setStatus(label);
    try {
      await fn();
    } finally {
      setBusy(false);
      setStatus(null);
      isDemoModeActive().then(setDemoActive);
      onDone?.();
    }
  };

  const runPending = async () => {
    const action = pending;
    setPending(null);
    setSaveStatus(null);
    if (!action) return;
    const config = {
      seed: { fn: seedDemoData, label: "Loading data…" },
      clear: { fn: clearDemoData, label: "Clearing…" },
      enter: { fn: enterDemoMode, label: "Entering demo…" },
      exit: { fn: exitDemoMode, label: "Restoring…" },
    }[action];
    await wrap(async () => {
      await config.fn();
      setSaveStatus(
        action === "seed"
          ? "Demo data loaded ✓"
          : action === "clear"
            ? "All data cleared"
            : action === "enter"
              ? "Demo mode active"
              : "Session restored",
      );
    }, config.label);
  };

  return (
    <div class="border border-border rounded-md p-4 space-y-3 bg-surface/40">
      <div>
        <div class="text-[12px] font-semibold text-fg">Demo data</div>
        <div class="text-[11px] text-fg-subtle mt-0.5">
          Realistic sample state for screenshots, testing, or new-user
          exploration. Nothing here uploads anywhere.
        </div>
      </div>

      <div class="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setPending("seed")}
          disabled={busy}
          class="h-9 px-3 inline-flex items-center justify-center gap-1.5 text-[12px] font-medium rounded-md border border-accent/40 text-accent bg-accent-subtle hover:bg-accent-subtle/70 disabled:opacity-40 transition-colors"
        >
          <Database size={13} weight="fill" />
          Load demo data
        </button>
        <button
          type="button"
          onClick={() => setPending("clear")}
          disabled={busy}
          class="h-9 px-3 inline-flex items-center justify-center gap-1.5 text-[12px] font-medium rounded-md border border-danger/30 text-danger bg-danger-subtle hover:bg-danger disabled:opacity-40 hover:text-white transition-colors"
        >
          <Trash size={13} />
          Clear all data
        </button>
      </div>
      {saveStatus && (
        <div class="text-[10px] text-success">{saveStatus}</div>
      )}

      <div class="border-t border-border pt-3">
        <div class="text-[11px] font-semibold text-fg mb-1">Demo mode</div>
        <div class="text-[10px] text-fg-subtle mb-2">
          Saves your current session, closes your windows, opens
          screenshot-ready demo windows (Work / Research / Weekend).
          One click restores everything.
        </div>
        {demoActive ? (
          <button
            type="button"
            onClick={() => setPending("exit")}
            disabled={busy}
            class="w-full h-9 px-3 inline-flex items-center justify-center gap-1.5 text-[12px] font-medium rounded-md border border-accent/40 text-accent bg-accent-subtle hover:bg-accent hover:text-white disabled:opacity-40 transition-colors"
          >
            <ArrowUUpLeft size={13} weight="bold" />
            Exit demo & restore session
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setPending("enter")}
            disabled={busy}
            class="w-full h-9 px-3 inline-flex items-center justify-center gap-1.5 text-[12px] font-medium rounded-md border border-accent/40 text-accent bg-accent-subtle hover:bg-accent hover:text-white disabled:opacity-40 transition-colors"
          >
            <Play size={13} weight="fill" />
            Enter demo mode
          </button>
        )}
      </div>

      {status && (
        <div class="text-[10px] text-accent mt-1">{status}</div>
      )}

      <ConfirmModal
        open={pending !== null}
        title={
          pending === "seed"
            ? "Load demo data?"
            : pending === "clear"
              ? "Clear all data?"
              : pending === "enter"
                ? "Enter demo mode?"
                : "Exit demo mode?"
        }
        message={
          pending === "seed" ? (
            <>
              Replaces your current pawed URLs, tags, notes, snapshots,
              backups and window colors with a realistic sample set
              (Amazon, Google, CNN, GitHub, Notion, Figma, Linear,
              Spotify, arXiv…). Open Chrome tabs stay open.
            </>
          ) : pending === "clear" ? (
            <>
              Removes <span class="font-semibold text-fg">all</span>{" "}
              PawTabs data — pawed URLs, tags, notes, snapshots,
              backups, window names/colors. This cannot be undone. Open
              Chrome tabs stay open.
            </>
          ) : pending === "enter" ? (
            <>
              Saves your current tabs as a{" "}
              <span class="font-semibold text-fg">Pre-demo backup</span>{" "}
              session, then closes your windows and opens 6 demo
              windows (Work · Research · Weekend · Learning · Finance ·
              Music) for screenshots.
            </>
          ) : (
            <>
              Closes the demo windows and restores your original tabs
              from the Pre-demo backup session.
            </>
          )
        }
        confirmLabel={
          pending === "clear"
            ? "Clear everything"
            : pending === "seed"
              ? "Load demo data"
              : pending === "enter"
                ? "Enter demo"
                : "Restore session"
        }
        tone={pending === "clear" ? "danger" : "accent"}
        onConfirm={runPending}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}
