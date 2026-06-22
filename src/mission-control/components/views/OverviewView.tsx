import {
  Browsers,
  PushPin,
  PawPrint,
  SpeakerHigh,
  Tag,
  NotePencil,
  Moon,
  ArrowUpRight,
} from "@phosphor-icons/react";
import type { Insights } from "@/lib/stats";
import { formatRelativeTime } from "@/lib/sessions";
import { focusTab } from "@/lib/chrome";
import { getRootDomain } from "@/lib/utils";

interface Props {
  insights: Insights;
}

export function OverviewView({ insights }: Props) {
  return (
    <div class="px-8 py-6 space-y-6">
      <div>
        <div class="text-[11px] uppercase tracking-wide text-fg-subtle mb-3 font-medium">
          Browser state
        </div>
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
      </div>

      <div>
        <div class="text-[11px] uppercase tracking-wide text-fg-subtle mb-3 font-medium">
          Collections
        </div>
        <div class="grid grid-cols-4 gap-3">
          <MiniStat
            icon={<PushPin size={14} />}
            value={insights.pinnedCount}
            label="Pinned"
            tone="warning"
          />
          <MiniStat
            icon={<PawPrint size={14} />}
            value={insights.pawedCount}
            label="Pawed"
            tone="accent"
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
          />
        </div>
      </div>

      <div class="grid grid-cols-2 gap-6">
        <div>
          <div class="text-[11px] uppercase tracking-wide text-fg-subtle mb-3 font-medium">
            Top domains
          </div>
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
        </div>

        <div>
          <div class="text-[11px] uppercase tracking-wide text-fg-subtle mb-3 font-medium">
            Timeline
          </div>
          <div class="space-y-2">
            {insights.oldestTab && (
              <TimelineTab
                label="Oldest active tab"
                tab={insights.oldestTab}
              />
            )}
            {insights.newestTab && insights.newestTab.id !== insights.oldestTab?.id && (
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
        </div>
      </div>
    </div>
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
}) {
  const toneColor = {
    default: "text-fg",
    accent: "text-accent",
    warning: "text-warning",
    success: "text-success",
    danger: "text-danger",
  }[props.tone];
  return (
    <div class="bg-bg border border-border rounded-md px-3 py-2.5 flex items-center gap-2.5">
      <span class={toneColor}>{props.icon}</span>
      <div class="flex-1">
        <div class="text-[16px] font-semibold leading-none">{props.value}</div>
        <div class="text-[10px] text-fg-muted mt-1 uppercase tracking-wide">
          {props.label}
        </div>
      </div>
    </div>
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
  tab: { id: number; windowId: number; title: string; url: string; lastAccessed?: number };
}) {
  const handleClick = () => focusTab(props.tab.id, props.tab.windowId);
  return (
    <button
      type="button"
      onClick={handleClick}
      class="w-full text-left group"
    >
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
