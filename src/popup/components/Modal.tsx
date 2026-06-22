import { useEffect } from "preact/hooks";

interface Props {
  title: string;
  subtitle?: preact.ComponentChildren;
  open: boolean;
  onClose: () => void;
  children: preact.ComponentChildren;
  footer?: preact.ComponentChildren;
  headerActions?: preact.ComponentChildren;
  hideCloseButton?: boolean;
  closeOnBackdrop?: boolean;
}

export function Modal({
  title,
  subtitle,
  open,
  onClose,
  children,
  footer,
  headerActions,
  hideCloseButton = false,
  closeOnBackdrop = true,
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
      onClick={closeOnBackdrop ? onClose : undefined}
    >
      <div
        class="relative w-[400px] max-h-[92vh] bg-bg-elevated border border-border rounded-xl shadow-xl flex flex-col animate-modal-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div class="flex items-center gap-2 px-4 py-3 border-b border-border">
          <div class="flex-1 min-w-0">
            <h2 class="text-[14px] font-semibold tracking-tight leading-tight">
              {title}
            </h2>
            {subtitle && (
              <div class="text-[11px] text-fg-subtle leading-tight mt-0.5">
                {subtitle}
              </div>
            )}
          </div>
          {headerActions}
          {!hideCloseButton && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              class="h-7 px-2.5 inline-flex items-center text-[11px] font-medium rounded-md text-fg-muted hover:bg-surface hover:text-fg transition-colors"
            >
              Close
            </button>
          )}
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
