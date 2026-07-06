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

export interface RestoreProgress {
  done: number;
  total: number;
  currentUrl?: string;
}

export interface RestoreOptions {
  mode?: RestoreMode;
  batchSize?: number;
  delayMs?: number;
  onProgress?: (p: RestoreProgress) => void;
  signal?: AbortSignal;
  discardAfterCreate?: boolean;
  closeExistingWindows?: boolean;
  lazyPlaceholders?: boolean;
}

async function pause(ms: number, signal?: AbortSignal): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException("aborted", "AbortError"));
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(t);
      reject(new DOMException("aborted", "AbortError"));
    });
  });
}

function lazyPlaceholderUrl(tab: SessionTab): string {
  // Renders a tiny page with the real <title>. When the user
  // activates the tab, the background listener immediately navigates
  // to the target URL. The body just shows a subtle loading indicator
  // for the split second before the redirect kicks in.
  const title = (tab.title || tab.url).replace(/[<>&"]/g, (c) =>
    c === "<"
      ? "&lt;"
      : c === ">"
        ? "&gt;"
        : c === "&"
          ? "&amp;"
          : "&quot;",
  );
  const html = `<!doctype html><meta charset="utf-8"><title>${title}</title><style>html,body{height:100%;margin:0;font:14px system-ui;color:#666;display:flex;align-items:center;justify-content:center;background:#fafaf7}@keyframes s{to{transform:rotate(360deg)}}.d{width:22px;height:22px;border-radius:50%;border:2px solid #e5e5e5;border-top-color:#2563eb;animation:s .8s linear infinite}p{margin:1rem 0 0;font-size:12px}</style><body><div style="text-align:center"><div class="d"></div><p>Loading…</p></div></body>`;
  return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
}

function tabTargetUrl(tab: SessionTab, lazy: boolean): string {
  return lazy ? lazyPlaceholderUrl(tab) : tab.url;
}

async function stashPendingUrl(tabId: number, url: string): Promise<void> {
  try {
    await chrome.storage.local.set({ [`pawtabs_pending_${tabId}`]: url });
  } catch {
    // ignore
  }
}

async function createLazyTab(
  windowId: number | undefined,
  tab: SessionTab,
  lazy: boolean,
): Promise<void> {
  const created = await chrome.tabs.create({
    windowId,
    url: tabTargetUrl(tab, lazy),
    active: false,
    pinned: Boolean(tab.pinned),
  });
  if (!created?.id) return;
  if (lazy) await stashPendingUrl(created.id, tab.url);
  if (tab.pinned && !lazy) {
    try {
      await chrome.tabs.update(created.id, { pinned: true });
    } catch {
      // ignore
    }
  }
}

async function createBatched(
  windowId: number | undefined,
  tabs: SessionTab[],
  options: RestoreOptions,
  progressBase: { done: number; total: number },
): Promise<void> {
  const batchSize = Math.max(1, options.batchSize ?? 5);
  const delayMs = Math.max(0, options.delayMs ?? 300);
  const lazy = options.lazyPlaceholders ?? true;
  for (let i = 0; i < tabs.length; i += batchSize) {
    if (options.signal?.aborted) {
      throw new DOMException("aborted", "AbortError");
    }
    const chunk = tabs.slice(i, i + batchSize);
    await Promise.all(
      chunk.map((t) =>
        createLazyTab(windowId, t, lazy).catch(() => undefined),
      ),
    );
    progressBase.done += chunk.length;
    options.onProgress?.({
      done: progressBase.done,
      total: progressBase.total,
      currentUrl: chunk[chunk.length - 1]?.url,
    });
    if (i + batchSize < tabs.length) {
      await pause(delayMs, options.signal);
    }
  }
}

async function createWindowSeededWithFirstTab(
  first: SessionTab,
): Promise<number | undefined> {
  // We MUST use the real URL as the seed. Chrome refuses `about:blank`
  // and `data:` URLs in `chrome.windows.create({ url })` — window
  // creation silently no-ops which then makes the rest of the batched
  // restore skip. Using the tab's real URL for the seed is safe (it's
  // whatever URL the user had open when they saved the snapshot).
  //
  // Trade-off: the first tab of each window will actually load (not
  // lazy). For a typical restore that's still just N tabs (one per
  // source window) doing real navigation — the other 90-ish stay
  // lazy. Chrome handles that fine.
  const win = await chrome.windows.create({
    url: first.url,
    focused: false,
  });
  return win?.id;
}

export async function restoreSession(
  session: SavedSession,
  options: RestoreOptions = {},
): Promise<void> {
  const mode: RestoreMode = options.mode ?? "per-window";
  const restorable = (session.tabs ?? []).filter((t) =>
    isRestorable(t.url),
  );
  if (restorable.length === 0) {
    options.onProgress?.({ done: 0, total: 0 });
    return;
  }
  const progressBase = { done: 0, total: restorable.length };
  options.onProgress?.({ done: 0, total: restorable.length });

  const existingWindowIdsToClose: number[] = options.closeExistingWindows
    ? (await chrome.windows.getAll())
        .map((w) => w.id)
        .filter((id): id is number => id !== undefined)
    : [];

  if (mode === "single-window") {
    const [first, ...rest] = restorable;
    const winId = await createWindowSeededWithFirstTab(first);
    if (winId === undefined) {
      throw new Error(
        "PawTabs restore: Chrome refused to create the target window.",
      );
    }
    progressBase.done += 1;
    options.onProgress?.({
      done: progressBase.done,
      total: progressBase.total,
      currentUrl: first.url,
    });
    await createBatched(winId, rest, options, progressBase);
    if (existingWindowIdsToClose.length > 0) {
      await closeAll(existingWindowIdsToClose);
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

  let anyWindowCreated = false;
  for (const [sourceWid, tabs] of byWindow.entries()) {
    if (tabs.length === 0) continue;
    if (options.signal?.aborted) {
      throw new DOMException("aborted", "AbortError");
    }

    if (mode === "reuse-if-exists" && openIds.has(sourceWid)) {
      await createBatched(sourceWid, tabs, options, progressBase);
      anyWindowCreated = true;
      continue;
    }

    const [first, ...rest] = tabs;
    const winId = await createWindowSeededWithFirstTab(first);
    if (winId === undefined) continue;
    anyWindowCreated = true;
    progressBase.done += 1;
    options.onProgress?.({
      done: progressBase.done,
      total: progressBase.total,
      currentUrl: first.url,
    });
    await createBatched(winId, rest, options, progressBase);
  }

  if (!anyWindowCreated) {
    throw new Error(
      "PawTabs restore: Chrome refused to open any target window.",
    );
  }

  if (existingWindowIdsToClose.length > 0) {
    await closeAll(existingWindowIdsToClose);
  }
}

async function closeAll(ids: number[]): Promise<void> {
  for (const id of ids) {
    try {
      await chrome.windows.remove(id);
    } catch {
      // ignore — user may have closed it manually
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
