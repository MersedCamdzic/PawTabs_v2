import {
  PawPrint,
  SquaresFour,
  ListBullets,
  Browsers,
  PushPin,
  Tag,
  BookmarkSimple,
  ClockCounterClockwise,
  Gear,
  Broom,
} from "@phosphor-icons/react";
import type { ComponentChildren, JSX } from "preact";

export type View =
  | "overview"
  | "tabs"
  | "windows"
  | "pawed"
  | "pinned"
  | "tags"
  | "sessions"
  | "recently-closed"
  | "backups"
  | "settings";

interface Props {
  view: View;
  onChange: (view: View) => void;
  onOpenCleanup: () => void;
  counts: {
    tabs: number;
    windows: number;
    pawed: number;
    pinned: number;
    tags: number;
    sessions: number;
    backups: number;
  };
}

export function Sidebar({ view, onChange, onOpenCleanup, counts }: Props) {
  return (
    <aside class="w-60 shrink-0 h-screen border-r border-border bg-bg flex flex-col">
      <div class="px-5 pt-5 pb-3 flex items-center gap-2">
        <span class="inline-flex size-7 items-center justify-center rounded-md bg-accent-subtle text-accent">
          <PawPrint size={16} weight="fill" />
        </span>
        <div class="leading-tight">
          <div class="text-[14px] font-semibold tracking-tight">PawTabs</div>
          <div class="text-[10px] text-fg-subtle">Pack</div>
        </div>
      </div>

      <nav class="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
        <NavItem
          icon={<SquaresFour size={14} />}
          label="Overview"
          active={view === "overview"}
          onClick={() => onChange("overview")}
        />
        <NavItem
          icon={<ListBullets size={14} />}
          label="All tabs"
          count={counts.tabs}
          active={view === "tabs"}
          onClick={() => onChange("tabs")}
        />

        <SectionLabel>Collections</SectionLabel>

        <NavItem
          icon={<Browsers size={14} />}
          label="Windows"
          count={counts.windows}
          active={view === "windows"}
          onClick={() => onChange("windows")}
        />
        <NavItem
          icon={<PawPrint size={14} />}
          label="Pawed"
          count={counts.pawed}
          active={view === "pawed"}
          onClick={() => onChange("pawed")}
        />
        <NavItem
          icon={<PushPin size={14} />}
          label="Pinned"
          count={counts.pinned}
          active={view === "pinned"}
          onClick={() => onChange("pinned")}
        />
        <NavItem
          icon={<Tag size={14} />}
          label="Tags"
          count={counts.tags}
          active={view === "tags"}
          onClick={() => onChange("tags")}
        />

        <SectionLabel>Saved</SectionLabel>

        <NavItem
          icon={<BookmarkSimple size={14} />}
          label="Snapshots"
          count={counts.sessions + counts.backups}
          active={view === "sessions"}
          onClick={() => onChange("sessions")}
        />

        <SectionLabel>Browser history</SectionLabel>

        <NavItem
          icon={<ClockCounterClockwise size={14} />}
          label="Recently closed"
          active={view === "recently-closed"}
          onClick={() => onChange("recently-closed")}
        />
      </nav>

      <div class="px-2 py-2 border-t border-border space-y-0.5">
        <NavItem
          icon={<Broom size={14} />}
          label="Cleanup tabs…"
          active={false}
          onClick={onOpenCleanup}
        />
        <NavItem
          icon={<Gear size={14} />}
          label="Settings"
          active={view === "settings"}
          onClick={() => onChange("settings")}
        />
      </div>
    </aside>
  );
}

function NavItem(props: {
  icon: ComponentChildren;
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
}) {
  const cls = props.active
    ? "bg-accent-subtle text-accent"
    : "text-fg-muted hover:bg-surface hover:text-fg";
  return (
    <button
      type="button"
      onClick={props.onClick}
      class={`w-full h-8 px-2.5 flex items-center gap-2.5 rounded-md text-[13px] transition-colors ${cls}`}
    >
      <span class="shrink-0">{props.icon}</span>
      <span class="flex-1 text-left truncate font-medium">{props.label}</span>
      {props.count !== undefined && props.count > 0 && (
        <span
          class={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
            props.active
              ? "bg-accent text-white"
              : "bg-surface text-fg-subtle"
          }`}
        >
          {props.count}
        </span>
      )}
    </button>
  );
}

function SectionLabel(props: { children: ComponentChildren }): JSX.Element {
  return (
    <div class="px-2.5 pt-3 pb-1 text-[10px] uppercase tracking-wider text-fg-subtle font-medium">
      {props.children}
    </div>
  );
}
