import { storage } from "./storage";
import { addTagToUrl, removeTagFromUrl } from "./tagged-urls";
import type { Note, SavedPage } from "@/types";

async function updateTab(
  tabId: number,
  patch: (entry: SavedPage) => SavedPage,
): Promise<void> {
  const savedPages = (await storage.get("savedPages")) ?? {};
  const entry = savedPages[tabId] ?? {};
  savedPages[tabId] = patch(entry);
  await storage.set("savedPages", savedPages);
}

export async function addTag(tabId: number, tag: string): Promise<void> {
  const clean = tag.trim();
  if (!clean) return;
  const tab = await chrome.tabs.get(tabId);
  if (!tab.url) return;
  await addTagToUrl({
    url: tab.url,
    title: tab.title ?? "",
    favIconUrl: tab.favIconUrl ?? "",
    tag: clean,
    windowId: tab.windowId,
  });
}

export async function removeTag(tabId: number, tag: string): Promise<void> {
  const tab = await chrome.tabs.get(tabId);
  if (!tab.url) return;
  await removeTagFromUrl(tab.url, tag);
}

export async function addNote(tabId: number, text: string): Promise<void> {
  const clean = text.trim();
  if (!clean) return;
  const note: Note = {
    id: `note_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    text: clean,
    createdAt: Date.now(),
  };
  await updateTab(tabId, (entry) => ({
    ...entry,
    notes: [...(entry.notes ?? []), note],
  }));
}

export async function removeNote(tabId: number, noteId: string): Promise<void> {
  await updateTab(tabId, (entry) => ({
    ...entry,
    notes: (entry.notes ?? []).filter((n) => n.id !== noteId),
  }));
}

export async function moveTabToWindow(
  tabId: number,
  windowId: number,
): Promise<void> {
  await chrome.tabs.move(tabId, { windowId, index: -1 });
}

export async function moveTabToNewWindow(tabId: number): Promise<void> {
  await chrome.windows.create({ tabId });
}

export async function closeMany(tabIds: number[]): Promise<void> {
  if (tabIds.length === 0) return;
  await chrome.tabs.remove(tabIds);
}

export async function setStarredMany(
  tabIds: number[],
  starred: boolean,
): Promise<void> {
  const { storage } = await import("./storage");
  const savedPages = (await storage.get("savedPages")) ?? {};
  for (const id of tabIds) {
    const entry = savedPages[id] ?? {};
    savedPages[id] = { ...entry, starred, saved: starred };
  }
  await storage.set("savedPages", savedPages);
}

export async function setPinnedMany(
  tabIds: number[],
  pinned: boolean,
): Promise<void> {
  await Promise.all(tabIds.map((id) => chrome.tabs.update(id, { pinned })));
}

export async function addTagToMany(
  tabIds: number[],
  tag: string,
): Promise<void> {
  const clean = tag.trim();
  if (!clean || tabIds.length === 0) return;
  const tabs = await Promise.all(
    tabIds.map((id) =>
      chrome.tabs.get(id).catch(() => null as chrome.tabs.Tab | null),
    ),
  );
  for (const t of tabs) {
    if (!t?.url) continue;
    await addTagToUrl({
      url: t.url,
      title: t.title ?? "",
      favIconUrl: t.favIconUrl ?? "",
      tag: clean,
      windowId: t.windowId,
    });
  }
}

export async function addNoteToMany(
  tabIds: number[],
  text: string,
): Promise<void> {
  const clean = text.trim();
  if (!clean || tabIds.length === 0) return;
  const savedPages = (await storage.get("savedPages")) ?? {};
  for (const id of tabIds) {
    const entry = savedPages[id] ?? {};
    const note: Note = {
      id: `note_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      text: clean,
      createdAt: Date.now(),
    };
    savedPages[id] = {
      ...entry,
      notes: [...(entry.notes ?? []), note],
    };
  }
  await storage.set("savedPages", savedPages);
}

export async function setStarredManyByUrl(
  tabs: { url: string; title: string; favIconUrl: string }[],
  starred: boolean,
): Promise<void> {
  const { pawTab, unpawTab } = await import("./pawed");
  for (const t of tabs) {
    if (!t.url) continue;
    if (starred) {
      await pawTab({
        url: t.url,
        title: t.title,
        favIconUrl: t.favIconUrl,
      });
    } else {
      await unpawTab(t.url);
    }
  }
}

export async function moveManyToWindow(
  tabIds: number[],
  windowId: number,
): Promise<void> {
  if (tabIds.length === 0) return;
  await chrome.tabs.move(tabIds, { windowId, index: -1 });
}

export async function moveManyToNewWindow(tabIds: number[]): Promise<void> {
  if (tabIds.length === 0) return;
  const [firstId, ...rest] = tabIds;
  if (firstId === undefined) return;
  const win = await chrome.windows.create({ tabId: firstId });
  if (!win || win.id === undefined || rest.length === 0) return;
  await chrome.tabs.move(rest, { windowId: win.id, index: -1 });
}

export async function openManyUrls(
  urls: string[],
  options: { newWindow?: boolean } = {},
): Promise<void> {
  const filtered = urls.filter(Boolean);
  if (filtered.length === 0) return;
  if (options.newWindow) {
    const [first, ...rest] = filtered;
    const win = await chrome.windows.create({ url: first });
    if (!win || win.id === undefined) return;
    for (const u of rest) {
      await chrome.tabs.create({ url: u, windowId: win.id, active: false });
    }
    return;
  }
  for (const u of filtered) {
    await chrome.tabs.create({ url: u, active: false });
  }
}

export async function addTagToManyUrls(
  items: { url: string; title: string; favIconUrl: string }[],
  tag: string,
): Promise<void> {
  const clean = tag.trim();
  if (!clean || items.length === 0) return;
  for (const it of items) {
    if (!it.url) continue;
    await addTagToUrl({
      url: it.url,
      title: it.title,
      favIconUrl: it.favIconUrl,
      tag: clean,
    });
  }
}

export async function unpawManyUrls(urls: string[]): Promise<void> {
  const { unpawTab } = await import("./pawed");
  for (const u of urls) {
    if (!u) continue;
    await unpawTab(u);
  }
}

export async function removeTagFromManyUrls(
  urls: string[],
  tag: string,
): Promise<void> {
  const { removeTagFromUrl } = await import("./tagged-urls");
  for (const u of urls) {
    if (!u) continue;
    await removeTagFromUrl(u, tag);
  }
}

export interface WindowInfo {
  id: number;
  customTitle: string | null;
  tabCount: number;
  firstTabTitle: string;
}

export async function listWindowsForMove(
  excludeTabId: number,
): Promise<WindowInfo[]> {
  const { getAllWindowTitles } = await import("./windows");
  const [windows, titles] = await Promise.all([
    chrome.windows.getAll({ populate: true }),
    getAllWindowTitles(),
  ]);
  return windows
    .filter((w) => w.id !== undefined)
    .map((w) => ({
      id: w.id!,
      customTitle: titles[w.id!] ?? null,
      tabCount: w.tabs?.length ?? 0,
      firstTabTitle:
        w.tabs?.find((t) => t.id !== excludeTabId)?.title ?? "Empty",
    }));
}
