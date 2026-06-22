import { storage } from "./storage";
import type { TaggedUrlEntry } from "@/types";

export async function getTaggedMap(): Promise<Record<string, TaggedUrlEntry>> {
  return (await storage.get("taggedUrls")) ?? {};
}

export async function getTagsForUrl(url: string): Promise<string[]> {
  if (!url) return [];
  const map = await getTaggedMap();
  return map[url]?.tags ?? [];
}

export async function addTagToUrl(input: {
  url: string;
  title: string;
  favIconUrl: string;
  tag: string;
}): Promise<void> {
  const clean = input.tag.trim();
  if (!clean || !input.url) return;
  const map = await getTaggedMap();
  const existing = map[input.url];
  const nextTags = existing?.tags ?? [];
  if (nextTags.includes(clean)) return;
  map[input.url] = {
    url: input.url,
    title: input.title || existing?.title || "",
    favIconUrl: input.favIconUrl || existing?.favIconUrl || "",
    tags: [...nextTags, clean],
    updatedAt: Date.now(),
  };
  await storage.set("taggedUrls", map);
}

export async function removeTagFromUrl(
  url: string,
  tag: string,
): Promise<void> {
  if (!url) return;
  const map = await getTaggedMap();
  const existing = map[url];
  if (!existing) return;
  const nextTags = existing.tags.filter((t) => t !== tag);
  if (nextTags.length === 0) {
    delete map[url];
  } else {
    map[url] = { ...existing, tags: nextTags, updatedAt: Date.now() };
  }
  await storage.set("taggedUrls", map);
}

export interface TagAggregate {
  tag: string;
  count: number;
  entries: TaggedUrlEntry[];
}

export async function listTags(): Promise<TagAggregate[]> {
  const map = await getTaggedMap();
  const tagMap = new Map<string, TaggedUrlEntry[]>();
  for (const entry of Object.values(map)) {
    for (const tag of entry.tags) {
      const arr = tagMap.get(tag) ?? [];
      arr.push(entry);
      tagMap.set(tag, arr);
    }
  }
  return Array.from(tagMap.entries())
    .map(([tag, entries]) => ({ tag, count: entries.length, entries }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}
