import {
  PushPin,
  SpeakerHigh,
  SpeakerSlash,
  Moon,
  PawPrint,
  X,
  Globe,
  Tag,
  NotePencil,
  Info,
  Broadcast,
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
  isCurrent?: boolean;
  onAction: () => void;
  onOpenDetails: (tab: PawTab) => void;
  selected: boolean;
  selectionMode: boolean;
  onToggleSelect: (tabId: number, event: MouseEvent) => void;
}

export function TabRow({
  tab,
  isCurrent = false,
  onAction,
  onOpenDetails,
  selected,
  selectionMode,
  onToggleSelect,
}: Props) {
  const domain = getRootDomain(tab.url);

  const handleRowClick = async (e: MouseEvent) => {
    if (e.shiftKey || e.metaKey || e.ctrlKey || selectionMode) {
      onToggleSelect(tab.id, e);
      return;
    }
    if (isCurrent) {
      onOpenDetails(tab);
    } else {
      await focusTab(tab.id, tab.windowId);
      window.close();
    }
  };

  const handleOpenDetails = (e: MouseEvent) => {
    stop(e);
    onOpenDetails(tab);
  };

  const stop = (e: Event) => {
    e.stopPropagation();
  };

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

  const handleCheckboxClick = (e: MouseEvent) => {
    e.stopPropagation();
    onToggleSelect(tab.id, e);
  };

  const rowClass = selected
    ? "bg-accent-subtle/60 hover:bg-accent-subtle"
    : "hover:bg-surface focus:bg-surface";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleRowClick}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          handleRowClick(e as unknown as MouseEvent);
        }
      }}
      class={`group flex items-center gap-2.5 pl-2 pr-1.5 py-1.5 rounded-md focus:outline-none cursor-pointer transition-colors ${rowClass}`}
    >
      <button
        type="button"
        onClick={handleCheckboxClick}
        aria-label={selected ? "Deselect tab" : "Select tab"}
        title="Select"
        class={`size-4 rounded border shrink-0 inline-flex items-center justify-center transition-all ${
          selected
            ? "bg-accent border-accent text-white opacity-100"
            : selectionMode
              ? "border-border-strong opacity-100 hover:border-accent"
              : "border-border opacity-0 group-hover:opacity-100 hover:border-accent"
        }`}
      >
        {selected && (
          <svg viewBox="0 0 16 16" class="size-3" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M3 8.5L6.5 12L13 4" />
          </svg>
        )}
      </button>

      <Favicon url={tab.favIconUrl} />

      <div class="flex-1 min-w-0">
        <div class="text-[13px] text-fg truncate leading-tight flex items-center gap-1.5">
          {tab.discarded ? (
            <span
              title="Inactive — tab discarded from memory, will reload on focus"
              class="shrink-0 inline-flex text-fg-subtle"
            >
              <Moon size={11} weight="fill" />
            </span>
          ) : (
            <span
              title="Active — tab is loaded and ready"
              class="shrink-0 inline-flex text-success"
            >
              <Broadcast size={11} weight="bold" />
            </span>
          )}
          <span class="truncate">{tab.title || domain || "Untitled"}</span>
        </div>
        <div class="text-[11px] text-fg-subtle truncate leading-tight mt-0.5 flex items-center gap-1.5">
          <span class="truncate">{domain}</span>
          {tab.tags.length > 0 && (
            <span
              title={tab.tags.join(", ")}
              class="inline-flex items-center gap-0.5 text-purple-600 shrink-0"
            >
              <Tag size={10} weight="fill" />
              {tab.tags.length}
            </span>
          )}
          {tab.notes.length > 0 && (
            <span
              title={`${tab.notes.length} note${tab.notes.length === 1 ? "" : "s"}`}
              class="inline-flex items-center gap-0.5 text-cyan-600 shrink-0"
            >
              <NotePencil size={10} weight="fill" />
              {tab.notes.length}
            </span>
          )}
        </div>
      </div>

      <div class="flex items-center gap-0.5 shrink-0">
        <ActionButton
          title={tab.starred ? "Unpaw this tab" : "Paw this tab"}
          active={tab.starred}
          tone="accent"
          onClick={handlePaw}
        >
          <PawPrint size={13} weight={tab.starred ? "fill" : "regular"} />
        </ActionButton>

        <ActionButton
          title={tab.pinned ? "Unpin this tab" : "Pin this tab"}
          active={tab.pinned}
          tone="warning"
          onClick={handlePin}
        >
          <PushPin size={13} weight={tab.pinned ? "fill" : "regular"} />
        </ActionButton>

        {(() => {
          const hasAudio = tab.audible || tab.muted;
          const disabled = !hasAudio;
          const title = disabled
            ? "No audio playing"
            : tab.muted
              ? "Unmute this tab"
              : "Mute this tab";
          return (
            <ActionButton
              title={title}
              active={hasAudio}
              tone={tab.muted ? "danger" : "success"}
              forceVisible={hasAudio}
              disabled={disabled}
              onClick={handleMute}
            >
              {tab.muted ? (
                <SpeakerSlash size={13} />
              ) : (
                <SpeakerHigh size={13} />
              )}
            </ActionButton>
          );
        })()}

        <button
          type="button"
          onClick={handleOpenDetails}
          aria-label="Open tab details"
          data-tooltip="Open tab details"
          data-tooltip-pos="above"
          class="size-6 inline-flex items-center justify-center rounded text-fg-subtle opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 hover:bg-accent-subtle hover:text-accent transition-all"
        >
          <Info size={13} />
        </button>

        <span
          class="w-px h-4 mx-1.5 bg-border opacity-0 group-hover:opacity-100 transition-opacity"
          aria-hidden="true"
        />

        <button
          type="button"
          onClick={handleClose}
          aria-label="Close this tab"
          data-tooltip="Close this tab"
          data-tooltip-pos="left"
          class="size-6 inline-flex items-center justify-center rounded text-fg-subtle opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 hover:bg-danger-subtle hover:text-danger transition-all"
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
      <div class="size-4 shrink-0 inline-flex items-center justify-center text-fg-subtle">
        <Globe size={14} />
      </div>
    );
  }
  return (
    <img
      src={url}
      alt=""
      class="size-4 shrink-0 rounded-sm"
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

interface ActionButtonProps {
  title: string;
  active: boolean;
  tone: keyof typeof TONE_ACTIVE;
  forceVisible?: boolean;
  disabled?: boolean;
  onClick: (e: MouseEvent) => void;
  children: preact.ComponentChildren;
}

function ActionButton(props: ActionButtonProps) {
  const activeClass = props.disabled
    ? "text-fg-subtle/40 cursor-not-allowed"
    : props.active
      ? TONE_ACTIVE[props.tone]
      : "text-fg-subtle";
  const visibility =
    props.active || props.forceVisible
      ? "opacity-100"
      : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100";
  const hover = props.disabled
    ? ""
    : `${TONE_HOVER_BG[props.tone]} ${TONE_HOVER_FG[props.tone]}`;

  return (
    <button
      type="button"
      onClick={props.disabled ? undefined : props.onClick}
      disabled={props.disabled}
      aria-label={props.title}
      data-tooltip={props.title}
      data-tooltip-pos="above"
      class={`size-6 inline-flex items-center justify-center rounded ${activeClass} ${visibility} ${hover} transition-all`}
    >
      {props.children}
    </button>
  );
}
