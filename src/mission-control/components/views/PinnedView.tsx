import { useMemo } from "preact/hooks";
import {
  Globe,
  ArrowSquareOut,
  X,
  Trash,
  PawPrint,
  PushPin,
  Broadcast,
  Moon,
  Browsers,
} from "@phosphor-icons/react";
import { focusTab, closeTab, togglePinned } from "@/lib/chrome";
import { getRootDomain } from "@/lib/utils";
import { WINDOW_COLOR_STYLES } from "@/lib/window-colors";
import type { PawTab, WindowColor } from "@/types";

interface Props {
  tabs: PawTab[];
  emptyText: string;
  windowMeta: Record<number, { title?: string; color?: WindowColor }>;
  columns: 1 | 2 | 3 | 4;
  onAction: () => void;
  onOpenDetails: (tab: PawTab) => void;
}

const COLUMN_LAYOUT: Record<1 | 2 | 3 | 4, string> = {
  1: "space-y-0.5",
  2: "grid grid-cols-1 md:grid-cols-2 gap-1",
  3: "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-1",
  4: "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-1",
};

export function PinnedView({
  tabs,
  emptyText,
  windowMeta,
  columns,
  onAction,
  onOpenDetails,
}: Props) {
  const rows = useMemo(() => tabs, [tabs]);

  if (rows.length === 0) {
    return (
      <div class="px-8 py-16 text-center text-fg-subtle text-[13px]">
        {emptyText}
      </div>
    );
  }

  return (
    <div class="px-6 py-3">
      <div class={COLUMN_LAYOUT[columns]}>
        {rows.map((tab) => {
          const wm = windowMeta[tab.windowId];
          return (
            <PinnedRow
              key={tab.id}
              tab={tab}
              windowName={wm?.title ?? null}
              windowColor={wm?.color ?? null}
              onOpen={() => onOpenDetails(tab)}
              onJump={async () => {
                await focusTab(tab.id, tab.windowId);
              }}
              onUnpin={async () => {
                await togglePinned(tab.id, false);
                onAction();
              }}
              onCloseTab={async () => {
                await closeTab(tab.id);
                onAction();
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

function PinnedRow(props: {
  tab: PawTab;
  windowName: string | null;
  windowColor: WindowColor | null;
  onOpen: () => void;
  onJump: () => void;
  onUnpin: () => void;
  onCloseTab: () => void;
}) {
  const { tab, windowName, windowColor } = props;
  const domain = getRootDomain(tab.url);
  const isInactive = tab.discarded;
  const windowColorStyle = windowColor ? WINDOW_COLOR_STYLES[windowColor] : null;

  const stateIcon = isInactive ? (
    <span
      title="Inactive — tab discarded from memory"
      class="shrink-0 inline-flex mt-1 text-fg-subtle"
    >
      <Moon size={12} weight="fill" />
    </span>
  ) : (
    <span
      title="Active — tab is loaded and ready"
      class="shrink-0 inline-flex mt-1 text-success"
    >
      <Broadcast size={12} weight="bold" />
    </span>
  );

  return (
    <div
      onClick={props.onOpen}
      class="group flex items-start gap-3 px-3 py-2.5 rounded-md hover:bg-surface cursor-pointer transition-colors"
    >
      {tab.favIconUrl ? (
        <img
          src={tab.favIconUrl}
          alt=""
          class={`size-5 shrink-0 rounded mt-0.5 ${isInactive ? "grayscale opacity-70" : ""}`}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      ) : (
        <Globe
          size={16}
          class={`text-fg-subtle shrink-0 mt-0.5 ${isInactive ? "opacity-70" : ""}`}
        />
      )}
      <div class="flex-1 min-w-0">
        <div
          class={`flex items-start gap-1.5 text-[13px] leading-snug line-clamp-2 ${
            isInactive ? "text-fg-muted italic" : "text-fg"
          }`}
        >
          {stateIcon}
          {tab.starred && (
            <span
              title="Pawed"
              class="shrink-0 inline-flex mt-1 text-accent"
            >
              <PawPrint size={12} weight="fill" />
            </span>
          )}
          <span
            title="Pinned"
            class="shrink-0 inline-flex mt-1 text-warning"
          >
            <PushPin size={12} weight="fill" />
          </span>
          <span class="min-w-0">{tab.title || domain}</span>
        </div>
        <div class="text-[11px] text-fg-subtle leading-tight mt-1 break-all line-clamp-2">
          {tab.url}
        </div>
        {(windowName || tab.windowId) && (
          <div class="flex flex-wrap items-center gap-1 mt-2">
            {windowName ? (
              <span
                class={`inline-flex items-center gap-1 h-5 px-1.5 rounded text-[10px] font-medium ${
                  windowColorStyle ? windowColorStyle.headerBg : "bg-surface"
                } ${
                  windowColorStyle
                    ? windowColorStyle.titleText
                    : "text-fg-muted"
                }`}
              >
                <Browsers
                  size={9}
                  weight="fill"
                  class={
                    windowColorStyle
                      ? windowColorStyle.iconText
                      : "text-fg-subtle"
                  }
                />
                {windowName}
              </span>
            ) : (
              <span class="inline-flex items-center gap-1 h-5 px-1.5 rounded text-[10px] font-medium bg-surface text-fg-muted">
                <Browsers size={9} weight="fill" class="text-fg-subtle" />
                Window {tab.windowId}
              </span>
            )}
          </div>
        )}
      </div>
      <div class="flex items-center gap-0.5 shrink-0">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            props.onJump();
          }}
          aria-label="Jump to this tab"
          data-tooltip="Jump to this tab"
          data-tooltip-pos="above"
          class="size-8 inline-flex items-center justify-center rounded text-fg-muted opacity-0 group-hover:opacity-100 hover:bg-accent-subtle hover:text-accent transition-all"
        >
          <ArrowSquareOut size={13} />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            props.onUnpin();
          }}
          aria-label="Unpin this tab"
          data-tooltip="Unpin this tab"
          data-tooltip-pos="above"
          class="size-8 inline-flex items-center justify-center rounded text-fg-muted opacity-0 group-hover:opacity-100 hover:bg-warning-subtle hover:text-warning transition-all"
        >
          <Trash size={13} />
        </button>
        <span
          class="w-px h-4 mx-1 bg-border opacity-0 group-hover:opacity-100 transition-opacity"
          aria-hidden="true"
        />
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            props.onCloseTab();
          }}
          aria-label="Close this tab"
          data-tooltip="Close this tab"
          data-tooltip-pos="above"
          class="size-8 inline-flex items-center justify-center rounded text-fg-muted opacity-0 group-hover:opacity-100 hover:bg-danger-subtle hover:text-danger transition-all"
        >
          <X size={13} />
        </button>
      </div>
    </div>
  );
}
