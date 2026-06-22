import { storage } from "./storage";
import type { Backup } from "@/types";

export interface WizardOptions {
  closeInactive: boolean;
  removeDuplicates: boolean;
  splitLarge: boolean;
  regroupSmall: boolean;
  splitThreshold: number;
  splitInto: number;
  regroupThreshold: number;
}

export interface WizardResult {
  closedInactive: number;
  removedDuplicates: number;
  windowsSplit: number;
  windowsRegrouped: number;
  backupId: string;
}

export const WIZARD_DEFAULTS: WizardOptions = {
  closeInactive: true,
  removeDuplicates: true,
  splitLarge: false,
  regroupSmall: false,
  splitThreshold: 20,
  splitInto: 5,
  regroupThreshold: 3,
};

export async function runWizard(opts: WizardOptions): Promise<WizardResult> {
  const backupId = await createBackup();

  const result: WizardResult = {
    closedInactive: 0,
    removedDuplicates: 0,
    windowsSplit: 0,
    windowsRegrouped: 0,
    backupId,
  };

  if (opts.closeInactive) {
    result.closedInactive = await closeInactiveTabs();
  }
  if (opts.removeDuplicates) {
    result.removedDuplicates = await removeDuplicateTabs();
  }
  if (opts.splitLarge) {
    result.windowsSplit = await splitLargeWindows(
      opts.splitThreshold,
      opts.splitInto,
    );
  }
  if (opts.regroupSmall) {
    result.windowsRegrouped = await regroupSmallWindows(opts.regroupThreshold);
  }

  return result;
}

async function closeInactiveTabs(): Promise<number> {
  const windows = await chrome.windows.getAll({ populate: true });
  const inactive = windows
    .flatMap((w) => w.tabs ?? [])
    .filter((t) => t.discarded && !t.pinned && t.id !== undefined);

  await Promise.all(inactive.map((t) => chrome.tabs.remove(t.id!)));
  return inactive.length;
}

async function removeDuplicateTabs(): Promise<number> {
  const windows = await chrome.windows.getAll({ populate: true });
  const seen = new Set<string>();
  const duplicates: number[] = [];

  for (const w of windows) {
    for (const tab of w.tabs ?? []) {
      if (!tab.url || tab.id === undefined || tab.pinned) continue;
      if (seen.has(tab.url)) {
        duplicates.push(tab.id);
      } else {
        seen.add(tab.url);
      }
    }
  }

  await Promise.all(duplicates.map((id) => chrome.tabs.remove(id)));
  return duplicates.length;
}

async function splitLargeWindows(
  threshold: number,
  into: number,
): Promise<number> {
  const windows = await chrome.windows.getAll({ populate: true });
  let count = 0;

  for (const w of windows) {
    const tabs = (w.tabs ?? []).filter((t) => t.id !== undefined);
    if (tabs.length <= threshold) continue;

    for (let i = into; i < tabs.length; i += into) {
      const chunk = tabs.slice(i, i + into);
      const firstId = chunk[0]?.id;
      if (firstId === undefined) continue;

      const newWindow = await chrome.windows.create({ tabId: firstId });
      const targetId = newWindow?.id;
      if (targetId === undefined) continue;

      for (let j = 1; j < chunk.length; j += 1) {
        const id = chunk[j]?.id;
        if (id === undefined) continue;
        await chrome.tabs.move(id, { windowId: targetId, index: -1 });
      }
    }
    count += 1;
  }

  return count;
}

async function regroupSmallWindows(threshold: number): Promise<number> {
  const windows = await chrome.windows.getAll({ populate: true });
  const smalls = windows.filter(
    (w) => (w.tabs?.length ?? 0) < threshold && (w.tabs?.length ?? 0) > 0,
  );
  if (smalls.length < 2) return 0;

  const target = smalls[0]!;
  let merged = 0;
  for (let i = 1; i < smalls.length; i += 1) {
    const tabs = smalls[i]!.tabs ?? [];
    for (const tab of tabs) {
      if (tab.id === undefined || tab.pinned) continue;
      await chrome.tabs.move(tab.id, { windowId: target.id!, index: -1 });
    }
    merged += 1;
  }
  return merged;
}

async function createBackup(): Promise<string> {
  const windows = await chrome.windows.getAll({ populate: true });
  const id = `backup_${Date.now()}`;
  const date = new Date();
  const dateStr = `${date.getFullYear()}_${pad(date.getMonth() + 1)}_${pad(date.getDate())}`;

  const tabCount = windows.reduce((acc, w) => acc + (w.tabs?.length ?? 0), 0);

  const backup: Backup = {
    id,
    name: `Wizard_Backup_${dateStr}`,
    createdAt: date.toISOString(),
    windowCount: windows.length,
    tabCount,
    data: {},
  };

  const [savedPages, savedSessions, savedGroups] = await Promise.all([
    storage.get("savedPages"),
    storage.get("savedSessions"),
    storage.get("savedGroups"),
  ]);

  if (savedPages) backup.data.savedPages = savedPages;
  if (savedSessions) backup.data.savedSessions = savedSessions;
  if (savedGroups) backup.data.savedGroups = savedGroups;

  await storage.update("backups", (current) => [...(current ?? []), backup]);
  return id;
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}
