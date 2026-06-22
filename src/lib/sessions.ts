import { storage } from "./storage";
import type { SavedSession, SessionTab } from "@/types";

export async function listSessions(): Promise<SavedSession[]> {
  const sessions = (await storage.get("savedSessions")) ?? [];
  return [...sessions].sort((a, b) =>
    b.dateTime.localeCompare(a.dateTime),
  );
}

export async function saveSession(
  name: string,
  auto = false,
  description = "",
): Promise<SavedSession> {
  const trimmed = name.trim() || defaultSessionName();
  const windows = await chrome.windows.getAll({ populate: true });

  const tabs: SessionTab[] = windows.flatMap((w) =>
    (w.tabs ?? [])
      .filter((t) => t.url && t.id !== undefined)
      .map((t) => ({
        id: t.id!,
        url: t.url!,
        title: t.title ?? "",
        pinned: t.pinned,
        windowId: w.id,
        favIconUrl: t.favIconUrl,
      })),
  );

  const cleanDesc = description.trim();
  const session: SavedSession = {
    id: `session_${Date.now()}`,
    sessionName: trimmed,
    description: cleanDesc || undefined,
    dateTime: new Date().toISOString(),
    tabs,
    windows: windows.map((w) => ({ id: w.id ?? 0 })),
    auto: auto || undefined,
  };

  await storage.update("savedSessions", (current) => [
    ...(current ?? []),
    session,
  ]);
  return session;
}

export async function restoreSession(session: SavedSession): Promise<void> {
  const byWindow = new Map<number, SessionTab[]>();
  for (const tab of session.tabs) {
    if (!isRestorable(tab.url)) continue;
    const wid = tab.windowId ?? 0;
    const arr = byWindow.get(wid) ?? [];
    arr.push(tab);
    byWindow.set(wid, arr);
  }

  for (const tabs of byWindow.values()) {
    if (tabs.length === 0) continue;
    const urls = tabs.map((t) => t.url);
    const win = await chrome.windows.create({ url: urls, focused: false });
    if (!win || win.id === undefined) continue;

    const created = await chrome.tabs.query({ windowId: win.id });
    for (let i = 0; i < tabs.length; i += 1) {
      const tab = tabs[i]!;
      const actual = created[i];
      if (tab.pinned && actual?.id !== undefined) {
        await chrome.tabs.update(actual.id, { pinned: true });
      }
    }
  }
}

export async function deleteSession(id: string): Promise<void> {
  await storage.update("savedSessions", (current) =>
    (current ?? []).filter((s) => s.id !== id),
  );
}

function isRestorable(url: string): boolean {
  if (!url) return false;
  if (url.startsWith("chrome://")) return false;
  if (url.startsWith("chrome-extension://")) return false;
  if (url.startsWith("edge://")) return false;
  if (url.startsWith("about:")) return false;
  return true;
}

function defaultSessionName(): string {
  const d = new Date();
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return `Session ${date} ${time}`;
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

export function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diffMs = Date.now() - then;
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}
