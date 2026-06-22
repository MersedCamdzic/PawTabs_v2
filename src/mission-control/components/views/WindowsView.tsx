import { useState, useEffect, useMemo, useCallback } from "preact/hooks";
import { Plus, Trash, ArrowSquareOut, MagnifyingGlass } from "@phosphor-icons/react";
import {
  getWindowsWithPawTabs,
  getWindowTitle,
  setWindowTitle,
  type WindowWithPawTabs,
} from "@/lib/windows";
import { WindowCard } from "../WindowCard";

interface Props {
  query: string;
  onAction: () => void;
}

interface SelectionState {
  sourceWindowId: number;
  selectedIds: Set<number>;
}

export function WindowsView({ query, onAction }: Props) {
  const [windows, setWindows] = useState<WindowWithPawTabs[]>([]);
  const [selection, setSelection] = useState<SelectionState | null>(null);

  const refresh = useCallback(async () => {
    setWindows(await getWindowsWithPawTabs());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    let pending = false;
    const scheduleRefresh = () => {
      if (pending) return;
      pending = true;
      queueMicrotask(async () => {
        try {
          await refresh();
        } finally {
          pending = false;
        }
      });
    };

    const onSimpleEvent = () => scheduleRefresh();
    const onTabUpdated = (
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
        scheduleRefresh();
      }
    };

    chrome.tabs.onCreated.addListener(onSimpleEvent);
    chrome.tabs.onRemoved.addListener(onSimpleEvent);
    chrome.tabs.onAttached.addListener(onSimpleEvent);
    chrome.tabs.onDetached.addListener(onSimpleEvent);
    chrome.tabs.onUpdated.addListener(onTabUpdated);
    chrome.windows.onCreated.addListener(onSimpleEvent);
    chrome.windows.onRemoved.addListener(onSimpleEvent);
    chrome.windows.onFocusChanged.addListener(onSimpleEvent);
    return () => {
      chrome.tabs.onCreated.removeListener(onSimpleEvent);
      chrome.tabs.onRemoved.removeListener(onSimpleEvent);
      chrome.tabs.onAttached.removeListener(onSimpleEvent);
      chrome.tabs.onDetached.removeListener(onSimpleEvent);
      chrome.tabs.onUpdated.removeListener(onTabUpdated);
      chrome.windows.onCreated.removeListener(onSimpleEvent);
      chrome.windows.onRemoved.removeListener(onSimpleEvent);
      chrome.windows.onFocusChanged.removeListener(onSimpleEvent);
    };
  }, [refresh]);

  useEffect(() => {
    if (selection === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelection(null);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [selection]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return windows;
    return windows
      .map((w) => ({
        ...w,
        tabs: w.tabs.filter(
          (t) =>
            t.title.toLowerCase().includes(q) ||
            t.url.toLowerCase().includes(q),
        ),
      }))
      .filter(
        (w) =>
          (w.customTitle ?? "").toLowerCase().includes(q) || w.tabs.length > 0,
      );
  }, [windows, query]);

  const matchingTabIds = useMemo(() => {
    if (!query.trim()) return [];
    return filtered.flatMap((w) => w.tabs.map((t) => t.id));
  }, [filtered, query]);

  const handleCloseAllMatching = async () => {
    if (matchingTabIds.length === 0) return;
    if (
      !confirm(
        `Close ${matchingTabIds.length} tab${matchingTabIds.length === 1 ? "" : "s"} matching "${query}"?`,
      )
    )
      return;
    await chrome.tabs.remove(matchingTabIds);
    onAction();
    await refresh();
  };

  const handleMoveAllMatchingToNewWindow = async () => {
    if (matchingTabIds.length === 0) return;
    const [first, ...rest] = matchingTabIds;
    if (first === undefined) return;
    const win = await chrome.windows.create({
      tabId: first,
      focused: false,
    });
    if (rest.length > 0 && win?.id !== undefined) {
      await chrome.tabs.move(rest, { windowId: win.id, index: -1 });
    }
    onAction();
    await refresh();
  };

  const sourceWindow = useMemo(() => {
    if (!selection) return null;
    return windows.find((w) => w.id === selection.sourceWindowId) ?? null;
  }, [windows, selection]);

  const handleStartSelection = (windowId: number) => {
    setSelection({ sourceWindowId: windowId, selectedIds: new Set() });
  };

  const handleStartMergeAll = (windowId: number) => {
    const w = windows.find((x) => x.id === windowId);
    if (!w) return;
    const allIds = new Set(
      w.tabs.map((t) => t.id).filter((id): id is number => id !== undefined),
    );
    setSelection({ sourceWindowId: windowId, selectedIds: allIds });
  };

  const handleStartMoveSingle = (windowId: number, tabId: number) => {
    setSelection({
      sourceWindowId: windowId,
      selectedIds: new Set([tabId]),
    });
  };

  const handleToggleTab = (tabId: number) => {
    if (!selection) return;
    const next = new Set(selection.selectedIds);
    if (next.has(tabId)) next.delete(tabId);
    else next.add(tabId);
    setSelection({ ...selection, selectedIds: next });
  };

  const handleSelectAll = () => {
    if (!selection || !sourceWindow) return;
    const allIds = new Set(
      sourceWindow.tabs
        .map((t) => t.id)
        .filter((id): id is number => id !== undefined),
    );
    if (selection.selectedIds.size === allIds.size) {
      setSelection({ ...selection, selectedIds: new Set() });
    } else {
      setSelection({ ...selection, selectedIds: allIds });
    }
  };

  const handlePickDestination = async (targetWindowId: number) => {
    if (!selection || selection.selectedIds.size === 0) return;
    try {
      await chrome.tabs.move(Array.from(selection.selectedIds), {
        windowId: targetWindowId,
        index: -1,
      });
      onAction();
      await refresh();
    } finally {
      setSelection(null);
    }
  };

  const handlePickNewWindow = async () => {
    if (!selection || selection.selectedIds.size === 0) return;
    try {
      const ids = Array.from(selection.selectedIds);
      const [first, ...rest] = ids;
      if (first === undefined) return;
      const win = await chrome.windows.create({ tabId: first, focused: false });
      if (rest.length > 0 && win?.id !== undefined) {
        await chrome.tabs.move(rest, { windowId: win.id, index: -1 });
      }
      onAction();
      await refresh();
    } finally {
      setSelection(null);
    }
  };

  const handleSplit = async (windowId: number, chunkSize: number) => {
    const sourceTitle = await getWindowTitle(windowId);
    const tabs = await chrome.tabs.query({ windowId });
    const sorted = tabs.filter((t) => t.id !== undefined);
    if (sorted.length <= chunkSize) return;

    let chunkIndex = 2;
    for (let i = chunkSize; i < sorted.length; i += chunkSize) {
      const chunk = sorted.slice(i, i + chunkSize);
      const firstId = chunk[0]?.id;
      if (firstId === undefined) continue;
      const newWindow = await chrome.windows.create({
        tabId: firstId,
        focused: false,
      });
      const targetId = newWindow?.id;
      if (targetId === undefined) continue;
      const restIds = chunk
        .slice(1)
        .map((t) => t.id)
        .filter((id): id is number => id !== undefined);
      if (restIds.length > 0) {
        await chrome.tabs.move(restIds, { windowId: targetId, index: -1 });
      }
      if (sourceTitle) {
        await setWindowTitle(targetId, `${sourceTitle}_${chunkIndex}`);
      }
      chunkIndex += 1;
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

  const handleCloseWindow = async (windowId: number) => {
    await chrome.windows.remove(windowId);
    onAction();
    await refresh();
  };

  return (
    <div class="px-6 py-4">
      {query.trim() && matchingTabIds.length > 0 && selection === null && (
        <div class="mb-3 flex items-center justify-between gap-3 px-3 py-2 bg-surface border border-border rounded-md">
          <div class="flex items-center gap-2 text-[12px] text-fg-muted">
            <MagnifyingGlass size={12} class="text-accent" />
            <span>
              <span class="text-fg font-semibold">
                {matchingTabIds.length} tab
                {matchingTabIds.length === 1 ? "" : "s"}
              </span>{" "}
              match{" "}
              <span class="font-mono text-fg">"{query}"</span>
            </span>
          </div>
          <div class="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleMoveAllMatchingToNewWindow}
              data-tooltip="Move all matching tabs to a new window"
              data-tooltip-pos="below"
              class="h-7 px-2.5 inline-flex items-center gap-1.5 text-[11px] font-medium rounded bg-bg border border-border text-fg-muted hover:border-accent hover:text-accent hover:bg-accent-subtle transition-colors"
            >
              <ArrowSquareOut size={11} />
              Move to new window
            </button>
            <button
              type="button"
              onClick={handleCloseAllMatching}
              data-tooltip="Close every matching tab"
              data-tooltip-pos="below"
              class="h-7 px-2.5 inline-flex items-center gap-1.5 text-[11px] font-medium rounded bg-bg border border-border text-fg-muted hover:border-danger hover:text-danger hover:bg-danger-subtle transition-colors"
            >
              <Trash size={11} />
              Close all
            </button>
          </div>
        </div>
      )}

      {selection !== null && (
        <div class="mb-3 flex items-center justify-between gap-3 text-[11px] text-accent bg-accent-subtle border border-accent/30 rounded-md px-3 py-2">
          <span>
            {selection.selectedIds.size === 0
              ? `Select tabs in ${sourceWindow?.customTitle ?? `Window ${selection.sourceWindowId}`}, then click any destination card.`
              : `${selection.selectedIds.size} tab${selection.selectedIds.size === 1 ? "" : "s"} ready — click a destination card to move ${selection.selectedIds.size === 1 ? "it" : "them"}.`}{" "}
            <kbd class="font-mono px-1 bg-bg-elevated rounded border border-accent/30">
              Esc
            </kbd>{" "}
            cancels.
          </span>
          <button
            type="button"
            onClick={() => setSelection(null)}
            class="font-medium hover:underline shrink-0"
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
            isSelectionSource={selection?.sourceWindowId === w.id}
            isMoveTarget={
              selection !== null && w.id !== selection.sourceWindowId
            }
            selectedIds={selection?.selectedIds ?? new Set()}
            onStartSelection={handleStartSelection}
            onStartMergeAll={handleStartMergeAll}
            onStartMoveSingle={handleStartMoveSingle}
            onToggleTab={handleToggleTab}
            onSelectAll={handleSelectAll}
            onPickDestination={handlePickDestination}
            onCancel={() => setSelection(null)}
            onSplit={handleSplit}
            onCloseNonPinned={handleCloseNonPinned}
            onCloseWindow={handleCloseWindow}
            onAction={onAction}
            onReload={refresh}
          />
        ))}

        <button
          type="button"
          onClick={handlePickNewWindow}
          disabled={selection === null || selection.selectedIds.size === 0}
          class={`flex items-center justify-center min-h-[120px] rounded-lg border-2 border-dashed text-[12px] font-medium transition-all ${
            selection !== null && selection.selectedIds.size > 0
              ? "border-accent text-accent hover:bg-accent-subtle cursor-pointer"
              : "border-border text-fg-subtle cursor-not-allowed"
          }`}
        >
          <div class="text-center">
            <Plus size={20} weight="regular" class="mx-auto mb-1" />
            <div>
              {selection !== null && selection.selectedIds.size > 0
                ? `Click to move ${selection.selectedIds.size} to new window`
                : "Move tabs here to create a new window"}
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
