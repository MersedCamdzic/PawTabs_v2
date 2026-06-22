import { MagnifyingGlass, Gear, GridFour, Sparkle } from "@phosphor-icons/react";

export function Popup() {
  return (
    <div class="w-[420px] min-h-[560px] bg-bg text-fg flex flex-col">
      <header class="flex items-center justify-between px-4 pt-4 pb-3">
        <div class="flex items-center gap-2">
          <h1 class="text-[15px] font-semibold tracking-tight">PawTabs</h1>
        </div>
        <div class="flex items-center gap-1">
          <IconButton label="Wizard">
            <Sparkle size={16} weight="regular" />
          </IconButton>
          <IconButton label="Mission Control">
            <GridFour size={16} weight="regular" />
          </IconButton>
          <IconButton label="Settings">
            <Gear size={16} weight="regular" />
          </IconButton>
        </div>
      </header>

      <section class="px-4 pb-3">
        <div class="grid grid-cols-3 gap-2">
          <Stat value={0} label="Windows" />
          <Stat value={0} label="Tabs" />
          <Stat value={0} label="Inactive" />
        </div>
      </section>

      <section class="px-4 pb-3">
        <div class="relative">
          <MagnifyingGlass
            size={14}
            class="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle"
          />
          <input
            type="text"
            placeholder="Search tabs"
            class="w-full h-9 pl-8 pr-3 bg-surface border border-border rounded-md text-[13px] placeholder:text-fg-subtle focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
          />
        </div>
      </section>

      <div class="border-t border-border" />

      <div class="flex-1 px-4 py-3 overflow-y-auto">
        <div class="text-fg-subtle text-[13px] text-center py-12">
          Loading tabs…
        </div>
      </div>
    </div>
  );
}

function IconButton(props: {
  label: string;
  children: preact.ComponentChildren;
}) {
  return (
    <button
      type="button"
      title={props.label}
      aria-label={props.label}
      class="size-7 inline-flex items-center justify-center rounded-md text-fg-muted hover:bg-surface-hover hover:text-fg transition-colors"
    >
      {props.children}
    </button>
  );
}

function Stat(props: { value: number; label: string }) {
  return (
    <div class="bg-surface border border-border rounded-md p-3">
      <div class="text-[18px] font-semibold leading-tight">{props.value}</div>
      <div class="text-[11px] text-fg-muted uppercase tracking-wide mt-0.5">
        {props.label}
      </div>
    </div>
  );
}
