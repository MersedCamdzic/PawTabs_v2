import { useState, useEffect, useRef } from "preact/hooks";
import { CaretDown, Check } from "@phosphor-icons/react";
import { GROUP_BY_OPTIONS } from "@/lib/grouping";
import type { GroupBy as GroupByType } from "@/types";

interface Props {
  value: GroupByType;
  onChange: (value: GroupByType) => void;
}

export function GroupBy({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const current = GROUP_BY_OPTIONS.find((o) => o.value === value);

  return (
    <div ref={ref} class="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        class="h-7 px-2.5 inline-flex items-center gap-1.5 rounded-md border border-border bg-bg hover:bg-surface text-[12px] text-fg-muted hover:text-fg transition-colors"
      >
        <span class="text-fg-subtle">Group by</span>
        <span class="text-fg font-medium">{current?.label}</span>
        <CaretDown size={11} weight="bold" />
      </button>

      {open && (
        <div class="absolute right-0 top-full mt-1 z-10 w-40 bg-bg-elevated border border-border rounded-md shadow-md py-1">
          {GROUP_BY_OPTIONS.map((opt) => {
            const selected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                class={`w-full px-2.5 py-1.5 text-left text-[12px] flex items-center justify-between hover:bg-surface transition-colors ${
                  selected ? "text-accent font-medium" : "text-fg"
                }`}
              >
                <span>{opt.label}</span>
                {selected && <Check size={12} weight="bold" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
