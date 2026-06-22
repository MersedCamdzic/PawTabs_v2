import { storage } from "./storage";
import type { Preferences, GroupBy, Theme, WizardThresholds } from "@/types";

export const DEFAULT_PREFERENCES: Preferences = {
  grouping: "window",
  collapsedGroups: [],
  theme: "system",
  wizardThresholds: {
    splitThreshold: 20,
    splitInto: 5,
    regroupThreshold: 3,
  },
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
  };
}

export type { Preferences, GroupBy, Theme, WizardThresholds };
