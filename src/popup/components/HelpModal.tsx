import {
  PawPrint,
  PushPin,
  SpeakerHigh,
  Tag,
  NotePencil,
  Broadcast,
  Moon,
  Prohibit,
  ListBullets,
  ArrowSquareOut,
  X,
  Browsers,
  Palette,
  MagnifyingGlass,
  FloppyDisk,
  ArrowsLeftRight,
  ArrowUUpLeft,
  Broom,
  GridFour,
  BookmarkSimple,
  Gear,
  Lightning,
  Trash,
} from "@phosphor-icons/react";
import { Modal } from "./Modal";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function HelpModal({ open, onClose }: Props) {
  return (
    <Modal open={open} onClose={onClose} title="How PawTabs works">
      <div class="space-y-5 text-[12px] text-fg-muted">
        <Section title="Tab state (icon before the title)">
          <Row
            icon={<Broadcast size={13} weight="bold" class="text-success" />}
            label="Active"
            text="Tab is loaded and ready."
          />
          <Row
            icon={<Moon size={13} weight="fill" class="text-fg-subtle" />}
            label="Inactive"
            text="Chrome discarded the tab to save memory. Click reloads."
          />
          <Row
            icon={<Prohibit size={13} weight="bold" class="text-danger" />}
            label="Closed"
            text="URL was closed but still tracked (Recently closed, Pawed, Tags)."
          />
        </Section>

        <Section title="Per-tab actions (hover a tab row)">
          <Row
            icon={<PawPrint size={13} weight="fill" class="text-accent" />}
            label="Paw"
            text="Save the URL persistently. Survives close. Restore later from Pawed view."
          />
          <Row
            icon={<PushPin size={13} weight="fill" class="text-warning" />}
            label="Pin"
            text="Chrome pin — locks tab to the left of the strip."
          />
          <Row
            icon={<SpeakerHigh size={13} class="text-success" />}
            label="Audio / Mute"
            text="Toggle mute. Icon dims when tab has no audio."
          />
          <Row
            icon={<ArrowSquareOut size={13} class="text-accent" />}
            label="Jump to tab"
            text="Focuses the tab in Chrome and closes the popup."
          />
          <Row
            icon={<ListBullets size={13} class="text-fg-subtle" />}
            label="Tab details"
            text="Open the details modal to edit tags, notes, move to another window."
          />
          <Row
            icon={<X size={13} class="text-danger" />}
            label="Close tab"
            text="Removes the tab from Chrome."
          />
        </Section>

        <Section title="Organize your tabs">
          <Row
            icon={<Tag size={13} weight="fill" class="text-purple-600" />}
            label="Tags"
            text="Custom labels (Work, Reading, Research…). A URL can have many. Survive close."
          />
          <Row
            icon={<NotePencil size={13} weight="fill" class="text-cyan-600" />}
            label="Notes"
            text="Attach text to any URL — meeting reminders, review notes. URL-keyed too."
          />
          <Row
            icon={<Browsers size={13} weight="fill" class="text-accent" />}
            label="Named + colored windows"
            text="Rename each Chrome window and pick a color (Work blue, Weekend amber…)."
          />
          <Row
            icon={<Palette size={13} class="text-accent" />}
            label="Group by"
            text="Group tab list by Window / Domain / Pin / Paw / Muted state."
          />
          <Row
            icon={<MagnifyingGlass size={13} class="text-fg-subtle" />}
            label="Search"
            text="Fuzzy across title, URL, tags, notes, and window name."
          />
        </Section>

        <Section title="Bulk actions on a group">
          <Row
            icon={<Tag size={13} class="text-purple-600" />}
            label="Add tag"
            text="Tag every tab in the group at once."
          />
          <Row
            icon={<NotePencil size={13} class="text-cyan-600" />}
            label="Add note"
            text="Attach the same note to every tab in the group."
          />
          <Row
            icon={<ArrowsLeftRight size={13} class="text-accent" />}
            label="Move all to window"
            text="Move all tabs to another window or a brand new one."
          />
          <Row
            icon={<FloppyDisk size={13} class="text-accent" />}
            label="Save as snapshot"
            text="Save the group as a session (with the filter/group name in parens)."
          />
          <Row
            icon={<X size={13} class="text-danger" />}
            label="Close all"
            text="Close every tab in the group (with confirm)."
          />
        </Section>

        <Section title="Sessions & snapshots">
          <Row
            icon={<BookmarkSimple size={13} weight="fill" class="text-accent" />}
            label="Manual snapshot"
            text="Save every open tab as a session. Restore any time."
          />
          <Row
            icon={<Broom size={13} weight="fill" class="text-accent" />}
            label="Auto-save"
            text="Take snapshots on a schedule. Oldest auto ones are pruned."
          />
          <Row
            icon={<ArrowUUpLeft size={13} weight="bold" class="text-accent" />}
            label="Restore"
            text="Pick per-window / single window / reuse-if-exists. Tabs open as lazy placeholders — click a tab to actually load it."
          />
        </Section>

        <Section title="Header shortcuts">
          <Row
            icon={<BookmarkSimple size={13} class="text-fg-muted" />}
            label="Saved sessions"
            text="Open the sessions/backup manager."
          />
          <Row
            icon={<Broom size={13} class="text-fg-muted" />}
            label="Cleanup Wizard"
            text="Walkthrough that helps split, merge, or close inactive tabs safely."
          />
          <Row
            icon={<GridFour size={13} class="text-fg-muted" />}
            label="Open Pack (Mission Control)"
            text="Full-page manager: Overview, Windows, Pawed, Tags, Recently closed."
          />
          <Row
            icon={<Gear size={13} class="text-fg-muted" />}
            label="Settings"
            text="Theme, auto-save cadence, Wizard defaults."
          />
        </Section>

        <Section title="Power tips">
          <Row
            icon={<Lightning size={13} weight="fill" class="text-accent" />}
            label="Command palette (⌘K)"
            text="Fast jump to any tab, tag, or snapshot from the keyboard."
          />
          <Row
            icon={<Trash size={13} class="text-danger" />}
            label="Delete URL from PawTabs"
            text="In Tab details for a closed URL — removes paw/tags/notes for that URL."
          />
          <Row
            icon={<PawPrint size={13} class="text-accent" />}
            label="Current tab card"
            text="The pulsing card at the top of the popup is always your active tab."
          />
        </Section>
      </div>
    </Modal>
  );
}

function Section(props: {
  title: string;
  children: preact.ComponentChildren;
}) {
  return (
    <div>
      <div class="text-[10px] uppercase tracking-wider text-fg-subtle font-semibold mb-2">
        {props.title}
      </div>
      <div class="space-y-2">{props.children}</div>
    </div>
  );
}

function Row(props: {
  icon: preact.ComponentChildren;
  label: string;
  text: string;
}) {
  return (
    <div class="flex items-start gap-2.5">
      <span class="size-5 shrink-0 mt-0.5 inline-flex items-center justify-center rounded bg-surface">
        {props.icon}
      </span>
      <div class="flex-1 min-w-0">
        <div class="text-[12px] font-semibold text-fg leading-tight">
          {props.label}
        </div>
        <div class="text-[11px] text-fg-muted leading-snug mt-0.5">
          {props.text}
        </div>
      </div>
    </div>
  );
}
