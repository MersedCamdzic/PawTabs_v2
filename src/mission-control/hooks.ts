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
    const handler = () => reload();
    chrome.tabs.onCreated.addListener(handler);
    chrome.tabs.onRemoved.addListener(handler);
    chrome.tabs.onUpdated.addListener(handler);
    return () => {
      chrome.tabs.onCreated.removeListener(handler);
      chrome.tabs.onRemoved.removeListener(handler);
      chrome.tabs.onUpdated.removeListener(handler);
    };
  }, [reload]);

  return { snapshot, error, reload };
}
