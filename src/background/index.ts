import { storage } from "@/lib/storage";
import { pawTab, unpawTab, isPawed } from "@/lib/pawed";

console.info("[PawTabs] background service worker ready");

chrome.runtime.onInstalled.addListener(() => {
  console.info("[PawTabs] installed");
});

async function getActiveTab(): Promise<chrome.tabs.Tab | null> {
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });
  return tab ?? null;
}

async function flashBadge(text: string, color = "#2563EB") {
  try {
    const tab = await getActiveTab();
    if (!tab?.id) return;
    await chrome.action.setBadgeBackgroundColor({ color, tabId: tab.id });
    await chrome.action.setBadgeText({ text, tabId: tab.id });
    setTimeout(() => {
      chrome.action.setBadgeText({ text: "", tabId: tab.id });
    }, 1200);
  } catch {
    // ignore
  }
}

chrome.commands.onCommand.addListener(async (command) => {
  try {
    if (command === "open_popup") {
      await chrome.action.openPopup();
      return;
    }

    const tab = await getActiveTab();
    if (!tab?.id || !tab.url) return;

    if (command === "paw_current") {
      if (await isPawed(tab.url)) {
        await unpawTab(tab.url);
        await flashBadge("○", "#9CA3AF");
      } else {
        await pawTab({
          url: tab.url,
          title: tab.title ?? "",
          favIconUrl: tab.favIconUrl ?? "",
        });
        await flashBadge("✓", "#2563EB");
      }
      return;
    }

    if (command === "toggle_pin_current") {
      await chrome.tabs.update(tab.id, { pinned: !tab.pinned });
      await flashBadge(tab.pinned ? "○" : "📌", "#F59E0B");
      return;
    }

    if (command === "toggle_mute_current") {
      const muted = !tab.mutedInfo?.muted;
      await chrome.tabs.update(tab.id, { muted });
      await flashBadge(muted ? "🔇" : "🔊", "#10B981");
      return;
    }

    if (command === "move_current_to_new_window") {
      await chrome.windows.create({ tabId: tab.id });
      return;
    }
  } catch (err) {
    console.error("[PawTabs] command failed:", command, err);
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
