export interface HistoryEntry {
  id: string;
  url: string;
  title: string;
  lastVisitTime: number;
  visitCount: number;
}

export type HistoryRange = "24h" | "7d" | "30d" | "all";

const RANGE_MS: Record<HistoryRange, number> = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
  all: 0,
};

export function rangeStartTime(range: HistoryRange): number {
  if (range === "all") return 0;
  return Date.now() - RANGE_MS[range];
}

// Chrome's chrome.history.search silently caps maxResults (500-1000
// depending on version). To surface everything in the range, we page
// backwards in time: fetch a page, take the oldest lastVisitTime, use
// it as the next endTime, repeat until we get an empty page or hit the
// hard total cap. Dedupes by URL because Chrome may return a URL
// twice on the seam between pages.
const PAGE_SIZE = 1000;
const MAX_PAGES = 20;

export async function searchHistory(opts: {
  query?: string;
  range?: HistoryRange;
  maxResults?: number;
} = {}): Promise<HistoryEntry[]> {
  const range = opts.range ?? "7d";
  const startTime = rangeStartTime(range);
  const hardCap = opts.maxResults ?? PAGE_SIZE * MAX_PAGES;
  const text = opts.query ?? "";

  const seen = new Set<string>();
  const out: HistoryEntry[] = [];
  let endTime = Date.now();

  for (let page = 0; page < MAX_PAGES && out.length < hardCap; page++) {
    const items = await chrome.history.search({
      text,
      startTime,
      endTime,
      maxResults: PAGE_SIZE,
    });
    if (items.length === 0) break;

    let oldestInPage = endTime;
    let addedThisPage = 0;
    for (const it of items) {
      if (!it.url || !it.id) continue;
      const lastVisit = it.lastVisitTime ?? 0;
      if (lastVisit && lastVisit < oldestInPage) oldestInPage = lastVisit;
      if (seen.has(it.url)) continue;
      seen.add(it.url);
      out.push({
        id: it.id,
        url: it.url,
        title: it.title ?? "",
        lastVisitTime: lastVisit,
        visitCount: it.visitCount ?? 0,
      });
      addedThisPage++;
      if (out.length >= hardCap) break;
    }

    if (addedThisPage === 0) break;

    // Advance the window: next page must end strictly before this
    // page's oldest entry so we don't loop on the same visit.
    const nextEnd = oldestInPage - 1;
    if (nextEnd <= startTime) break;
    endTime = nextEnd;
  }

  return out;
}

export async function deleteHistoryUrl(url: string): Promise<void> {
  await chrome.history.deleteUrl({ url });
}

export async function deleteHistoryUrls(urls: string[]): Promise<void> {
  await Promise.all(urls.map((url) => chrome.history.deleteUrl({ url })));
}

export async function clearAllHistory(): Promise<void> {
  await chrome.history.deleteAll();
}
