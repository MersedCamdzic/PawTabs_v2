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
