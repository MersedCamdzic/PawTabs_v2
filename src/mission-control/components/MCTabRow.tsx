import {
  PushPin,
  PawPrint,
  X,
  Globe,
  Tag,
  NotePencil,
  Moon,
  Broadcast,
  ArrowSquareOut,
  Browsers,
} from "@phosphor-icons/react";
import { focusTab, closeTab } from "@/lib/chrome";
import { getRootDomain } from "@/lib/utils";
import { WINDOW_COLOR_STYLES } from "@/lib/window-colors";
import type { PawTab, WindowColor } from "@/types";

interface Props {
  tab: PawTab;
  windowTitle?: string;
  windowColor?: WindowColor | null;
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

export function MCTabRow({
  tab,
  windowTitle,
  windowColor,
  onAction,
  onOpenDetails,
}: Props) {
  const domain = getRootDomain(tab.url);

  const handleRowClick = () => onOpenDetails(tab);

  const stop = (e: Event) => e.stopPropagation();

  const handleClose = async (e: MouseEvent) => {
    stop(e);
    await closeTab(tab.id);
    onAction();
  };

  const handleJump = async (e: MouseEvent) => {
    stop(e);
    await focusTab(tab.id, tab.windowId);
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
          class={`flex items-start gap-1.5 text-[13px] leading-snug line-clamp-2 ${
            tab.discarded ? "italic text-fg-muted" : "text-fg"
          }`}
        >
          {tab.discarded ? (
            <span
              title="Inactive — tab discarded from memory"
              class="shrink-0 inline-flex mt-1 text-fg-subtle"
            >
              <Moon size={11} weight="fill" />
            </span>
          ) : (
            <span
              title="Active — tab is loaded and ready"
              class="shrink-0 inline-flex mt-1 text-success"
            >
              <Broadcast size={11} weight="bold" />
            </span>
          )}
          {tab.starred && (
            <span
              title="Pawed"
              class="shrink-0 inline-flex mt-1 text-accent"
            >
              <PawPrint size={11} weight="fill" />
            </span>
          )}
          {tab.pinned && (
            <span
              title="Pinned"
              class="shrink-0 inline-flex mt-1 text-warning"
            >
              <PushPin size={11} weight="fill" />
            </span>
          )}
          {tab.tags.length > 0 && (
            <span
              title={tab.tags.join(", ")}
              class="shrink-0 inline-flex items-center gap-0.5 mt-1 text-purple-600 text-[11px] font-semibold"
            >
              <Tag size={11} weight="fill" />
              {tab.tags.length}
            </span>
          )}
          {tab.notes.length > 0 && (
            <span
              title={notesTooltip(tab.notes)}
              class="shrink-0 inline-flex items-center gap-0.5 mt-1 text-cyan-600 text-[11px] font-semibold"
            >
              <NotePencil size={11} weight="fill" />
              {tab.notes.length}
            </span>
          )}
          <span class="min-w-0">{tab.title || domain || "Untitled"}</span>
        </div>
        <div class="text-[11px] text-fg-subtle leading-tight mt-1 break-all line-clamp-2">
          {tab.url}
        </div>
        {windowTitle && (
          <div class="flex flex-wrap items-center gap-1 mt-2">
            {(() => {
              const cs = windowColor
                ? WINDOW_COLOR_STYLES[windowColor]
                : null;
              return (
                <span
                  class={`inline-flex items-center gap-1 h-5 px-1.5 rounded text-[10px] font-medium ${
                    cs ? cs.headerBg : "bg-surface"
                  } ${cs ? cs.titleText : "text-fg-muted"}`}
                >
                  <Browsers
                    size={9}
                    weight="fill"
                    class={cs ? cs.iconText : "text-fg-subtle"}
                  />
                  {windowTitle}
                </span>
              );
            })()}
          </div>
        )}
      </div>

      <div class="flex items-center gap-0.5 shrink-0">
        <ActionBtn
          title="Jump to this tab"
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
          aria-label="Close this tab"
          data-tooltip="Close this tab"
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
