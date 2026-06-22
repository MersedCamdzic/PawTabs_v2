export interface RecentlyClosedItem {
  sessionId: string;
  url: string;
  title: string;
  favIconUrl: string;
  lastModified: number;
}

export interface RecentlyClosedResult {
  items: RecentlyClosedItem[];
  apiAvailable: boolean;
  error?: string;
}

export async function listRecentlyClosed(
  limit = 25,
): Promise<RecentlyClosedItem[]> {
  const r = await listRecentlyClosedDetailed(limit);
  return r.items;
}

export async function listRecentlyClosedDetailed(
  limit = 25,
): Promise<RecentlyClosedResult> {
  if (!chrome.sessions?.getRecentlyClosed) {
    return {
      items: [],
      apiAvailable: false,
      error:
        "chrome.sessions API is not available. The extension needs to be reinstalled to grant the 'sessions' permission.",
    };
  }

  try {
    const sessions = await chrome.sessions.getRecentlyClosed({
      maxResults: limit,
    });
    const items: RecentlyClosedItem[] = [];

    for (const s of sessions) {
      const lastModified = (s.lastModified ?? 0) * 1000;
      if (s.tab) {
        items.push({
          sessionId: s.tab.sessionId ?? "",
          url: s.tab.url ?? "",
          title: s.tab.title ?? "",
          favIconUrl: s.tab.favIconUrl ?? "",
          lastModified,
        });
      } else if (s.window?.tabs) {
        for (const t of s.window.tabs) {
          items.push({
            sessionId: t.sessionId ?? s.window.sessionId ?? "",
            url: t.url ?? "",
            title: t.title ?? "",
            favIconUrl: t.favIconUrl ?? "",
            lastModified,
          });
        }
      }
    }

    return { items, apiAvailable: true };
  } catch (err) {
    return {
      items: [],
      apiAvailable: true,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function restoreClosed(sessionId: string): Promise<void> {
  if (!chrome.sessions?.restore) return;
  await chrome.sessions.restore(sessionId);
}
