import type { PawTab, TabSnapshot } from "@/types";
import { storage } from "./storage";

export async function fetchAllTabs(): Promise<TabSnapshot> {
  const [windows, savedPages] = await Promise.all([
    chrome.windows.getAll({ populate: true }),
    storage.get("savedPages"),
  ]);

  const saved = savedPages ?? {};
  const allTabs = windows.flatMap((w) => w.tabs ?? []);

  const tabs: PawTab[] = allTabs
    .filter((t): t is chrome.tabs.Tab & { id: number } => t.id !== undefined)
    .map((t) => ({
      id: t.id,
      windowId: t.windowId ?? 0,
      url: t.url ?? "",
      title: t.title ?? "",
      favIconUrl: t.favIconUrl ?? "",
      audible: t.audible ?? false,
      muted: t.mutedInfo?.muted ?? false,
      discarded: t.discarded ?? false,
      pinned: t.pinned ?? false,
      lastAccessed: t.lastAccessed,
      saved: Boolean(saved[t.id]?.saved),
      starred: Boolean(saved[t.id]?.starred),
    }));

  return {
    windowCount: windows.length,
    tabCount: allTabs.length,
    inactiveCount: allTabs.filter((t) => t.discarded).length,
    tabs,
  };
}

export async function focusTab(tabId: number, windowId: number): Promise<void> {
  await chrome.windows.update(windowId, { focused: true });
  await chrome.tabs.update(tabId, { active: true });
}

export async function closeTab(tabId: number): Promise<void> {
  await chrome.tabs.remove(tabId);
}

export async function togglePinned(
  tabId: number,
  pinned: boolean,
): Promise<void> {
  await chrome.tabs.update(tabId, { pinned });
}

export async function toggleMuted(
  tabId: number,
  muted: boolean,
): Promise<void> {
  await chrome.tabs.update(tabId, { muted });
}
