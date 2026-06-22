import { storage } from "@/lib/storage";

console.info("[PawTabs] background service worker ready");

chrome.runtime.onInstalled.addListener(() => {
  console.info("[PawTabs] installed");
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
