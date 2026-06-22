import { useState, useEffect, useMemo, useCallback } from "preact/hooks";
import { Plus } from "@phosphor-icons/react";
import { getWindowsWithMeta, type WindowWithMeta } from "@/lib/windows";
import { WindowCard } from "../WindowCard";

interface Props {
  query: string;
  onAction: () => void;
}

interface MoveState {
  type: "tab" | "merge";
  tabIds: number[];
  sourceWindowId: number;
}

export function WindowsView({ query, onAction }: Props) {
  const [windows, setWindows] = useState<WindowWithMeta[]>([]);
  const [move, setMove] = useState<MoveState | null>(null);

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
    if (move === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMove(null);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [move]);

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

  const handleStartMoveTab = (tabId: number) => {
    const sourceWindow = windows.find((w) =>
      w.tabs.some((t) => t.id === tabId),
    );
    if (!sourceWindow) return;
    setMove({ type: "tab", tabIds: [tabId], sourceWindowId: sourceWindow.id });
  };

  const handleStartMergeWindow = (tabIds: number[], sourceWindowId: number) => {
    setMove({ type: "merge", tabIds, sourceWindowId });
  };

  const handlePickTarget = async (targetWindowId: number) => {
    if (!move) return;
    try {
      await chrome.tabs.move(move.tabIds, {
        windowId: targetWindowId,
        index: -1,
      });
      onAction();
      await refresh();
    } finally {
      setMove(null);
    }
  };

  const handlePickNewWindow = async () => {
    if (!move) return;
    try {
      const [first, ...rest] = move.tabIds;
      if (first === undefined) return;
      const win = await chrome.windows.create({ tabId: first });
      if (rest.length > 0 && win?.id !== undefined) {
        await chrome.tabs.move(rest, { windowId: win.id, index: -1 });
      }
      onAction();
      await refresh();
    } finally {
      setMove(null);
    }
  };

  const handleSplit = async (windowId: number, chunkSize: number) => {
    const tabs = await chrome.tabs.query({ windowId });
    const sorted = tabs.filter((t) => t.id !== undefined);
    if (sorted.length <= chunkSize) return;

    for (let i = chunkSize; i < sorted.length; i += chunkSize) {
      const chunk = sorted.slice(i, i + chunkSize);
      const firstId = chunk[0]?.id;
      if (firstId === undefined) continue;
      const newWindow = await chrome.windows.create({ tabId: firstId });
      const targetId = newWindow?.id;
      if (targetId === undefined) continue;
      const restIds = chunk
        .slice(1)
        .map((t) => t.id)
        .filter((id): id is number => id !== undefined);
      if (restIds.length > 0) {
        await chrome.tabs.move(restIds, { windowId: targetId, index: -1 });
      }
    }
    onAction();
    await refresh();
  };

  const handleCloseNonPinned = async (windowId: number) => {
    const tabs = await chrome.tabs.query({ windowId });
    const ids = tabs
      .filter((t) => !t.pinned && t.id !== undefined)
      .map((t) => t.id!);
    if (ids.length === 0) return;
    await chrome.tabs.remove(ids);
    onAction();
    await refresh();
  };

  const moveLabel =
    move?.type === "merge"
      ? `Merging ${move.tabIds.length} tab${move.tabIds.length === 1 ? "" : "s"} into another window`
      : "Moving 1 tab";

  return (
    <div class="px-6 py-4">
      {move !== null && (
        <div class="mb-3 flex items-center justify-between gap-3 text-[11px] text-accent bg-accent-subtle border border-accent/30 rounded-md px-3 py-2">
          <span>
            {moveLabel} — click any highlighted card to pick a destination.
            Press{" "}
            <kbd class="font-mono px-1 bg-bg-elevated rounded border border-accent/30">
              Esc
            </kbd>{" "}
            to cancel.
          </span>
          <button
            type="button"
            onClick={() => setMove(null)}
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
            movingTabIds={move?.tabIds ?? null}
            isMoveTarget={
              move !== null && w.id !== move.sourceWindowId
            }
            onStartMoveTab={handleStartMoveTab}
            onStartMergeWindow={handleStartMergeWindow}
            onCancelMove={() => setMove(null)}
            onPickTarget={handlePickTarget}
            onSplit={handleSplit}
            onCloseNonPinned={handleCloseNonPinned}
            onReload={refresh}
          />
        ))}

        <button
          type="button"
          onClick={handlePickNewWindow}
          disabled={move === null}
          class={`flex items-center justify-center min-h-[120px] rounded-lg border-2 border-dashed text-[12px] font-medium transition-all ${
            move !== null
              ? "border-accent text-accent hover:bg-accent-subtle cursor-pointer"
              : "border-border text-fg-subtle cursor-not-allowed"
          }`}
        >
          <div class="text-center">
            <Plus size={20} weight="regular" class="mx-auto mb-1" />
            <div>
              {move !== null
                ? "Click to move to new window"
                : "Move tabs here to create a new window"}
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
