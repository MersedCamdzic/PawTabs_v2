import { storage } from "./storage";
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
  await updateTab(tabId, (entry) => {
    const tags = entry.tags ?? [];
    if (tags.includes(clean)) return entry;
    return { ...entry, tags: [...tags, clean] };
  });
}

export async function removeTag(tabId: number, tag: string): Promise<void> {
  await updateTab(tabId, (entry) => ({
    ...entry,
    tags: (entry.tags ?? []).filter((t) => t !== tag),
  }));
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
  const { storage } = await import("./storage");
  const savedPages = (await storage.get("savedPages")) ?? {};
  for (const id of tabIds) {
    const entry = savedPages[id] ?? {};
    const tags = entry.tags ?? [];
    if (!tags.includes(clean)) {
      savedPages[id] = { ...entry, tags: [...tags, clean] };
    }
  }
  await storage.set("savedPages", savedPages);
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

export interface WindowInfo {
  id: number;
  tabCount: number;
  firstTabTitle: string;
}

export async function listWindowsForMove(
  excludeTabId: number,
): Promise<WindowInfo[]> {
  const windows = await chrome.windows.getAll({ populate: true });
  return windows
    .filter((w) => w.id !== undefined)
    .map((w) => ({
      id: w.id!,
      tabCount: w.tabs?.length ?? 0,
      firstTabTitle:
        w.tabs?.find((t) => t.id !== excludeTabId)?.title ?? "Empty",
    }));
}
