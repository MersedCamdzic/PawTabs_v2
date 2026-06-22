interface Props {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description?: string;
}

export function Toggle({ checked, onChange, label, description }: Props) {
  return (
    <label class="flex items-start justify-between gap-3 cursor-pointer py-2">
      <div class="flex-1 min-w-0">
        <div class="text-[13px] font-medium text-fg">{label}</div>
        {description && (
          <div class="text-[11px] text-fg-muted mt-0.5 leading-snug">
            {description}
          </div>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        class={`shrink-0 w-9 h-5 rounded-full transition-colors relative ${
          checked ? "bg-accent" : "bg-border-strong"
        }`}
      >
        <span
          class={`absolute top-0.5 size-4 bg-white rounded-full shadow-sm transition-transform ${
            checked ? "translate-x-[18px]" : "translate-x-0.5"
          }`}
        />
      </button>
    </label>
  );
}
