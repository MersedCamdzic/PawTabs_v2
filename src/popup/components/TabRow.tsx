import {
  PushPin,
  SpeakerHigh,
  SpeakerSlash,
  Moon,
  PawPrint,
  X,
  Globe,
} from "@phosphor-icons/react";
import { focusTab, closeTab } from "@/lib/chrome";
import { getRootDomain } from "@/lib/utils";
import type { PawTab } from "@/types";

interface Props {
  tab: PawTab;
  onAction: () => void;
}

export function TabRow({ tab, onAction }: Props) {
  const domain = getRootDomain(tab.url);

  const handleFocus = async () => {
    await focusTab(tab.id, tab.windowId);
    window.close();
  };

  const handleClose = async (e: MouseEvent) => {
    e.stopPropagation();
    await closeTab(tab.id);
    onAction();
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleFocus}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleFocus();
        }
      }}
      class="group flex items-center gap-2.5 pl-2 pr-1.5 py-1.5 rounded-md hover:bg-surface focus:bg-surface focus:outline-none cursor-pointer transition-colors"
    >
      <Favicon url={tab.favIconUrl} />

      <div class="flex-1 min-w-0">
        <div class="text-[13px] text-fg truncate leading-tight">
          {tab.title || domain || "Untitled"}
        </div>
        <div class="text-[11px] text-fg-subtle truncate leading-tight mt-0.5">
          {domain}
        </div>
      </div>

      <div class="flex items-center gap-1 shrink-0">
        {tab.starred && (
          <StatusIcon title="Pawed" tone="accent">
            <PawPrint size={13} weight="fill" />
          </StatusIcon>
        )}
        {tab.pinned && (
          <StatusIcon title="Pinned" tone="warning">
            <PushPin size={13} weight="fill" />
          </StatusIcon>
        )}
        {tab.audible && !tab.muted && (
          <StatusIcon title="Playing audio" tone="success">
            <SpeakerHigh size={13} weight="regular" />
          </StatusIcon>
        )}
        {tab.muted && (
          <StatusIcon title="Muted" tone="danger">
            <SpeakerSlash size={13} weight="regular" />
          </StatusIcon>
        )}
        {tab.discarded && (
          <StatusIcon title="Discarded" tone="muted">
            <Moon size={13} weight="regular" />
          </StatusIcon>
        )}

        <button
          type="button"
          onClick={handleClose}
          aria-label="Close tab"
          class="size-6 ml-0.5 inline-flex items-center justify-center rounded text-fg-subtle opacity-0 group-hover:opacity-100 hover:bg-danger-subtle hover:text-danger transition-all"
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

const TONE_CLASSES = {
  accent: "text-accent",
  warning: "text-warning",
  success: "text-success",
  danger: "text-danger",
  muted: "text-fg-subtle",
} as const;

function StatusIcon(props: {
  title: string;
  tone: keyof typeof TONE_CLASSES;
  children: preact.ComponentChildren;
}) {
  return (
    <span
      title={props.title}
      class={`inline-flex size-5 items-center justify-center ${TONE_CLASSES[props.tone]}`}
    >
      {props.children}
    </span>
  );
}
