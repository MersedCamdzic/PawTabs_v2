import { useState, useEffect } from "preact/hooks";
import {
  FloppyDisk,
  X,
  Browsers,
  BookmarkSimple,
} from "@phosphor-icons/react";
import { saveSession } from "@/lib/sessions";
import { fetchAllTabs } from "@/lib/chrome";
import { storage } from "@/lib/storage";

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  subsetUrls?: string[] | null;
  contextLabel?: string | null;
}

export function SnapshotPromptModal({
  open,
  onClose,
  onSaved,
  subsetUrls,
  contextLabel,
}: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState<{
    windowCount: number;
    tabCount: number;
    pinnedCount: number;
  } | null>(null);

  useEffect(() => {
    if (!open) return;
    setName("");
    setDescription("");
    setSaving(false);
    fetchAllTabs().then((s) => {
      const isSubset = Array.isArray(subsetUrls);
      const filtered = isSubset
        ? s.tabs.filter((t) => (subsetUrls as string[]).includes(t.url))
        : s.tabs;
      const windowIds = new Set(filtered.map((t) => t.windowId));
      setStats({
        windowCount: isSubset ? windowIds.size : s.windowCount,
        tabCount: filtered.length,
        pinnedCount: filtered.filter((t) => t.pinned).length,
      });
    });
  }, [open, subsetUrls]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const finalName = name.trim()
        ? contextLabel
          ? `${name.trim()} (${contextLabel})`
          : name.trim()
        : contextLabel
          ? `${new Date().toLocaleString()} (${contextLabel})`
          : "";
      const session = await saveSession(finalName, false, description);
      if (Array.isArray(subsetUrls)) {
        const set = new Set(subsetUrls);
        await storage.update("savedSessions", (current) =>
          (current ?? []).map((s) =>
            s.id === session.id
              ? { ...s, tabs: s.tabs.filter((t) => set.has(t.url)) }
              : s,
          ),
        );
      }
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        class="w-[420px] bg-bg-elevated border border-border rounded-lg shadow-lg flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div class="flex items-center gap-2 px-4 py-3 border-b border-border">
          <BookmarkSimple size={14} weight="fill" class="text-accent" />
          <h2 class="text-[14px] font-semibold tracking-tight flex-1">
            New snapshot
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            class="size-7 inline-flex items-center justify-center rounded-md text-fg-muted hover:bg-surface hover:text-fg transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        <div class="p-4 space-y-3">
          {stats && (
            <div class="text-[11px] text-fg-muted bg-surface rounded-md px-2.5 py-1.5 flex items-center gap-2">
              <Browsers size={12} class="text-accent" />
              <span>
                Capturing{" "}
                <span class="font-semibold text-fg">{stats.tabCount}</span>{" "}
                tabs across{" "}
                <span class="font-semibold text-fg">
                  {stats.windowCount}
                </span>{" "}
                window{stats.windowCount === 1 ? "" : "s"}
                {stats.pinnedCount > 0 && (
                  <>
                    {" "}
                    ({stats.pinnedCount} pinned)
                  </>
                )}
              </span>
            </div>
          )}

          {contextLabel && (
            <div class="text-[11px] text-accent bg-accent-subtle/60 border border-accent/20 rounded-md px-2.5 py-1.5">
              Context appended to name:{" "}
              <span class="font-semibold">({contextLabel})</span>
            </div>
          )}

          <div>
            <label class="text-[11px] uppercase tracking-wide text-fg-subtle font-medium block mb-1.5">
              Name
            </label>
            <input
              type="text"
              autoFocus
              value={name}
              onInput={(e) =>
                setName((e.currentTarget as HTMLInputElement).value)
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSave();
                }
              }}
              placeholder="Leave blank for auto-name with date"
              class="w-full h-9 px-3 bg-surface border border-border rounded-md text-[13px] placeholder:text-fg-subtle focus:outline-none focus:bg-bg focus:border-accent focus:ring-4 focus:ring-accent/10 transition-colors"
            />
          </div>

          <div>
            <label class="text-[11px] uppercase tracking-wide text-fg-subtle font-medium block mb-1.5">
              Description{" "}
              <span class="text-fg-subtle normal-case font-normal">
                · optional
              </span>
            </label>
            <textarea
              value={description}
              onInput={(e) =>
                setDescription(
                  (e.currentTarget as HTMLTextAreaElement).value,
                )
              }
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  handleSave();
                }
              }}
              placeholder="Why are you snapshotting? What is this set of tabs for?"
              rows={3}
              class="w-full px-3 py-2 bg-surface border border-border rounded-md text-[12px] placeholder:text-fg-subtle focus:outline-none focus:bg-bg focus:border-accent focus:ring-4 focus:ring-accent/10 transition-colors resize-none"
            />
            <div class="text-[10px] text-fg-subtle mt-1">
              <kbd class="font-mono">⌘ Enter</kbd> to save
            </div>
          </div>
        </div>

        <div class="px-4 py-3 border-t border-border bg-surface/50 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            class="h-8 px-3 text-[12px] font-medium rounded-md text-fg-muted hover:bg-surface hover:text-fg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            class="h-8 px-3 inline-flex items-center gap-1.5 text-[12px] font-medium rounded-md bg-accent text-white hover:bg-accent-hover disabled:opacity-40 transition-colors"
          >
            <FloppyDisk size={12} weight="fill" />
            {saving ? "Saving…" : "Save snapshot"}
          </button>
        </div>
      </div>
    </div>
  );
}
