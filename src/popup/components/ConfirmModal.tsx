import { Warning } from "@phosphor-icons/react";
import { Modal } from "./Modal";

interface Props {
  open: boolean;
  title: string;
  message: preact.ComponentChildren;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "accent";
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  tone = "danger",
  onConfirm,
  onCancel,
}: Props) {
  const confirmClass =
    tone === "danger"
      ? "bg-danger text-white hover:bg-danger/90"
      : "bg-accent text-white hover:bg-accent-hover";

  const iconWrapClass =
    tone === "danger"
      ? "bg-danger-subtle text-danger"
      : "bg-accent-subtle text-accent";

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      hideCloseButton
      closeOnBackdrop={false}
    >
      <div class="flex items-start gap-3">
        <div
          class={`size-10 shrink-0 inline-flex items-center justify-center rounded-full ${iconWrapClass}`}
        >
          <Warning size={20} weight="fill" />
        </div>
        <div class="text-[13px] text-fg leading-relaxed pt-1.5">{message}</div>
      </div>
      <div class="flex justify-end gap-2 mt-5">
        <button
          type="button"
          onClick={onCancel}
          class="h-9 px-4 text-[12px] font-medium rounded-md text-fg-muted hover:bg-surface hover:text-fg transition-colors"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          autoFocus
          class={`h-9 px-4 text-[12px] font-medium rounded-md transition-colors ${confirmClass}`}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
