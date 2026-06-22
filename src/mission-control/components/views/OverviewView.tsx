import { useMemo } from "preact/hooks";
import {
  Browsers,
  PushPin,
  PawPrint,
  SpeakerHigh,
  Tag,
  NotePencil,
  Moon,
  ArrowUpRight,
  BookmarkSimple,
  ClockCounterClockwise,
  ArrowCounterClockwise,
  Gear,
  Globe,
  ArrowRight,
} from "@phosphor-icons/react";
import type { Insights } from "@/lib/stats";
import { formatRelativeTime } from "@/lib/sessions";
import { focusTab } from "@/lib/chrome";
import { getRootDomain } from "@/lib/utils";
import type { PawTab } from "@/types";
import type { View } from "../Sidebar";

interface Props {
  insights: Insights;
  tabs: PawTab[];
  windowTitles: Record<number, string>;
  onChangeView: (view: View) => void;
  onOpenDetails: (tab: PawTab) => void;
}

export function OverviewView({
  insights,
  tabs,
  windowTitles,
  onChangeView,
  onOpenDetails,
}: Props) {
  const recentPawed = useMemo(
    () =>
      tabs
        .filter((t) => t.starred)
        .sort((a, b) => (b.lastAccessed ?? 0) - (a.lastAccessed ?? 0))
        .slice(0, 5),
    [tabs],
  );

  const tagCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const tab of tabs) {
      for (const tag of tab.tags) {
        map.set(tag, (map.get(tag) ?? 0) + 1);
      }
    }
    return Array.from(map.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);
  }, [tabs]);

  return (
    <div class="px-8 py-6 space-y-6">
      <Section label="Browser state">
        <div class="grid grid-cols-3 gap-3">
          <HeroStat
            icon={<Browsers size={16} />}
            value={insights.windowCount}
            label="Windows"
            tone="default"
          />
          <HeroStat
            icon={<Browsers size={16} />}
            value={insights.tabCount}
            label="Tabs"
            tone="accent"
          />
          <HeroStat
            icon={<Moon size={16} />}
            value={insights.inactiveCount}
            label="Inactive"
            tone="warning"
            highlightWhenPositive
          />
        </div>
      </Section>

      <Section label="Collections">
        <div class="grid grid-cols-4 gap-3">
          <MiniStat
            icon={<PushPin size={14} />}
            value={insights.pinnedCount}
            label="Pinned"
            tone="warning"
            onClick={() => onChangeView("pinned")}
          />
          <MiniStat
            icon={<PawPrint size={14} />}
            value={insights.pawedCount}
            label="Pawed"
            tone="accent"
            onClick={() => onChangeView("pawed")}
          />
          <MiniStat
            icon={<SpeakerHigh size={14} />}
            value={insights.audibleCount}
            label="Audible"
            tone="success"
          />
          <MiniStat
            icon={<Tag size={14} />}
            value={insights.taggedCount}
            label="Tagged"
            tone="accent"
            onClick={() => onChangeView("tags")}
          />
        </div>
      </Section>

      <Section label="Jump to">
        <div class="grid grid-cols-4 gap-2">
          <QuickAction
            icon={<BookmarkSimple size={16} />}
            label="Sessions"
            onClick={() => onChangeView("sessions")}
          />
          <QuickAction
            icon={<ClockCounterClockwise size={16} />}
            label="Recently closed"
            onClick={() => onChangeView("recently-closed")}
          />
          <QuickAction
            icon={<ArrowCounterClockwise size={16} />}
            label="Backups"
            onClick={() => onChangeView("backups")}
          />
          <QuickAction
            icon={<Gear size={16} />}
            label="Settings"
            onClick={() => onChangeView("settings")}
          />
        </div>
      </Section>

      <div class="grid grid-cols-2 gap-6">
        <Section label="Top domains">
          {insights.topDomains.length === 0 ? (
            <div class="text-[12px] text-fg-subtle">No data</div>
          ) : (
            <div class="space-y-1">
              {insights.topDomains.map((d) => (
                <DomainBar
                  key={d.domain}
                  domain={d.domain}
                  count={d.count}
                  max={insights.topDomains[0]!.count}
                />
              ))}
            </div>
          )}
        </Section>

        <Section label="Timeline">
          <div class="space-y-2">
            {insights.oldestTab && (
              <TimelineTab
                label="Oldest active tab"
                tab={insights.oldestTab}
              />
            )}
            {insights.newestTab &&
              insights.newestTab.id !== insights.oldestTab?.id && (
                <TimelineTab
                  label="Most recently used"
                  tab={insights.newestTab}
                />
              )}
            <div class="text-[12px] text-fg-muted pt-1 flex items-center gap-1.5">
              <NotePencil size={12} class="text-accent" />
              {insights.notedCount} tab
              {insights.notedCount === 1 ? "" : "s"} with notes
            </div>
          </div>
        </Section>
      </div>

      <div class="grid grid-cols-2 gap-6">
        <Section
          label={`Recently pawed (${recentPawed.length})`}
          action={
            recentPawed.length > 0 ? (
              <LinkButton onClick={() => onChangeView("pawed")}>
                See all
              </LinkButton>
            ) : null
          }
        >
          {recentPawed.length === 0 ? (
            <EmptyHint
              icon={<PawPrint size={20} weight="thin" />}
              text="No pawed tabs yet"
              hint="Click 🐾 in the popup to mark important tabs."
            />
          ) : (
            <div class="space-y-0.5">
              {recentPawed.map((tab) => (
                <CompactRow
                  key={tab.id}
                  tab={tab}
                  windowTitle={windowTitles[tab.windowId]}
                  onClick={() => onOpenDetails(tab)}
                />
              ))}
            </div>
          )}
        </Section>

        <Section
          label={`Tags (${tagCounts.length})`}
          action={
            tagCounts.length > 0 ? (
              <LinkButton onClick={() => onChangeView("tags")}>
                Browse all
              </LinkButton>
            ) : null
          }
        >
          {tagCounts.length === 0 ? (
            <EmptyHint
              icon={<Tag size={20} weight="thin" />}
              text="No tags yet"
              hint="Add tags from a tab's details modal."
            />
          ) : (
            <div class="flex flex-wrap gap-1.5">
              {tagCounts.slice(0, 18).map((t) => (
                <button
                  type="button"
                  key={t.tag}
                  onClick={() => onChangeView("tags")}
                  class="inline-flex items-center gap-1 h-6 px-2 rounded-full text-[11px] bg-surface border border-border hover:border-accent hover:bg-accent-subtle hover:text-accent transition-colors"
                >
                  <Tag size={9} weight="fill" class="text-accent" />
                  <span class="truncate max-w-[120px]">{t.tag}</span>
                  <span class="text-fg-subtle">{t.count}</span>
                </button>
              ))}
              {tagCounts.length > 18 && (
                <span class="inline-flex items-center h-6 px-2 text-[11px] text-fg-subtle">
                  +{tagCounts.length - 18} more
                </span>
              )}
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}

function Section(props: {
  label: string;
  action?: preact.ComponentChildren;
  children: preact.ComponentChildren;
}) {
  return (
    <div>
      <div class="flex items-center justify-between mb-3">
        <div class="text-[11px] uppercase tracking-wide text-fg-subtle font-medium">
          {props.label}
        </div>
        {props.action}
      </div>
      {props.children}
    </div>
  );
}

function LinkButton(props: {
  onClick: () => void;
  children: preact.ComponentChildren;
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      class="text-[11px] text-accent font-medium hover:underline inline-flex items-center gap-0.5"
    >
      {props.children}
      <ArrowRight size={10} weight="bold" />
    </button>
  );
}

function HeroStat(props: {
  icon: preact.ComponentChildren;
  value: number;
  label: string;
  tone: "default" | "accent" | "warning";
  highlightWhenPositive?: boolean;
}) {
  let valueColor = "text-fg";
  if (props.tone === "accent") valueColor = "text-accent";
  if (props.tone === "warning") {
    if (!props.highlightWhenPositive || props.value > 0)
      valueColor = "text-warning";
  }
  return (
    <div class="bg-surface border border-border rounded-lg p-4 hover:border-border-strong transition-colors">
      <div class="flex items-center justify-between mb-2">
        <span class="text-fg-subtle">{props.icon}</span>
      </div>
      <div class={`text-[28px] font-semibold leading-none ${valueColor}`}>
        {props.value}
      </div>
      <div class="text-[11px] text-fg-muted mt-1.5 uppercase tracking-wide font-medium">
        {props.label}
      </div>
    </div>
  );
}

function MiniStat(props: {
  icon: preact.ComponentChildren;
  value: number;
  label: string;
  tone: "default" | "accent" | "warning" | "success" | "danger";
  onClick?: () => void;
}) {
  const toneColor = {
    default: "text-fg",
    accent: "text-accent",
    warning: "text-warning",
    success: "text-success",
    danger: "text-danger",
  }[props.tone];
  const interactive = props.onClick
    ? "cursor-pointer hover:border-border-strong hover:bg-surface"
    : "";
  return (
    <button
      type="button"
      onClick={props.onClick}
      disabled={!props.onClick}
      class={`bg-bg border border-border rounded-md px-3 py-2.5 flex items-center gap-2.5 transition-colors text-left ${interactive} disabled:cursor-default`}
    >
      <span class={toneColor}>{props.icon}</span>
      <div class="flex-1">
        <div class="text-[16px] font-semibold leading-none">{props.value}</div>
        <div class="text-[10px] text-fg-muted mt-1 uppercase tracking-wide">
          {props.label}
        </div>
      </div>
    </button>
  );
}

function QuickAction(props: {
  icon: preact.ComponentChildren;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      class="bg-bg border border-border rounded-md px-3 py-3 flex flex-col items-center justify-center gap-1.5 hover:border-accent hover:bg-accent-subtle/30 hover:text-accent transition-colors group"
    >
      <span class="text-fg-muted group-hover:text-accent transition-colors">
        {props.icon}
      </span>
      <span class="text-[11px] font-medium text-fg-muted group-hover:text-accent">
        {props.label}
      </span>
    </button>
  );
}

function DomainBar(props: { domain: string; count: number; max: number }) {
  const pct = Math.round((props.count / props.max) * 100);
  return (
    <div class="group">
      <div class="flex items-baseline justify-between gap-2 mb-0.5">
        <span class="text-[12px] text-fg truncate">{props.domain}</span>
        <span class="text-[11px] text-fg-subtle tabular-nums">
          {props.count}
        </span>
      </div>
      <div class="h-1.5 bg-surface rounded-full overflow-hidden">
        <div
          class="h-full bg-accent/70 group-hover:bg-accent transition-colors"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function TimelineTab(props: {
  label: string;
  tab: {
    id: number;
    windowId: number;
    title: string;
    url: string;
    lastAccessed?: number;
  };
}) {
  const handleClick = () => focusTab(props.tab.id, props.tab.windowId);
  return (
    <button type="button" onClick={handleClick} class="w-full text-left group">
      <div class="text-[10px] uppercase tracking-wide text-fg-subtle font-medium mb-0.5">
        {props.label}
      </div>
      <div class="flex items-center gap-1.5">
        <span class="text-[12px] text-fg truncate flex-1 group-hover:text-accent transition-colors">
          {props.tab.title || getRootDomain(props.tab.url)}
        </span>
        <ArrowUpRight
          size={11}
          class="text-fg-subtle group-hover:text-accent transition-colors shrink-0"
        />
      </div>
      <div class="text-[10px] text-fg-subtle truncate">
        {getRootDomain(props.tab.url)} ·{" "}
        {props.tab.lastAccessed
          ? formatRelativeTime(new Date(props.tab.lastAccessed).toISOString())
          : "unknown"}
      </div>
    </button>
  );
}

function CompactRow(props: {
  tab: PawTab;
  windowTitle?: string;
  onClick: () => void;
}) {
  const domain = getRootDomain(props.tab.url);
  return (
    <button
      type="button"
      onClick={props.onClick}
      class="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-surface text-left group transition-colors"
    >
      {props.tab.favIconUrl ? (
        <img
          src={props.tab.favIconUrl}
          alt=""
          class="size-4 shrink-0 rounded-sm"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      ) : (
        <Globe size={14} class="text-fg-subtle shrink-0" />
      )}
      <div class="flex-1 min-w-0">
        <div class="text-[12px] text-fg truncate leading-tight">
          {props.tab.title || domain}
        </div>
        <div class="text-[10px] text-fg-subtle truncate">
          {props.windowTitle ? `${props.windowTitle} · ` : ""}
          {domain}
        </div>
      </div>
    </button>
  );
}

function EmptyHint(props: {
  icon: preact.ComponentChildren;
  text: string;
  hint: string;
}) {
  return (
    <div class="py-6 text-center">
      <div class="text-fg-subtle mb-2 inline-flex justify-center">
        {props.icon}
      </div>
      <div class="text-[12px] font-medium text-fg">{props.text}</div>
      <div class="text-[11px] text-fg-subtle mt-0.5">{props.hint}</div>
    </div>
  );
}
