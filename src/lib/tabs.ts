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
