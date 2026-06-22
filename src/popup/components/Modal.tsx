import { useEffect } from "preact/hooks";
import { X } from "@phosphor-icons/react";

interface Props {
  title: string;
  open: boolean;
  onClose: () => void;
  children: preact.ComponentChildren;
  footer?: preact.ComponentChildren;
  headerActions?: preact.ComponentChildren;
}

export function Modal({
  title,
  open,
  onClose,
  children,
  footer,
  headerActions,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        class="relative w-[380px] max-h-[90vh] bg-bg-elevated border border-border rounded-lg shadow-lg flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div class="flex items-center gap-2 px-4 py-3 border-b border-border">
          <h2 class="text-[14px] font-semibold tracking-tight flex-1">
            {title}
          </h2>
          {headerActions}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            class="size-7 inline-flex items-center justify-center rounded-md text-fg-muted hover:bg-surface hover:text-fg transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        <div class="flex-1 overflow-y-auto p-4">{children}</div>

        {footer && (
          <div class="px-4 py-3 border-t border-border bg-surface/50">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
