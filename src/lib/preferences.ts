import { storage } from "./storage";
import type {
  Preferences,
  GroupBy,
  OrderBy,
  Theme,
  WizardThresholds,
  AutoSessionConfig,
} from "@/types";

export const DEFAULT_PREFERENCES: Preferences = {
  grouping: "window",
  ordering: "none",
  collapsedGroups: [],
  theme: "system",
  wizardThresholds: {
    splitThreshold: 20,
    splitInto: 5,
    regroupThreshold: 3,
  },
  autoSession: {
    enabled: false,
    intervalHours: 24,
    maxCount: 10,
    lastRunAt: 0,
  },
  demoBackupSessionId: null,
};

export async function getPreferences(): Promise<Preferences> {
  const stored = await storage.get("preferences");
  return mergePreferences(stored);
}

export async function setPreference<K extends keyof Preferences>(
  key: K,
  value: Preferences[K],
): Promise<void> {
  await storage.update("preferences", (prev) => ({
    ...mergePreferences(prev),
    [key]: value,
  }));
}

function mergePreferences(stored: Partial<Preferences> | undefined): Preferences {
  return {
    ...DEFAULT_PREFERENCES,
    ...(stored ?? {}),
    wizardThresholds: {
      ...DEFAULT_PREFERENCES.wizardThresholds,
      ...(stored?.wizardThresholds ?? {}),
    },
    autoSession: {
      ...DEFAULT_PREFERENCES.autoSession,
      ...(stored?.autoSession ?? {}),
    },
  };
}

export type {
  Preferences,
  GroupBy,
  OrderBy,
  Theme,
  WizardThresholds,
  AutoSessionConfig,
};
