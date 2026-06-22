import type { GroupBy, PawTab } from "@/types";
import { getRootDomain } from "./utils";

export interface TabGroup {
  key: string;
  title: string;
  count: number;
  tabs: PawTab[];
}

export const GROUP_BY_OPTIONS: { value: GroupBy; label: string }[] = [
  { value: "none", label: "None" },
  { value: "window", label: "Window" },
  { value: "domain", label: "Domain" },
  { value: "pinned", label: "Pinned" },
  { value: "pawed", label: "Pawed" },
  { value: "audible", label: "Audible" },
];

export function groupTabs(tabs: PawTab[], by: GroupBy): TabGroup[] {
  if (by === "none") {
    return [{ key: "all", title: "All tabs", count: tabs.length, tabs }];
  }

  const map = new Map<string, PawTab[]>();
  for (const tab of tabs) {
    const key = getGroupKey(tab, by);
    const arr = map.get(key) ?? [];
    arr.push(tab);
    map.set(key, arr);
  }

  const groups: TabGroup[] = Array.from(map.entries()).map(([key, items]) => ({
    key,
    title: getGroupTitle(key, by, items),
    count: items.length,
    tabs: items,
  }));

  return sortGroups(groups, by);
}

function getGroupKey(tab: PawTab, by: GroupBy): string {
  switch (by) {
    case "window":
      return `w${tab.windowId}`;
    case "domain":
      return getRootDomain(tab.url) || "—";
    case "pinned":
      return tab.pinned ? "pinned" : "unpinned";
    case "pawed":
      return tab.starred ? "pawed" : "unpawed";
    case "audible":
      return tab.audible || tab.muted ? "audible" : "silent";
    case "none":
      return "all";
  }
}

function getGroupTitle(key: string, by: GroupBy, tabs: PawTab[]): string {
  switch (by) {
    case "window": {
      const wid = tabs[0]?.windowId;
      return wid ? `Window ${wid}` : "Window";
    }
    case "domain":
      return key;
    case "pinned":
      return key === "pinned" ? "Pinned" : "Not pinned";
    case "pawed":
      return key === "pawed" ? "Pawed" : "Not pawed";
    case "audible":
      return key === "audible" ? "Playing audio" : "Silent";
    case "none":
      return "All tabs";
  }
}

function sortGroups(groups: TabGroup[], by: GroupBy): TabGroup[] {
  const sorted = [...groups];
  switch (by) {
    case "window":
      sorted.sort((a, b) => {
        const aId = parseInt(a.key.slice(1), 10);
        const bId = parseInt(b.key.slice(1), 10);
        return aId - bId;
      });
      break;
    case "pinned":
    case "pawed":
    case "audible":
      sorted.sort((a) => (isActiveGroup(a.key) ? -1 : 1));
      break;
    case "domain":
      sorted.sort((a, b) => b.count - a.count || a.title.localeCompare(b.title));
      break;
  }
  return sorted;
}

function isActiveGroup(key: string): boolean {
  return ["pinned", "pawed", "audible"].includes(key);
}
