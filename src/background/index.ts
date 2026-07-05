import { storage } from "@/lib/storage";
import { getPreferences, setPreference } from "@/lib/preferences";
import { saveSession, pruneAutoSessions } from "@/lib/sessions";

const AUTO_SESSION_ALARM = "pawtabs_auto_session";

console.info("[PawTabs] background service worker ready");

// Only register the alarm if auto-save is currently enabled. On every SW
// wake-up we re-check the pref so the alarm state stays in sync with the
// user's setting (previously alarm was always registered and just no-op'd
// on tick when disabled — this caused users to see the background job
// "still running" in DevTools).
(async () => {
  try {
    const prefs = await getPreferences();
    if (prefs.autoSession?.enabled) {
      await scheduleAutoSessionAlarm();
    } else {
      await chrome.alarms.clear(AUTO_SESSION_ALARM);
    }
  } catch (e) {
    console.error("[PawTabs] initial alarm sync failed", e);
  }
})();

chrome.runtime.onInstalled.addListener(async () => {
  console.info("[PawTabs] installed");
  const prefs = await getPreferences();
  if (prefs.autoSession?.enabled) {
    await scheduleAutoSessionAlarm();
  }
});

chrome.runtime.onStartup.addListener(async () => {
  const prefs = await getPreferences();
  if (prefs.autoSession?.enabled) {
    await scheduleAutoSessionAlarm();
  }
});

// Allow popup / MC to trigger a snapshot immediately via message.
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "pawtabs:run_auto_session") {
    runAutoSessionIfDue({ force: true })
      .then(() => sendResponse({ ok: true }))
      .catch((e) => sendResponse({ ok: false, error: String(e) }));
    return true;
  }
  if (msg?.type === "pawtabs:auto_session_toggle") {
    (async () => {
      try {
        if (msg.enabled) {
          await scheduleAutoSessionAlarm();
          console.info("[PawTabs] auto-session alarm rescheduled (enabled)");
        } else {
          await chrome.alarms.clear(AUTO_SESSION_ALARM);
          console.info("[PawTabs] auto-session alarm cleared (disabled)");
        }
        sendResponse({ ok: true });
      } catch (e) {
        sendResponse({ ok: false, error: String(e) });
      }
    })();
    return true;
  }
  return undefined;
});

const UNIT_MS = {
  seconds: 1000,
  minutes: 60 * 1000,
  hours: 60 * 60 * 1000,
  days: 24 * 60 * 60 * 1000,
} as const;

async function scheduleAutoSessionAlarm(): Promise<void> {
  await chrome.alarms.clear(AUTO_SESSION_ALARM);
  // Chrome min periodInMinutes is 0.5 in dev / 1 in prod. Sub-minute
  // intervals rely on shorter tick + polling.
  await chrome.alarms.create(AUTO_SESSION_ALARM, {
    periodInMinutes: 0.5,
    delayInMinutes: 0.1,
  });
}

async function runAutoSessionIfDue(
  opts: { force?: boolean } = {},
): Promise<void> {
  try {
    const prefs = await getPreferences();
    const cfg = prefs.autoSession;
    if (!opts.force && !cfg?.enabled) {
      // Belt & braces: if the toggle is off but the alarm is somehow still
      // registered (e.g. from a previous session where toggle was on),
      // clear it now so we stop ticking entirely.
      await chrome.alarms.clear(AUTO_SESSION_ALARM);
      return;
    }
    const now = Date.now();
    if (!opts.force) {
      const intervalMs =
        (cfg.intervalValue || 1) *
        (UNIT_MS[cfg.intervalUnit] ?? UNIT_MS.days);
      const dueAt = (cfg.lastRunAt || 0) + intervalMs;
      if (now < dueAt) return;
    }
    const stamp = new Date(now).toLocaleString();
    await saveSession(`Auto: ${stamp}`, true, "Automatic session backup");
    await pruneAutoSessions(cfg.maxCount);
    await setPreference("autoSession", { ...cfg, lastRunAt: now });
    console.info("[PawTabs] auto-session saved at", stamp);
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
