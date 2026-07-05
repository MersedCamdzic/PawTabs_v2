interface Props {
  value: 1 | 2 | 3 | 4;
  onChange: (next: 1 | 2 | 3 | 4) => void;
  max?: 1 | 2 | 3 | 4;
}

export function ColumnsPicker({ value, onChange, max = 4 }: Props) {
  const options = ([1, 2, 3, 4] as const).filter((n) => n <= max);
  return (
    <div class="inline-flex items-center gap-0.5 p-0.5 bg-surface border border-border rounded-md">
      {options.map((n) => {
        const active = value === n;
        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            data-tooltip={`${n} column${n === 1 ? "" : "s"}`}
            data-tooltip-pos="below"
            aria-label={`${n} column${n === 1 ? "" : "s"}`}
            class={`size-7 inline-flex items-center justify-center rounded transition-colors ${
              active
                ? "bg-bg-elevated text-accent shadow-xs"
                : "text-fg-muted hover:bg-bg-elevated hover:text-fg"
            }`}
          >
            <ColumnsIcon n={n} active={active} />
          </button>
        );
      })}
    </div>
  );
}

function ColumnsIcon({ n, active }: { n: 1 | 2 | 3 | 4; active: boolean }) {
  const fill = active ? "currentColor" : "currentColor";
  const opacity = active ? "1" : "0.7";
  return (
    <svg
      viewBox="0 0 14 14"
      width="14"
      height="14"
      fill={fill}
      style={{ opacity }}
    >
      {Array.from({ length: n }).map((_, i) => {
        const w = (14 - (n + 1) * 1.5) / n;
        const x = 1.5 + i * (w + 1.5);
        return (
          <rect
            key={i}
            x={x}
            y={1.5}
            width={w}
            height={11}
            rx={1}
            ry={1}
          />
        );
      })}
    </svg>
  );
}
