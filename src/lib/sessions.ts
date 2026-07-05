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

export type RestoreMode = "per-window" | "single-window" | "reuse-if-exists";

export interface RestoreOptions {
  mode?: RestoreMode;
}

export async function restoreSession(
  session: SavedSession,
  options: RestoreOptions = {},
): Promise<void> {
  const mode: RestoreMode = options.mode ?? "per-window";
  const restorable = session.tabs.filter((t) => isRestorable(t.url));
  if (restorable.length === 0) return;

  if (mode === "single-window") {
    const urls = restorable.map((t) => t.url);
    const win = await chrome.windows.create({ url: urls, focused: false });
    if (!win?.id) return;
    const created = await chrome.tabs.query({ windowId: win.id });
    for (let i = 0; i < restorable.length; i += 1) {
      const tab = restorable[i]!;
      const actual = created[i];
      if (tab.pinned && actual?.id !== undefined) {
        await chrome.tabs.update(actual.id, { pinned: true });
      }
    }
    return;
  }

  const byWindow = new Map<number, SessionTab[]>();
  for (const tab of restorable) {
    const wid = tab.windowId ?? 0;
    const arr = byWindow.get(wid) ?? [];
    arr.push(tab);
    byWindow.set(wid, arr);
  }

  const openWindows =
    mode === "reuse-if-exists" ? await chrome.windows.getAll() : [];
  const openIds = new Set(
    openWindows.map((w) => w.id).filter((id): id is number => id !== undefined),
  );

  for (const [sourceWid, tabs] of byWindow.entries()) {
    if (tabs.length === 0) continue;

    if (mode === "reuse-if-exists" && openIds.has(sourceWid)) {
      for (const tab of tabs) {
        const created = await chrome.tabs.create({
          windowId: sourceWid,
          url: tab.url,
          active: false,
          pinned: Boolean(tab.pinned),
        });
        // Chrome ignores `pinned` in some versions on create; ensure it.
        if (tab.pinned && created?.id !== undefined) {
          await chrome.tabs.update(created.id, { pinned: true });
        }
      }
      continue;
    }

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

export async function pruneAutoSessions(maxCount: number): Promise<void> {
  if (maxCount < 0) return;
  await storage.update("savedSessions", (current) => {
    const list = current ?? [];
    const autos = list
      .filter((s) => s.auto)
      .sort((a, b) => a.dateTime.localeCompare(b.dateTime));
    if (autos.length <= maxCount) return list;
    const toDelete = new Set(
      autos.slice(0, autos.length - maxCount).map((s) => s.id),
    );
    return list.filter((s) => !toDelete.has(s.id));
  });
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

export function formatAbsoluteDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const date = d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const time = d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${date} · ${time}`;
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
