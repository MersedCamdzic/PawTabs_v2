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
  Lightning,
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
  wakeTab,
} from "@/lib/chrome";
import { getRootDomain } from "@/lib/utils";
import type { PawTab } from "@/types";

interface Props {
  tab: PawTab;
  windowTitle?: string;
  onAction: () => void;
  onOpenDetails: (tab: PawTab) => void;
}

function notesTooltip(notes: { text: string }[]): string {
  if (notes.length === 0) return "";
  const first = notes[0]!.text.slice(0, 100);
  const truncated = notes[0]!.text.length > 100 ? "…" : "";
  if (notes.length === 1) return `"${first}${truncated}"`;
  return `"${first}${truncated}"  (+${notes.length - 1} more — click row to view all)`;
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

  const handleWake = async (e: MouseEvent) => {
    stop(e);
    await wakeTab(tab.id);
    onAction();
  };

  const rowClass = tab.discarded
    ? "opacity-60 hover:opacity-100 hover:bg-surface bg-surface/30"
    : "hover:bg-surface";

  return (
    <div
      onClick={handleRowClick}
      class={`group flex items-start gap-3 px-3 py-2.5 rounded-md cursor-pointer transition-all ${rowClass}`}
    >
      <Favicon url={tab.favIconUrl} discarded={tab.discarded} />

      <div class="flex-1 min-w-0">
        <div
          class={`text-[13px] leading-snug flex flex-wrap items-baseline gap-x-2 gap-y-0.5 ${
            tab.discarded ? "italic text-fg-muted" : "text-fg"
          }`}
        >
          {tab.discarded && (
            <Moon
              size={11}
              weight="fill"
              class="text-fg-subtle shrink-0 relative top-[2px]"
            />
          )}
          <span class="break-words line-clamp-2">
            {tab.title || domain || "Untitled"}
          </span>
          {windowTitle && (
            <span class="inline-flex items-center gap-1 px-1.5 py-0.5 bg-accent-subtle text-accent text-[10px] font-medium rounded shrink-0 relative top-[-1px] not-italic">
              <Browsers size={9} weight="fill" />
              {windowTitle}
            </span>
          )}
        </div>
        <div class="text-[11px] text-fg-subtle leading-tight mt-1 break-all line-clamp-2">
          {tab.url}
        </div>
        {tab.notes.length > 0 && (
          <div class="text-[11px] text-fg-subtle mt-1 flex items-center gap-2 flex-wrap">
            <span
              data-tooltip={notesTooltip(tab.notes)}
              data-tooltip-pos="above"
              class="inline-flex items-center gap-0.5 text-cyan-600 shrink-0 cursor-help"
            >
              <NotePencil size={10} weight="fill" />
              {tab.notes.length} note{tab.notes.length === 1 ? "" : "s"}
            </span>
          </div>
        )}
        {tab.tags.length > 0 && (
          <div class="flex items-center flex-wrap gap-1 mt-1.5">
            {tab.tags.map((t) => (
              <span
                key={t}
                class="inline-flex items-center gap-1 px-1.5 h-4 bg-purple-500/15 text-purple-700 text-[10px] rounded"
              >
                <Tag size={8} weight="fill" class="text-purple-600" />
                {t}
              </span>
            ))}
          </div>
        )}
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
        {(() => {
          const hasAudio = tab.audible || tab.muted;
          const disabled = !hasAudio;
          const title = disabled
            ? "No audio playing"
            : tab.muted
              ? "Unmute this tab"
              : "Mute this tab";
          return (
            <ActionBtn
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
            </ActionBtn>
          );
        })()}
        {tab.discarded && (
          <ActionBtn
            title="Wake up tab (reload from sleep)"
            active={true}
            tone="warning"
            onClick={handleWake}
          >
            <Lightning size={13} weight="fill" />
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

function Favicon({ url, discarded }: { url: string; discarded?: boolean }) {
  const cls = discarded ? "grayscale" : "";
  if (!url) {
    return (
      <div
        class={`size-5 shrink-0 inline-flex items-center justify-center text-fg-subtle ${cls}`}
      >
        <Globe size={16} />
      </div>
    );
  }
  return (
    <img
      src={url}
      alt=""
      class={`size-5 shrink-0 rounded ${cls}`}
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
  disabled?: boolean;
  onClick: (e: MouseEvent) => void;
  children: preact.ComponentChildren;
}) {
  const activeClass = props.disabled
    ? "text-fg-subtle/40 cursor-not-allowed"
    : props.active
      ? TONE_ACTIVE[props.tone]
      : "text-fg-subtle";
  const visibility =
    props.active || props.forceVisible
      ? "opacity-100"
      : "opacity-0 group-hover:opacity-100";
  const hover = props.disabled
    ? ""
    : `${TONE_HOVER_BG[props.tone]} ${TONE_HOVER_FG[props.tone]}`;
  return (
    <button
      type="button"
      onClick={props.disabled ? undefined : props.onClick}
      disabled={props.disabled}
      data-tooltip={props.title}
      data-tooltip-pos="above"
      aria-label={props.title}
      class={`size-7 inline-flex items-center justify-center rounded ${activeClass} ${visibility} ${hover} transition-all`}
    >
      {props.children}
    </button>
  );
}
