import type { StorageSchema } from "@/types";

export const storage = {
  async get<K extends keyof StorageSchema>(
    key: K,
  ): Promise<StorageSchema[K] | undefined> {
    const result = await chrome.storage.local.get(key);
    return result[key] as StorageSchema[K] | undefined;
  },

  async getMany<K extends keyof StorageSchema>(
    keys: K[],
  ): Promise<Partial<Pick<StorageSchema, K>>> {
    const result = await chrome.storage.local.get(keys);
    return result as Partial<Pick<StorageSchema, K>>;
  },

  async set<K extends keyof StorageSchema>(
    key: K,
    value: StorageSchema[K],
  ): Promise<void> {
    await chrome.storage.local.set({ [key]: value });
  },

  async update<K extends keyof StorageSchema>(
    key: K,
    updater: (current: StorageSchema[K] | undefined) => StorageSchema[K],
  ): Promise<StorageSchema[K]> {
    const current = await this.get(key);
    const next = updater(current);
    await this.set(key, next);
    return next;
  },

  async remove(key: keyof StorageSchema): Promise<void> {
    await chrome.storage.local.remove(key);
  },
};
