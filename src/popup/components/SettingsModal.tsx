import { useState, useEffect } from "preact/hooks";
import { Sun, Moon, Monitor } from "@phosphor-icons/react";
import { Modal } from "./Modal";
import {
  getPreferences,
  setPreference,
  DEFAULT_PREFERENCES,
} from "@/lib/preferences";
import { applyTheme } from "@/lib/theme";
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

        <Section title="Auto-save sessions">
          <div class="text-[11px] text-fg-subtle mb-3">
            Save a snapshot of your open tabs automatically. Oldest auto
            snapshots are pruned when the max is reached. Chrome ticks the
            background alarm every ~30s, so sub-minute intervals fire at
            the next tick.
          </div>
          <label class="flex items-center justify-between py-1.5 cursor-pointer">
            <span class="text-[12px] text-fg">Enable auto snapshots</span>
            <input
              type="checkbox"
              checked={autoSession.enabled}
              onChange={(e) =>
                updateAutoSession({
                  enabled: (e.currentTarget as HTMLInputElement).checked,
                })
              }
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
                value={autoSession.intervalUnit}
                onChange={(e) =>
                  updateAutoSession({
                    intervalUnit: (e.currentTarget as HTMLSelectElement)
                      .value as typeof autoSession.intervalUnit,
                  })
                }
                class="h-7 px-1.5 bg-surface border border-border rounded text-[12px] focus:outline-none focus:bg-bg-elevated focus:border-accent"
              >
                <option value="seconds">seconds (test)</option>
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
          <div class="text-[10px] text-fg-subtle mt-2 space-y-0.5">
            <div>
              Last run:{" "}
              {autoSession.lastRunAt > 0
                ? formatRelative(autoSession.lastRunAt)
                : "never"}
            </div>
            {autoSession.enabled && (
              <div>Next: {nextRunLabel(autoSession)}</div>
            )}
          </div>
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
    </Modal>
  );
}

const UNIT_MS_UI = {
  seconds: 1000,
  minutes: 60 * 1000,
  hours: 60 * 60 * 1000,
  days: 24 * 60 * 60 * 1000,
} as const;

function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return `${Math.max(1, Math.round(diff / 1000))}s ago`;
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)}h ago`;
  return `${Math.round(diff / 86_400_000)}d ago`;
}

function nextRunLabel(cfg: AutoSessionConfig): string {
  const intervalMs = (cfg.intervalValue || 1) * UNIT_MS_UI[cfg.intervalUnit];
  const nextAt = (cfg.lastRunAt || 0) + intervalMs;
  const diff = nextAt - Date.now();
  if (diff <= 0) return "next tick (~30s)";
  if (diff < 60_000) return `in ${Math.max(1, Math.round(diff / 1000))}s`;
  if (diff < 3_600_000) return `in ${Math.round(diff / 60_000)}m`;
  if (diff < 86_400_000) return `in ${Math.round(diff / 3_600_000)}h`;
  return `in ${Math.round(diff / 86_400_000)}d`;
}

function Section(props: {
  title: string;
  children: preact.ComponentChildren;
}) {
  return (
    <div>
      <div class="text-[11px] uppercase tracking-wide text-fg-subtle mb-2 font-medium">
        {props.title}
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
