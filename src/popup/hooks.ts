import { useEffect, useState, useCallback } from "preact/hooks";
import { fetchAllTabs } from "@/lib/chrome";
import type { TabSnapshot } from "@/types";

export function useTabSnapshot() {
  const [snapshot, setSnapshot] = useState<TabSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const next = await fetchAllTabs();
      setSnapshot(next);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    const onCreated = () => reload();
    const onRemoved = () => reload();
    const onUpdated = (
      _id: number,
      changeInfo: chrome.tabs.TabChangeInfo,
    ) => {
      if (
        changeInfo.pinned !== undefined ||
        changeInfo.mutedInfo !== undefined ||
        changeInfo.audible !== undefined ||
        changeInfo.discarded !== undefined ||
        changeInfo.title !== undefined ||
        changeInfo.favIconUrl !== undefined ||
        changeInfo.url !== undefined
      ) {
        reload();
      }
    };
    chrome.tabs.onCreated.addListener(onCreated);
    chrome.tabs.onRemoved.addListener(onRemoved);
    chrome.tabs.onUpdated.addListener(onUpdated);
    return () => {
      chrome.tabs.onCreated.removeListener(onCreated);
      chrome.tabs.onRemoved.removeListener(onRemoved);
      chrome.tabs.onUpdated.removeListener(onUpdated);
    };
  }, [reload]);

  return { snapshot, error, reload };
}
