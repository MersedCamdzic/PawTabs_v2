import { useState, useEffect } from "preact/hooks";
import { Sun, Moon, Monitor, Info } from "@phosphor-icons/react";
import { Modal } from "./Modal";
import { ConfirmModal } from "./ConfirmModal";
import {
  getPreferences,
  setPreference,
  DEFAULT_PREFERENCES,
} from "@/lib/preferences";
import { applyTheme } from "@/lib/theme";
import { saveSession, listSessions } from "@/lib/sessions";
import type { Theme, WizardThresholds, AutoSessionConfig } from "@/types";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function SettingsModal({ open, onClose }: Props) {
  const [theme, setTheme] = useState<Theme>(DEFAULT_PREFERENCES.theme);
  const [thresholds, setThresholds] = useState<WizardThresholds>(
    DEFAULT_PREFERENCES.wizardThresholds,
  );
  const [autoSession, setAutoSession] = useState<AutoSessionConfig>(
    DEFAULT_PREFERENCES.autoSession,
  );
  const [confirmFirstSnapshotOpen, setConfirmFirstSnapshotOpen] =
    useState(false);
  const [autoSaveInfoOpen, setAutoSaveInfoOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    getPreferences().then((p) => {
      setTheme(p.theme);
      setThresholds(p.wizardThresholds);
      setAutoSession(p.autoSession);
    });
  }, [open]);

  const updateAutoSession = async (patch: Partial<AutoSessionConfig>) => {
    const next = { ...autoSession, ...patch };
    setAutoSession(next);
    await setPreference("autoSession", next);
  };

  const latestAutoSessionTime = async (): Promise<number> => {
    const sessions = await listSessions();
    const autos = sessions.filter((s) => s.auto);
    if (autos.length === 0) return 0;
    return new Date(autos[0]!.dateTime).getTime();
  };

  const updateTheme = async (next: Theme) => {
    setTheme(next);
    applyTheme(next);
    await setPreference("theme", next);
  };

  const updateThreshold = async (
    key: keyof WizardThresholds,
    value: number,
  ) => {
    const safe = Math.max(1, Math.min(999, Math.round(value)));
    const next = { ...thresholds, [key]: safe };
    setThresholds(next);
    await setPreference("wizardThresholds", next);
  };

  return (
    <Modal open={open} onClose={onClose} title="Settings">
      <div class="space-y-5">
        <Section title="Appearance">
          <div class="grid grid-cols-3 gap-2">
            <ThemeOption
              icon={<Sun size={14} />}
              label="Light"
              active={theme === "light"}
              onClick={() => updateTheme("light")}
            />
            <ThemeOption
              icon={<Moon size={14} />}
              label="Dark"
              active={theme === "dark"}
              onClick={() => updateTheme("dark")}
            />
            <ThemeOption
              icon={<Monitor size={14} />}
              label="System"
              active={theme === "system"}
              onClick={() => updateTheme("system")}
            />
          </div>
        </Section>

        <Section
          title="Auto-save sessions"
          action={
            <button
              type="button"
              onClick={() => setAutoSaveInfoOpen((v) => !v)}
              aria-label="How does auto-save work?"
              title="How does auto-save work?"
              class={`size-5 inline-flex items-center justify-center rounded-full transition-colors ${
                autoSaveInfoOpen
                  ? "bg-accent-subtle text-accent"
                  : "text-fg-subtle hover:bg-surface hover:text-fg"
              }`}
            >
              <Info size={12} weight={autoSaveInfoOpen ? "fill" : "regular"} />
            </button>
          }
        >
          {autoSaveInfoOpen && (
            <div class="text-[11px] text-fg-subtle mb-3 leading-relaxed bg-surface/40 border border-border rounded-md px-3 py-2">
              PawTabs quietly takes snapshots of your open tabs on the
              schedule you set. If a laptop crashes or you close the wrong
              window, you can restore an earlier snapshot from the
              Snapshots view.
              <br />
              <br />
              When you hit the max, the oldest auto-snapshot is deleted to
              make room. Manual snapshots are never touched.
            </div>
          )}
          <label class="flex items-center justify-between py-1.5 cursor-pointer">
            <span class="text-[12px] text-fg">Enable auto snapshots</span>
            <input
              type="checkbox"
              checked={autoSession.enabled}
              onChange={async (e) => {
                const checked = (e.currentTarget as HTMLInputElement).checked;
                if (checked && !autoSession.enabled) {
                  const existing = await latestAutoSessionTime();
                  await updateAutoSession({
                    enabled: true,
                    ...(existing > 0 ? { lastRunAt: existing } : {}),
                  });
                  setConfirmFirstSnapshotOpen(true);
                  return;
                }
                await updateAutoSession({ enabled: checked });
              }}
              class="size-4 accent-accent cursor-pointer"
            />
          </label>
          <div class="flex items-center justify-between gap-3 py-1.5">
            <label class="text-[12px] text-fg flex-1">Run every</label>
            <div class="flex items-center gap-1.5">
              <input
                type="number"
                min={1}
                max={999}
                value={autoSession.intervalValue}
                onInput={(e) =>
                  updateAutoSession({
                    intervalValue: Math.max(
                      1,
                      parseInt(
                        (e.currentTarget as HTMLInputElement).value,
                        10,
                      ) || 1,
                    ),
                  })
                }
                class="w-14 h-7 px-1 text-center bg-surface border border-border rounded text-[12px] focus:outline-none focus:bg-bg-elevated focus:border-accent"
              />
              <select
                value={
                  autoSession.intervalUnit === "seconds"
                    ? "minutes"
                    : autoSession.intervalUnit
                }
                onChange={(e) =>
                  updateAutoSession({
                    intervalUnit: (e.currentTarget as HTMLSelectElement)
                      .value as typeof autoSession.intervalUnit,
                  })
                }
                class="h-7 px-1.5 bg-surface border border-border rounded text-[12px] focus:outline-none focus:bg-bg-elevated focus:border-accent"
              >
                <option value="minutes">minutes</option>
                <option value="hours">hours</option>
                <option value="days">days</option>
              </select>
            </div>
          </div>
          <NumberRow
            label="Keep at most"
            suffix="snapshots"
            value={autoSession.maxCount}
            onChange={(v) => updateAutoSession({ maxCount: v })}
          />
          {autoSession.enabled && (
            <div class="mt-3 flex items-center gap-2 flex-wrap">
              <span
                class={`inline-flex items-center gap-1.5 h-6 px-2 rounded-full text-[11px] font-medium ${
                  autoSession.lastRunAt > 0
                    ? "bg-success-subtle text-success"
                    : "bg-surface text-fg-subtle"
                }`}
                title={
                  autoSession.lastRunAt > 0
                    ? new Date(autoSession.lastRunAt).toLocaleString()
                    : "No auto snapshot yet"
                }
              >
                <span
                  class={`size-1.5 rounded-full ${
                    autoSession.lastRunAt > 0
                      ? "bg-success animate-pulse-soft"
                      : "bg-fg-subtle"
                  }`}
                />
                Last saved:{" "}
                {autoSession.lastRunAt > 0
                  ? formatRelative(autoSession.lastRunAt)
                  : "never"}
              </span>
            </div>
          )}
        </Section>

        <Section title="Wizard defaults">
          <div class="space-y-2">
            <NumberRow
              label="Split windows with more than"
              suffix="tabs"
              value={thresholds.splitThreshold}
              onChange={(v) => updateThreshold("splitThreshold", v)}
            />
            <NumberRow
              label="Split into windows with up to"
              suffix="tabs"
              value={thresholds.splitInto}
              onChange={(v) => updateThreshold("splitInto", v)}
            />
            <NumberRow
              label="Regroup windows with fewer than"
              suffix="tabs"
              value={thresholds.regroupThreshold}
              onChange={(v) => updateThreshold("regroupThreshold", v)}
            />
          </div>
        </Section>

      </div>

      <ConfirmModal
        open={confirmFirstSnapshotOpen}
        title="Take a snapshot now?"
        message={
          <>
            Auto-save is on. Would you like to save a snapshot of your
            current tabs{" "}
            <span class="font-semibold text-fg">right now</span> so you have
            a baseline to restore from later?
          </>
        }
        confirmLabel="Save snapshot"
        cancelLabel="Not now"
        tone="accent"
        onConfirm={async () => {
          setConfirmFirstSnapshotOpen(false);
          const stamp = new Date().toLocaleString();
          await saveSession(`Auto: ${stamp}`, true, "First automatic snapshot");
          await updateAutoSession({ lastRunAt: Date.now() });
        }}
        onCancel={() => setConfirmFirstSnapshotOpen(false)}
      />
    </Modal>
  );
}

function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return `${Math.max(1, Math.round(diff / 1000))}s ago`;
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)}h ago`;
  return `${Math.round(diff / 86_400_000)}d ago`;
}


function Section(props: {
  title: string;
  action?: preact.ComponentChildren;
  children: preact.ComponentChildren;
}) {
  return (
    <div>
      <div class="flex items-center justify-between mb-2">
        <div class="text-[11px] uppercase tracking-wide text-fg-subtle font-medium">
          {props.title}
        </div>
        {props.action}
      </div>
      {props.children}
    </div>
  );
}

function ThemeOption(props: {
  icon: preact.ComponentChildren;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  const cls = props.active
    ? "border-accent bg-accent-subtle text-accent"
    : "border-border bg-bg text-fg-muted hover:border-border-strong hover:text-fg";
  return (
    <button
      type="button"
      onClick={props.onClick}
      class={`h-16 flex flex-col items-center justify-center gap-1 rounded-md border ${cls} transition-colors`}
    >
      {props.icon}
      <span class="text-[11px] font-medium">{props.label}</span>
    </button>
  );
}

function NumberRow(props: {
  label: string;
  suffix: string;
  value: number;
  onChange: (next: number) => void;
}) {
  return (
    <div class="flex items-center justify-between gap-3 py-1.5">
      <label class="text-[12px] text-fg flex-1">{props.label}</label>
      <div class="flex items-center gap-1">
        <button
          type="button"
          onClick={() => props.onChange(props.value - 1)}
          class="size-6 inline-flex items-center justify-center rounded text-fg-muted hover:bg-surface hover:text-fg transition-colors"
          aria-label="Decrement"
        >
          −
        </button>
        <input
          type="number"
          value={props.value}
          min={1}
          max={999}
          onInput={(e) =>
            props.onChange(parseInt(
              (e.currentTarget as HTMLInputElement).value,
              10,
            ) || 1)
          }
          class="w-12 h-7 px-1 text-center bg-surface border border-border rounded text-[12px] focus:outline-none focus:bg-bg-elevated focus:border-accent"
        />
        <button
          type="button"
          onClick={() => props.onChange(props.value + 1)}
          class="size-6 inline-flex items-center justify-center rounded text-fg-muted hover:bg-surface hover:text-fg transition-colors"
          aria-label="Increment"
        >
          +
        </button>
        <span class="text-[11px] text-fg-subtle ml-1">{props.suffix}</span>
      </div>
    </div>
  );
}
