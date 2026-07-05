import { useState, useEffect } from "preact/hooks";
import {
  Sun,
  Moon,
  Monitor,
  Database,
  Trash,
} from "@phosphor-icons/react";
import { Modal } from "./Modal";
import {
  getPreferences,
  setPreference,
  DEFAULT_PREFERENCES,
} from "@/lib/preferences";
import { applyTheme } from "@/lib/theme";
import { seedDemoData, clearDemoData } from "@/lib/demo-seed";
import type { Theme, WizardThresholds } from "@/types";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function SettingsModal({ open, onClose }: Props) {
  const [theme, setTheme] = useState<Theme>(DEFAULT_PREFERENCES.theme);
  const [thresholds, setThresholds] = useState<WizardThresholds>(
    DEFAULT_PREFERENCES.wizardThresholds,
  );
  const [demoStatus, setDemoStatus] = useState<null | "loading" | "loaded" | "cleared">(
    null,
  );

  const handleSeedDemo = async () => {
    if (demoStatus === "loading") return;
    if (
      !confirm(
        "Load demo data? This will REPLACE your current pawed URLs, tags, snapshots, backups, and window names with a realistic sample set (Amazon, Google, CNN, GitHub etc.) — useful for screenshots. Existing tabs stay open.",
      )
    )
      return;
    setDemoStatus("loading");
    try {
      await seedDemoData();
      setDemoStatus("loaded");
    } catch {
      setDemoStatus(null);
    }
  };

  const handleClearDemo = async () => {
    if (demoStatus === "loading") return;
    if (
      !confirm(
        "Clear ALL saved data (pawed URLs, tags, snapshots, backups, window names, tab notes)? This cannot be undone. Open tabs stay open.",
      )
    )
      return;
    setDemoStatus("loading");
    try {
      await clearDemoData();
      setDemoStatus("cleared");
    } catch {
      setDemoStatus(null);
    }
  };

  useEffect(() => {
    if (!open) return;
    getPreferences().then((p) => {
      setTheme(p.theme);
      setThresholds(p.wizardThresholds);
    });
  }, [open]);

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

        <Section title="Demo data (for screenshots / testing)">
          <div class="text-[11px] text-fg-subtle mb-3">
            Populate storage with realistic sample data — Amazon,
            Google, CNN, GitHub etc. — so screenshots and testing look
            polished. Replaces existing paw/tags/snapshots/windows.
          </div>
          <div class="flex gap-2">
            <button
              type="button"
              onClick={handleSeedDemo}
              disabled={demoStatus === "loading"}
              class="flex-1 h-9 px-3 inline-flex items-center justify-center gap-1.5 text-[12px] font-medium rounded-md border border-accent/40 text-accent bg-accent-subtle hover:bg-accent-subtle/70 disabled:opacity-40 transition-colors"
            >
              <Database size={13} weight="fill" />
              {demoStatus === "loading"
                ? "Loading…"
                : demoStatus === "loaded"
                  ? "Loaded ✓"
                  : "Load demo data"}
            </button>
            <button
              type="button"
              onClick={handleClearDemo}
              disabled={demoStatus === "loading"}
              class="h-9 px-3 inline-flex items-center gap-1.5 text-[12px] font-medium rounded-md border border-border text-fg-muted hover:border-danger hover:text-danger hover:bg-danger-subtle disabled:opacity-40 transition-colors"
            >
              <Trash size={13} />
              {demoStatus === "cleared" ? "Cleared" : "Clear all"}
            </button>
          </div>
          {demoStatus === "loaded" && (
            <div class="text-[10px] text-success mt-2">
              Reload popup / MC to see the new data.
            </div>
          )}
        </Section>
      </div>
    </Modal>
  );
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
