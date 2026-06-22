import type { PawTab } from "@/types";
import { getRootDomain } from "./utils";

export interface DomainStat {
  domain: string;
  count: number;
}

export interface Insights {
  windowCount: number;
  tabCount: number;
  inactiveCount: number;
  pinnedCount: number;
  audibleCount: number;
  pawedCount: number;
  taggedCount: number;
  notedCount: number;
  topDomains: DomainStat[];
  oldestTab: PawTab | null;
  newestTab: PawTab | null;
}

export function computeInsights(
  tabs: PawTab[],
  windowCount: number,
): Insights {
  const domainMap = new Map<string, number>();
  let oldest: PawTab | null = null;
  let newest: PawTab | null = null;
  let pinned = 0;
  let audible = 0;
  let pawed = 0;
  let tagged = 0;
  let noted = 0;
  let inactive = 0;

  for (const tab of tabs) {
    const d = getRootDomain(tab.url);
    if (d) domainMap.set(d, (domainMap.get(d) ?? 0) + 1);

    if (tab.pinned) pinned += 1;
    if (tab.audible || tab.muted) audible += 1;
    if (tab.starred) pawed += 1;
    if (tab.tags.length > 0) tagged += 1;
    if (tab.notes.length > 0) noted += 1;
    if (tab.discarded) inactive += 1;

    const accessed = tab.lastAccessed ?? 0;
    if (accessed > 0) {
      if (!oldest || (oldest.lastAccessed ?? Infinity) > accessed) oldest = tab;
      if (!newest || (newest.lastAccessed ?? 0) < accessed) newest = tab;
    }
  }

  const topDomains: DomainStat[] = Array.from(domainMap.entries())
    .map(([domain, count]) => ({ domain, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  return {
    windowCount,
    tabCount: tabs.length,
    inactiveCount: inactive,
    pinnedCount: pinned,
    audibleCount: audible,
    pawedCount: pawed,
    taggedCount: tagged,
    notedCount: noted,
    topDomains,
    oldestTab: oldest,
    newestTab: newest,
  };
}
