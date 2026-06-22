import { useState, useEffect, useRef } from "preact/hooks";
import { CaretDown, Check } from "@phosphor-icons/react";

export type WindowsSortKey = "default" | "name" | "count" | "recent";

export const WINDOWS_SORT_OPTIONS: { value: WindowsSortKey; label: string }[] =
  [
    { value: "default", label: "Default" },
    { value: "name", label: "Name (A→Z)" },
    { value: "count", label: "Tab count" },
    { value: "recent", label: "Recently used" },
  ];

interface Props {
  value: WindowsSortKey;
  onChange: (value: WindowsSortKey) => void;
}

export function WindowsSortDropdown({ value, onChange }: Props) {
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

  const current = WINDOWS_SORT_OPTIONS.find((o) => o.value === value);

  return (
    <div ref={ref} class="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        class="h-9 px-2.5 inline-flex items-center gap-1.5 rounded-md border border-border bg-surface hover:bg-bg-elevated text-[12px] text-fg-muted hover:text-fg transition-colors"
      >
        <span class="text-fg-subtle">Sort</span>
        <span class="text-fg font-medium">{current?.label}</span>
        <CaretDown size={11} weight="bold" />
      </button>
      {open && (
        <div class="absolute right-0 top-full mt-1 z-20 w-44 bg-bg-elevated border border-border rounded-md shadow-md py-1">
          {WINDOWS_SORT_OPTIONS.map((opt) => {
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
          <div class="border-t border-border my-1" />
          <div class="px-2.5 py-1 text-[10px] text-fg-subtle">
            Current window always first
          </div>
        </div>
      )}
    </div>
  );
}
