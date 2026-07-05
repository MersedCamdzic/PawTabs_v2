import { saveSession, restoreSession } from "./sessions";
import { setPreference, getPreferences } from "./preferences";
import { storage } from "./storage";
import { SUGGESTED_TABS_TO_OPEN } from "./demo-seed";

export interface DemoModeState {
  active: boolean;
  backupSessionId: string | null;
}

export async function isDemoModeActive(): Promise<boolean> {
  const prefs = await getPreferences();
  return Boolean(prefs.demoBackupSessionId);
}

export async function enterDemoMode(): Promise<void> {
  const backup = await saveSession(
    `Pre-demo backup — ${new Date().toLocaleString()}`,
    false,
    "Automatic backup before entering demo mode",
  );
  await setPreference("demoBackupSessionId", backup.id);

  const allWindows = await chrome.windows.getAll({ populate: true });
  const windowIds = allWindows
    .map((w) => w.id)
    .filter((id): id is number => id !== undefined);

  const opened: number[] = [];
  for (const group of SUGGESTED_TABS_TO_OPEN) {
    const [firstUrl, ...restUrls] = group.urls;
    if (!firstUrl) continue;
    const w = await chrome.windows.create({
      url: firstUrl,
      focused: false,
    });
    if (!w?.id) continue;
    opened.push(w.id);
    for (const url of restUrls) {
      await chrome.tabs.create({ url, windowId: w.id, active: false });
    }
    const meta = (await storage.get("windows")) ?? {};
    meta[w.id] = {
      title: group.windowName,
      color: group.color as
        | "gray"
        | "blue"
        | "green"
        | "amber"
        | "red"
        | "purple"
        | "pink"
        | "cyan",
    };
    await storage.set("windows", meta);
  }

  for (const id of windowIds) {
    try {
      await chrome.windows.remove(id);
    } catch {
      // ignore — some windows might block close
    }
  }
}

export async function exitDemoMode(): Promise<void> {
  const prefs = await getPreferences();
  const backupId = prefs.demoBackupSessionId;
  if (!backupId) return;
  const sessions = (await storage.get("savedSessions")) ?? [];
  const backup = sessions.find((s) => s.id === backupId);
  if (!backup) {
    await setPreference("demoBackupSessionId", null);
    return;
  }
  const currentWindows = await chrome.windows.getAll();
  const currentIds = currentWindows
    .map((w) => w.id)
    .filter((id): id is number => id !== undefined);
  await restoreSession(backup);
  for (const id of currentIds) {
    try {
      await chrome.windows.remove(id);
    } catch {
      // ignore
    }
  }
  await setPreference("demoBackupSessionId", null);
}
