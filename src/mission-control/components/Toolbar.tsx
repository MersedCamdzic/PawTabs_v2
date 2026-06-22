import { MagnifyingGlass } from "@phosphor-icons/react";

interface Props {
  title: string;
  subtitle?: string;
  query: string;
  onQueryChange: (q: string) => void;
  actions?: preact.ComponentChildren;
}

export function Toolbar({
  title,
  subtitle,
  query,
  onQueryChange,
  actions,
}: Props) {
  return (
    <div class="border-b border-border bg-bg/95 backdrop-blur sticky top-0 z-10 px-8 pt-6 pb-4">
      <div class="flex items-start justify-between gap-4 mb-4">
        <div>
          <h1 class="text-[20px] font-semibold tracking-tight">{title}</h1>
          {subtitle && (
            <p class="text-[12px] text-fg-muted mt-0.5">{subtitle}</p>
          )}
        </div>
        {actions && <div class="flex items-center gap-2">{actions}</div>}
      </div>

      <div class="relative max-w-md">
        <MagnifyingGlass
          size={14}
          class="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle pointer-events-none"
        />
        <input
          type="text"
          value={query}
          onInput={(e) =>
            onQueryChange((e.currentTarget as HTMLInputElement).value)
          }
          placeholder="Search"
          class="w-full h-9 pl-9 pr-3 bg-surface border border-border rounded-md text-[13px] placeholder:text-fg-subtle focus:outline-none focus:bg-bg-elevated focus:border-accent focus:ring-4 focus:ring-accent/10 transition-colors"
        />
      </div>
    </div>
  );
}
