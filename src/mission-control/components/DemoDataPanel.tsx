import { useState, useEffect } from "preact/hooks";
import { Database, Trash, Play, ArrowUUpLeft } from "@phosphor-icons/react";
import { seedDemoData, clearDemoData } from "@/lib/demo-seed";
import {
  isDemoModeActive,
  enterDemoMode,
  exitDemoMode,
} from "@/lib/demo-mode";

export function DemoDataPanel({ onDone }: { onDone?: () => void }) {
  const [busy, setBusy] = useState(false);
  const [demoActive, setDemoActive] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

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

  const handleSeed = () =>
    wrap(async () => {
      if (
        !confirm(
          "Load demo data? This REPLACES pawed URLs, tags, snapshots, backups and window names with a realistic sample. Existing open tabs stay open.",
        )
      )
        return;
      await seedDemoData();
    }, "Loading data…");

  const handleClear = () =>
    wrap(async () => {
      if (
        !confirm(
          "Clear ALL stored data (paw, tags, notes, snapshots, backups, window names)? Cannot be undone. Open tabs stay open.",
        )
      )
        return;
      await clearDemoData();
    }, "Clearing…");

  const handleEnterDemo = () =>
    wrap(async () => {
      if (
        !confirm(
          "Enter demo mode? A backup session of your current tabs will be saved, then your windows will close and demo windows (Work / Research / Weekend) will open for screenshots.",
        )
      )
        return;
      await enterDemoMode();
    }, "Entering demo…");

  const handleExitDemo = () =>
    wrap(async () => {
      if (
        !confirm(
          "Exit demo mode? Demo windows will close and your original tabs will restore from the backup session.",
        )
      )
        return;
      await exitDemoMode();
    }, "Restoring…");

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
          onClick={handleSeed}
          disabled={busy}
          class="h-9 px-3 inline-flex items-center justify-center gap-1.5 text-[12px] font-medium rounded-md border border-accent/40 text-accent bg-accent-subtle hover:bg-accent-subtle/70 disabled:opacity-40 transition-colors"
        >
          <Database size={13} weight="fill" />
          Load demo data
        </button>
        <button
          type="button"
          onClick={handleClear}
          disabled={busy}
          class="h-9 px-3 inline-flex items-center justify-center gap-1.5 text-[12px] font-medium rounded-md border border-danger/30 text-danger bg-danger-subtle hover:bg-danger disabled:opacity-40 hover:text-white transition-colors"
        >
          <Trash size={13} />
          Clear all data
        </button>
      </div>

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
            onClick={handleExitDemo}
            disabled={busy}
            class="w-full h-9 px-3 inline-flex items-center justify-center gap-1.5 text-[12px] font-medium rounded-md border border-accent/40 text-accent bg-accent-subtle hover:bg-accent hover:text-white disabled:opacity-40 transition-colors"
          >
            <ArrowUUpLeft size={13} weight="bold" />
            Exit demo & restore session
          </button>
        ) : (
          <button
            type="button"
            onClick={handleEnterDemo}
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
    </div>
  );
}
