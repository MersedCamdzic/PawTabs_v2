import { storage } from "./storage";
import type { Backup } from "@/types";

export async function listBackups(): Promise<Backup[]> {
  const backups = (await storage.get("backups")) ?? [];
  return [...backups].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function deleteBackup(id: string): Promise<void> {
  await storage.update("backups", (current) =>
    (current ?? []).filter((b) => b.id !== id),
  );
}

export async function restoreBackup(backup: Backup): Promise<void> {
  const { data } = backup;
  if (data.savedPages) await storage.set("savedPages", data.savedPages);
  if (data.savedSessions)
    await storage.set("savedSessions", data.savedSessions);
  if (data.savedGroups) await storage.set("savedGroups", data.savedGroups);
}
