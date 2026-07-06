# PawTabs — Chrome Web Store listing copy

## Name
PawTabs

## Short description (≤132 chars)
Modern tab and window manager — group, tag, snapshot, and clean up your browser. Notion-style design, fully local.

## Category
Productivity

## Detailed description

PawTabs turns Chrome's tab chaos into a calm, organized workspace. Designed with a modern Notion/Arc-style minimal aesthetic, it gives you a fast popup for everyday tab use and a full Mission Control dashboard for power organizing — all without sending a single byte to a server.

---

### See and find anything

- **Live tab list** of every window and tab, with status indicators (pinned, pawed, audible, muted, inactive) in semantic colors.
- **Group tabs** by Window, Domain, Pinned, Pawed, or Audible status.
- **Sort** by recency or title.
- **Search** across tab titles, URLs, your tags, your notes, and even your custom window names.
- **⌘K Command Palette** for instant search + actions from the keyboard.

### Organize on your terms

- **Pawed tabs** — mark important tabs (one-click 🐾) and find them later in a dedicated view.
- **Pinned tabs** — Chrome's native pin, surfaced as a first-class collection.
- **Tags + Notes per tab** — annotate any tab, search by annotation, browse by tag.
- **Custom window names + colors** — "Work" in blue, "Weekend" in amber. The whole card themes itself in the chosen color.

### Mission Control dashboard

Open a full-window dashboard with sidebar navigation:

- **Overview** — at-a-glance stats, top domains chart, oldest/newest tabs, recent pawed shortcuts.
- **All tabs / Pawed / Pinned / Tags** — focused lists with toolbar controls: Group / Sort / Columns (1–4 grid).
- **Windows** — visual cards per window. Rename, color, focus, split, merge, or close window. Drag-free move: pick tabs with checkboxes, click destination card.
- **Sessions** — save the entire state of your tabs + windows. Restore later with a choice of layouts: per-window, single window, or reuse-if-exists — and optionally close current windows first.
- **Recently closed** — Chrome's recently closed tabs with one-click reopen.

### Auto-save + smart restore

- **Auto-save on a schedule** — pick minutes, hours, or days between snapshots. Oldest auto-saves are pruned so storage stays small.
- **Lazy tab restore** — restoring a 90-tab snapshot doesn't freeze Chrome. Tabs open as instant placeholders and only load when you click them.
- **Restore modes** — per-window (matches original layout), single-window (everything into one), or reuse-if-exists (drop into a named window if it already exists).
- **Demo mode** — try PawTabs on realistic data without losing your current session: PawTabs snapshots your open tabs, opens a demo set, and restores your originals whenever you exit demo mode.

### Built-in Help

- **? in the popup header** opens a Help modal that walks through every icon, action, tag, note, and session feature — no docs tab required.

### Cleanup Wizard

A safety-first batch cleanup tool. Each run automatically:

- Creates a tab snapshot first (default ON)
- Backs up your metadata (saved sessions, groups, tags, notes)
- Then runs your chosen actions: close inactive · remove duplicates · split large windows · regroup small ones

Pinned tabs are always preserved. Wrong move? Restore the snapshot from Snapshots view.

### Designed for daily use

- Light and Dark themes with system preference detection
- Tooltips on every action
- Keyboard shortcut to open from anywhere (configurable at chrome://extensions/shortcuts)
- Status indicators in semantic colors (no rainbow distractions)
- Inter Variable font, Phosphor Icons — single icon family throughout

### Your data stays on your device

PawTabs is fully local-first:

- All data lives in `chrome.storage.local`
- No analytics
- No telemetry
- No external requests
- No account required

---

### Permissions explained

PawTabs only asks for what it needs to work:

- **tabs** + **tabGroups** — to read, group, and rearrange your tabs
- **windows** — to read window structure and move tabs between windows
- **storage** — to save your snapshots, tags, notes, and preferences locally
- **sessions** — to show Chrome's recently closed list and reopen tabs
- **activeTab** — to act on the focused tab from the popup
- **scripting** — extension architecture
- **history** + **topSites** — for dashboard insights
- **alarms** — fire the optional auto-save snapshot on your chosen interval (only when auto-save is enabled)
- **<all_urls>** host permission — to read tab URLs and titles

PawTabs never inspects page contents — it only reads tab metadata Chrome already exposes.

---

### Keyboard shortcuts

- **Alt+Shift+P** — open PawTabs from any tab (configurable)
- **⌘K / Ctrl+K** — open Command Palette inside the popup
- **Esc** — close any modal, cancel selection
- **Enter** in the search input — focus first matching tab

---

### Roadmap

PawTabs v2.0 is a clean rewrite of the original. Built with Vite, TypeScript (strict), Preact, Tailwind v4, and Chrome MV3.

Feedback welcome.
