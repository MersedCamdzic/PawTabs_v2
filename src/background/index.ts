import { storage } from "@/lib/storage";
import { getPreferences, setPreference } from "@/lib/preferences";
import { saveSession, pruneAutoSessions } from "@/lib/sessions";

const AUTO_SESSION_ALARM = "pawtabs_auto_session";

console.info("[PawTabs] background service worker ready");

chrome.runtime.onInstalled.addListener(() => {
  console.info("[PawTabs] installed");
  scheduleAutoSessionAlarm().catch(() => undefined);
});

chrome.runtime.onStartup.addListener(() => {
  scheduleAutoSessionAlarm().catch(() => undefined);
});

async function scheduleAutoSessionAlarm(): Promise<void> {
  await chrome.alarms.clear(AUTO_SESSION_ALARM);
  await chrome.alarms.create(AUTO_SESSION_ALARM, {
    periodInMinutes: 60,
    delayInMinutes: 1,
  });
}

async function runAutoSessionIfDue(): Promise<void> {
  try {
    const prefs = await getPreferences();
    const cfg = prefs.autoSession;
    if (!cfg?.enabled) return;
    const now = Date.now();
    const dueAt = (cfg.lastRunAt || 0) + cfg.intervalHours * 60 * 60 * 1000;
    if (now < dueAt) return;
    const stamp = new Date(now).toLocaleString();
    await saveSession(`Auto: ${stamp}`, true, "Automatic daily session backup");
    await pruneAutoSessions(cfg.maxCount);
    await setPreference("autoSession", { ...cfg, lastRunAt: now });
  } catch (err) {
    console.error("[PawTabs] auto-session failed", err);
  }
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === AUTO_SESSION_ALARM) {
    await runAutoSessionIfDue();
  }
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "open_popup") return;
  try {
    await chrome.action.openPopup();
  } catch (err) {
    console.error("[PawTabs] failed to open popup", err);
  }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
  if (changeInfo.pinned === undefined) return;
  const isPinned = changeInfo.pinned;

  const savedPages = (await storage.get("savedPages")) ?? {};
  if (savedPages[tabId]) {
    savedPages[tabId].pinned = isPinned;
    await storage.set("savedPages", savedPages);
  }

  const sessions = (await storage.get("savedSessions")) ?? [];
  const updated = sessions.map((session) => ({
    ...session,
    tabs: session.tabs.map((t) =>
      t.id === tabId ? { ...t, pinned: isPinned } : t,
    ),
  }));
  if (sessions.length > 0) {
    await storage.set("savedSessions", updated);
  }
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  const savedPages = await storage.get("savedPages");
  if (!savedPages || !savedPages[tabId]) return;
  delete savedPages[tabId];
  await storage.set("savedPages", savedPages);
});
