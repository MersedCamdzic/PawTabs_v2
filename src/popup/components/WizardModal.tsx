import { useState, useEffect } from "preact/hooks";
import { Sparkle, CheckCircle, FloppyDisk } from "@phosphor-icons/react";
import { Modal } from "./Modal";
import { Toggle } from "./Toggle";
import { runWizard, WIZARD_DEFAULTS } from "@/lib/wizard";
import type { WizardOptions, WizardResult } from "@/lib/wizard";
import { getPreferences } from "@/lib/preferences";

interface Props {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export function WizardModal({ open, onClose, onComplete }: Props) {
  const [opts, setOpts] = useState<WizardOptions>(WIZARD_DEFAULTS);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<WizardResult | null>(null);

  useEffect(() => {
    if (!open) return;
    getPreferences().then((p) => {
      setOpts((prev) => ({
        ...prev,
        splitThreshold: p.wizardThresholds.splitThreshold,
        splitInto: p.wizardThresholds.splitInto,
        regroupThreshold: p.wizardThresholds.regroupThreshold,
      }));
    });
  }, [open]);

  const reset = () => {
    setOpts(WIZARD_DEFAULTS);
    setResult(null);
    setRunning(false);
  };

  const handleClose = () => {
    if (running) return;
    reset();
    onClose();
  };

  const run = async () => {
    setRunning(true);
    try {
      const r = await runWizard(opts);
      setResult(r);
      onComplete();
    } catch (err) {
      console.error("Wizard failed", err);
    } finally {
      setRunning(false);
    }
  };

  const anySelected =
    opts.closeInactive ||
    opts.removeDuplicates ||
    opts.splitLarge ||
    opts.regroupSmall;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Cleanup Wizard"
      footer={
        result ? (
          <div class="flex justify-end">
            <button
              type="button"
              onClick={handleClose}
              class="h-8 px-3 text-[12px] font-medium rounded-md bg-fg text-bg hover:bg-fg-muted transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          <div class="flex items-center justify-between gap-2">
            <div class="text-[11px] text-fg-subtle flex items-center gap-1.5">
              <FloppyDisk size={12} />
              Auto-backup before cleanup
            </div>
            <button
              type="button"
              onClick={run}
              disabled={!anySelected || running}
              class="h-8 px-3 inline-flex items-center gap-1.5 text-[12px] font-medium rounded-md bg-accent text-white hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Sparkle size={12} weight="fill" />
              {running ? "Running…" : "Run cleanup"}
            </button>
          </div>
        )
      }
    >
      {result ? (
        <ResultPanel result={result} />
      ) : (
        <div class="space-y-1 -mt-1">
          <Toggle
            label="Close inactive tabs"
            description="Remove tabs Chrome has discarded from memory."
            checked={opts.closeInactive}
            onChange={(v) => setOpts({ ...opts, closeInactive: v })}
          />
          <div class="border-t border-border" />
          <Toggle
            label="Remove duplicate tabs"
            description="Keep first occurrence of each URL across all windows."
            checked={opts.removeDuplicates}
            onChange={(v) => setOpts({ ...opts, removeDuplicates: v })}
          />
          <div class="border-t border-border" />
          <Toggle
            label="Split large windows"
            description={`Windows with more than ${opts.splitThreshold} tabs → split into windows of ${opts.splitInto}.`}
            checked={opts.splitLarge}
            onChange={(v) => setOpts({ ...opts, splitLarge: v })}
          />
          <div class="border-t border-border" />
          <Toggle
            label="Regroup small windows"
            description={`Merge windows with fewer than ${opts.regroupThreshold} tabs into one.`}
            checked={opts.regroupSmall}
            onChange={(v) => setOpts({ ...opts, regroupSmall: v })}
          />
        </div>
      )}
    </Modal>
  );
}

function ResultPanel({ result }: { result: WizardResult }) {
  const lines: string[] = [];
  if (result.closedInactive > 0)
    lines.push(`Closed ${result.closedInactive} inactive tab${plural(result.closedInactive)}`);
  if (result.removedDuplicates > 0)
    lines.push(`Removed ${result.removedDuplicates} duplicate${plural(result.removedDuplicates)}`);
  if (result.windowsSplit > 0)
    lines.push(`Split ${result.windowsSplit} large window${plural(result.windowsSplit)}`);
  if (result.windowsRegrouped > 0)
    lines.push(`Merged ${result.windowsRegrouped} window${plural(result.windowsRegrouped)}`);
  if (lines.length === 0) lines.push("Nothing to clean up.");

  return (
    <div class="text-center py-2">
      <div class="inline-flex size-10 items-center justify-center rounded-full bg-success-subtle text-success mb-3">
        <CheckCircle size={22} weight="fill" />
      </div>
      <div class="text-[14px] font-medium mb-1">Cleanup complete</div>
      <div class="space-y-1 text-[12px] text-fg-muted">
        {lines.map((line) => (
          <div key={line}>{line}</div>
        ))}
      </div>
      <div class="mt-3 text-[10px] text-fg-subtle font-mono">
        Backup saved: {result.backupId}
      </div>
    </div>
  );
}

function plural(n: number): string {
  return n === 1 ? "" : "s";
}
