import {
  PushPin,
  SpeakerHigh,
  SpeakerSlash,
  PawPrint,
  X,
  Globe,
  Tag,
  NotePencil,
  Moon,
  ArrowSquareOut,
  ArrowsLeftRight,
  Browsers,
} from "@phosphor-icons/react";
import {
  focusTab,
  closeTab,
  togglePinned,
  toggleMuted,
  toggleStarred,
} from "@/lib/chrome";
import { getRootDomain } from "@/lib/utils";
import type { PawTab } from "@/types";

interface Props {
  tab: PawTab;
  windowTitle?: string;
  onAction: () => void;
  onOpenDetails: (tab: PawTab) => void;
}

export function MCTabRow({ tab, windowTitle, onAction, onOpenDetails }: Props) {
  const domain = getRootDomain(tab.url);

  const handleRowClick = () => onOpenDetails(tab);

  const stop = (e: Event) => e.stopPropagation();

  const handlePaw = async (e: MouseEvent) => {
    stop(e);
    await toggleStarred(tab.id);
    onAction();
  };
  const handlePin = async (e: MouseEvent) => {
    stop(e);
    await togglePinned(tab.id, !tab.pinned);
    onAction();
  };
  const handleMute = async (e: MouseEvent) => {
    stop(e);
    await toggleMuted(tab.id, !tab.muted);
    onAction();
  };
  const handleClose = async (e: MouseEvent) => {
    stop(e);
    await closeTab(tab.id);
    onAction();
  };

  const handleJump = async (e: MouseEvent) => {
    stop(e);
    await focusTab(tab.id, tab.windowId);
  };

  const handleMove = (e: MouseEvent) => {
    stop(e);
    onOpenDetails(tab);
  };

  return (
    <div
      onClick={handleRowClick}
      class="group flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-surface cursor-pointer transition-colors"
    >
      <Favicon url={tab.favIconUrl} />

      <div class="flex-1 min-w-0">
        <div class="text-[13px] text-fg truncate leading-tight">
          {tab.title || domain || "Untitled"}
        </div>
        <div class="text-[11px] text-fg-subtle truncate leading-tight mt-0.5 flex items-center gap-2">
          {windowTitle && (
            <span class="inline-flex items-center gap-1 text-accent font-medium shrink-0">
              <Browsers size={10} weight="fill" />
              {windowTitle}
            </span>
          )}
          <span class="truncate">{domain || tab.url}</span>
          {tab.tags.length > 0 && (
            <span class="inline-flex items-center gap-0.5 text-accent shrink-0">
              <Tag size={10} weight="fill" />
              {tab.tags.length}
            </span>
          )}
          {tab.notes.length > 0 && (
            <span class="inline-flex items-center gap-0.5 text-accent shrink-0">
              <NotePencil size={10} weight="fill" />
              {tab.notes.length}
            </span>
          )}
          {tab.discarded && (
            <span class="inline-flex items-center gap-1 text-fg-subtle shrink-0">
              <Moon size={10} />
              inactive
            </span>
          )}
        </div>
      </div>

      <div class="flex items-center gap-0.5 shrink-0">
        <ActionBtn
          title={tab.starred ? "Unpaw" : "Paw"}
          active={tab.starred}
          tone="accent"
          onClick={handlePaw}
        >
          <PawPrint size={13} weight={tab.starred ? "fill" : "regular"} />
        </ActionBtn>
        <ActionBtn
          title={tab.pinned ? "Unpin" : "Pin"}
          active={tab.pinned}
          tone="warning"
          onClick={handlePin}
        >
          <PushPin size={13} weight={tab.pinned ? "fill" : "regular"} />
        </ActionBtn>
        {(tab.audible || tab.muted) && (
          <ActionBtn
            title={tab.muted ? "Unmute" : "Mute"}
            active={tab.muted || tab.audible}
            tone={tab.muted ? "danger" : "success"}
            forceVisible
            onClick={handleMute}
          >
            {tab.muted ? (
              <SpeakerSlash size={13} />
            ) : (
              <SpeakerHigh size={13} />
            )}
          </ActionBtn>
        )}
        <ActionBtn
          title="Move to another window"
          active={false}
          tone="accent"
          onClick={handleMove}
        >
          <ArrowsLeftRight size={13} weight="bold" />
        </ActionBtn>
        <ActionBtn
          title="Jump to tab"
          active={false}
          tone="accent"
          onClick={handleJump}
        >
          <ArrowSquareOut size={13} />
        </ActionBtn>
        <span
          class="w-px h-4 mx-1 bg-border opacity-0 group-hover:opacity-100 transition-opacity"
          aria-hidden="true"
        />
        <button
          type="button"
          onClick={handleClose}
          aria-label="Close tab"
          data-tooltip="Close tab"
          data-tooltip-pos="above"
          class="size-7 inline-flex items-center justify-center rounded text-fg-subtle opacity-0 group-hover:opacity-100 hover:bg-danger-subtle hover:text-danger transition-all"
        >
          <X size={13} />
        </button>
      </div>
    </div>
  );
}

function Favicon({ url }: { url: string }) {
  if (!url) {
    return (
      <div class="size-5 shrink-0 inline-flex items-center justify-center text-fg-subtle">
        <Globe size={16} />
      </div>
    );
  }
  return (
    <img
      src={url}
      alt=""
      class="size-5 shrink-0 rounded"
      onError={(e) => {
        (e.currentTarget as HTMLImageElement).style.display = "none";
      }}
    />
  );
}

const TONE_ACTIVE = {
  accent: "text-accent",
  warning: "text-warning",
  success: "text-success",
  danger: "text-danger",
} as const;
const TONE_HOVER_BG = {
  accent: "hover:bg-accent-subtle",
  warning: "hover:bg-warning-subtle",
  success: "hover:bg-success-subtle",
  danger: "hover:bg-danger-subtle",
} as const;
const TONE_HOVER_FG = {
  accent: "hover:text-accent",
  warning: "hover:text-warning",
  success: "hover:text-success",
  danger: "hover:text-danger",
} as const;

function ActionBtn(props: {
  title: string;
  active: boolean;
  tone: keyof typeof TONE_ACTIVE;
  forceVisible?: boolean;
  onClick: (e: MouseEvent) => void;
  children: preact.ComponentChildren;
}) {
  const activeClass = props.active ? TONE_ACTIVE[props.tone] : "text-fg-subtle";
  const visibility =
    props.active || props.forceVisible
      ? "opacity-100"
      : "opacity-0 group-hover:opacity-100";
  return (
    <button
      type="button"
      onClick={props.onClick}
      data-tooltip={props.title}
      data-tooltip-pos="above"
      aria-label={props.title}
      class={`size-7 inline-flex items-center justify-center rounded ${activeClass} ${visibility} ${TONE_HOVER_BG[props.tone]} ${TONE_HOVER_FG[props.tone]} transition-all`}
    >
      {props.children}
    </button>
  );
}
