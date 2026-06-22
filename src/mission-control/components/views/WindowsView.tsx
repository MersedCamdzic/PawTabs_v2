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
  const [draggingTabId, setDraggingTabId] = useState<number | null>(null);
  const [isNewWindowTarget, setIsNewWindowTarget] = useState(false);

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

  const handleDropTab = async (targetWindowId: number) => {
    if (draggingTabId === null) return;
    try {
      await chrome.tabs.move(draggingTabId, {
        windowId: targetWindowId,
        index: -1,
      });
      onAction();
      await refresh();
    } finally {
      setDraggingTabId(null);
    }
  };

  const handleDropNewWindow = async () => {
    if (draggingTabId === null) return;
    try {
      await chrome.windows.create({ tabId: draggingTabId });
      onAction();
      await refresh();
    } finally {
      setDraggingTabId(null);
      setIsNewWindowTarget(false);
    }
  };

  return (
    <div class="px-6 py-4">
      {draggingTabId !== null && (
        <div class="mb-3 text-[11px] text-accent bg-accent-subtle border border-accent/30 rounded-md px-3 py-2">
          Dragging tab — drop on a window card to move it, or on the dashed
          card to create a new window.
        </div>
      )}

      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {filtered.map((w) => (
          <WindowCard
            key={w.id}
            window={w}
            draggingTabId={draggingTabId}
            onDragStart={setDraggingTabId}
            onDragEnd={() => setDraggingTabId(null)}
            onDropTab={handleDropTab}
            onReload={refresh}
          />
        ))}

        <div
          onDragOver={(e) => {
            if (draggingTabId === null) return;
            e.preventDefault();
            e.dataTransfer!.dropEffect = "move";
            setIsNewWindowTarget(true);
          }}
          onDragLeave={() => setIsNewWindowTarget(false)}
          onDrop={async (e) => {
            e.preventDefault();
            await handleDropNewWindow();
          }}
          class={`flex items-center justify-center min-h-[120px] rounded-lg border-2 border-dashed text-[12px] font-medium transition-all ${
            isNewWindowTarget
              ? "border-accent bg-accent-subtle text-accent"
              : draggingTabId !== null
                ? "border-border-strong text-fg-muted"
                : "border-border text-fg-subtle"
          }`}
        >
          <div class="text-center">
            <Plus
              size={20}
              weight="regular"
              class="mx-auto mb-1"
            />
            <div>Drop here for new window</div>
          </div>
        </div>
      </div>
    </div>
  );
}
