import { storage } from "./storage";
import type { PawedEntry } from "@/types";

export async function listPawed(): Promise<PawedEntry[]> {
  const map = (await storage.get("pawedUrls")) ?? {};
  return Object.values(map).sort((a, b) => b.pawedAt - a.pawedAt);
}

export async function isPawed(url: string): Promise<boolean> {
  if (!url) return false;
  const map = (await storage.get("pawedUrls")) ?? {};
  return Boolean(map[url]);
}

export async function pawTab(input: {
  url: string;
  title: string;
  favIconUrl: string;
}): Promise<void> {
  if (!input.url) return;
  const map = (await storage.get("pawedUrls")) ?? {};
  map[input.url] = {
    url: input.url,
    title: input.title,
    favIconUrl: input.favIconUrl,
    pawedAt: Date.now(),
    note: map[input.url]?.note,
  };
  await storage.set("pawedUrls", map);
}

export async function unpawTab(url: string): Promise<void> {
  if (!url) return;
  const map = (await storage.get("pawedUrls")) ?? {};
  if (!map[url]) return;
  delete map[url];
  await storage.set("pawedUrls", map);
}

export async function getPawedUrlSet(): Promise<Set<string>> {
  const map = (await storage.get("pawedUrls")) ?? {};
  return new Set(Object.keys(map));
}
