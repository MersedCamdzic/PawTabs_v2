import { storage } from "./storage";

export async function getWindowTitle(windowId: number): Promise<string | null> {
  const windows = await storage.get("windows");
  return windows?.[windowId]?.title ?? null;
}

export async function setWindowTitle(
  windowId: number,
  title: string,
): Promise<void> {
  const trimmed = title.trim();
  await storage.update("windows", (current) => {
    const next = { ...(current ?? {}) };
    if (!trimmed) {
      delete next[windowId];
    } else {
      next[windowId] = { ...(next[windowId] ?? {}), title: trimmed };
    }
    return next;
  });
}

export async function getAllWindowTitles(): Promise<Record<number, string>> {
  const windows = (await storage.get("windows")) ?? {};
  const result: Record<number, string> = {};
  for (const [id, meta] of Object.entries(windows)) {
    if (meta.title) result[Number(id)] = meta.title;
  }
  return result;
}

export interface WindowWithMeta {
  id: number;
  customTitle: string | null;
  tabs: chrome.tabs.Tab[];
  focused: boolean;
}

export async function getWindowsWithMeta(): Promise<WindowWithMeta[]> {
  const [chromeWindows, titles] = await Promise.all([
    chrome.windows.getAll({ populate: true }),
    getAllWindowTitles(),
  ]);
  return chromeWindows
    .filter((w): w is chrome.windows.Window & { id: number } => w.id !== undefined)
    .map((w) => ({
      id: w.id,
      customTitle: titles[w.id] ?? null,
      tabs: w.tabs ?? [],
      focused: w.focused ?? false,
    }));
}

import type { PawTab } from "@/types";
import { fetchAllTabs } from "./chrome";

export interface WindowWithPawTabs {
  id: number;
  customTitle: string | null;
  tabs: PawTab[];
  focused: boolean;
}

export async function getWindowsWithPawTabs(): Promise<WindowWithPawTabs[]> {
  // chrome.windows.getCurrent() from an extension page returns the window
  // containing that page (MC's own window). It is STABLE — clicking another
  // browser window does not change it. Using this for the 'Current' badge
  // keeps MC anchored where the user opened it.
  const [snapshot, titles, currentWindow] = await Promise.all([
    fetchAllTabs(),
    getAllWindowTitles(),
    chrome.windows.getCurrent(),
  ]);

  const currentWindowId = currentWindow.id;

  const grouped = new Map<number, PawTab[]>();
  for (const tab of snapshot.tabs) {
    const arr = grouped.get(tab.windowId) ?? [];
    arr.push(tab);
    grouped.set(tab.windowId, arr);
  }

  return Array.from(grouped.entries()).map(([id, tabs]) => ({
    id,
    customTitle: titles[id] ?? null,
    tabs,
    focused: id === currentWindowId,
  }));
}
