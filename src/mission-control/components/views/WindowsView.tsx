import { useState, useEffect, useMemo, useCallback } from "preact/hooks";
import { Plus } from "@phosphor-icons/react";
import { getWindowsWithMeta, type WindowWithMeta } from "@/lib/windows";
import { WindowCard } from "../WindowCard";

interface Props {
  query: string;
  onAction: () => void;
}

export function WindowsView({ query, onAction }: Props) {
  const [windows, setWindows] = useState<WindowWithMeta[]>([]);
  const [movingTabId, setMovingTabId] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    setWindows(await getWindowsWithMeta());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const handler = () => refresh();
    chrome.tabs.onCreated.addListener(handler);
    chrome.tabs.onRemoved.addListener(handler);
    chrome.tabs.onAttached.addListener(handler);
    chrome.tabs.onDetached.addListener(handler);
    chrome.tabs.onUpdated.addListener(handler);
    chrome.windows.onCreated.addListener(handler);
    chrome.windows.onRemoved.addListener(handler);
    chrome.windows.onFocusChanged.addListener(handler);
    return () => {
      chrome.tabs.onCreated.removeListener(handler);
      chrome.tabs.onRemoved.removeListener(handler);
      chrome.tabs.onAttached.removeListener(handler);
      chrome.tabs.onDetached.removeListener(handler);
      chrome.tabs.onUpdated.removeListener(handler);
      chrome.windows.onCreated.removeListener(handler);
      chrome.windows.onRemoved.removeListener(handler);
      chrome.windows.onFocusChanged.removeListener(handler);
    };
  }, [refresh]);

  useEffect(() => {
    if (movingTabId === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMovingTabId(null);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [movingTabId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return windows;
    return windows
      .map((w) => ({
        ...w,
        tabs: w.tabs.filter(
          (t) =>
            t.title?.toLowerCase().includes(q) ||
            t.url?.toLowerCase().includes(q),
        ),
      }))
      .filter(
        (w) =>
          (w.customTitle ?? "").toLowerCase().includes(q) || w.tabs.length > 0,
      );
  }, [windows, query]);

  const sourceWindowId = useMemo(() => {
    if (movingTabId === null) return null;
    return (
      windows.find((w) => w.tabs.some((t) => t.id === movingTabId))?.id ?? null
    );
  }, [windows, movingTabId]);

  const handlePickTarget = async (targetWindowId: number) => {
    if (movingTabId === null) return;
    try {
      await chrome.tabs.move(movingTabId, {
        windowId: targetWindowId,
        index: -1,
      });
      onAction();
      await refresh();
    } finally {
      setMovingTabId(null);
    }
  };

  const handlePickNewWindow = async () => {
    if (movingTabId === null) return;
    try {
      await chrome.windows.create({ tabId: movingTabId });
      onAction();
      await refresh();
    } finally {
      setMovingTabId(null);
    }
  };

  return (
    <div class="px-6 py-4">
      {movingTabId !== null && (
        <div class="mb-3 flex items-center justify-between gap-3 text-[11px] text-accent bg-accent-subtle border border-accent/30 rounded-md px-3 py-2">
          <span>
            Pick a destination window — click any highlighted card. Press{" "}
            <kbd class="font-mono px-1 bg-bg-elevated rounded border border-accent/30">
              Esc
            </kbd>{" "}
            to cancel.
          </span>
          <button
            type="button"
            onClick={() => setMovingTabId(null)}
            class="font-medium hover:underline"
          >
            Cancel
          </button>
        </div>
      )}

      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {filtered.map((w) => (
          <WindowCard
            key={w.id}
            window={w}
            movingTabId={movingTabId}
            isMoveTarget={
              movingTabId !== null &&
              sourceWindowId !== null &&
              w.id !== sourceWindowId
            }
            onStartMove={setMovingTabId}
            onCancelMove={() => setMovingTabId(null)}
            onPickTarget={handlePickTarget}
            onReload={refresh}
          />
        ))}

        <button
          type="button"
          onClick={handlePickNewWindow}
          disabled={movingTabId === null}
          class={`flex items-center justify-center min-h-[120px] rounded-lg border-2 border-dashed text-[12px] font-medium transition-all ${
            movingTabId !== null
              ? "border-accent text-accent hover:bg-accent-subtle cursor-pointer"
              : "border-border text-fg-subtle cursor-not-allowed"
          }`}
        >
          <div class="text-center">
            <Plus size={20} weight="regular" class="mx-auto mb-1" />
            <div>
              {movingTabId !== null
                ? "Click to move to new window"
                : "Move tabs here to create a new window"}
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
