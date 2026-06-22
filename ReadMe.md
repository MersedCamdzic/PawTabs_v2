# PawTabs v2

Modern tab and window manager for Chrome. Group, tag, note, and clean up your tabs without losing them.

## Features

### Tab management
- **Live view** of all open windows and tabs across the browser
- **Click any tab** to focus and switch to it
- **Per-tab quick actions** on hover: Paw (star+save), Pin, Mute/Unmute, Close
- **Status indicators** with semantic color: pinned (amber), pawed (accent), audible (success green), muted (danger red), inactive (gray)

### Organization
- **Group by** Window / Domain / Pinned / Pawed / Audible
  - Audible splits into three accurate groups: Playing audio / Muted / Silent
- **Search** by title, URL, tags, and note text in real time
- **Tags** — add any number of free-form tags per tab; chip-style display
- **Notes** — multi-line notes with timestamps; `Enter` to add, `Shift+Enter` for newline
- **Move tab to window** — pick from existing windows or open a new one

### Sessions and backups
- **Save current state** as a named session (or auto-named with timestamp)
- **Restore session** opens each saved window with its original tabs and pin state
- **Auto-backup** before any Wizard cleanup operation
- Both sessions and backups live in the same "Saved snapshots" modal with tabbed UI

### Cleanup Wizard
- **Close inactive tabs** (Chrome-discarded)
- **Remove duplicate tabs** (keep first occurrence per URL)
- **Split large windows** into smaller ones (threshold configurable)
- **Regroup small windows** into one
- Pinned tabs are always preserved
- Auto-backup created before any destructive action

### Settings
- **Theme** — Light / Dark / System (warm light + dark palette)
- **Wizard thresholds** — customize split + regroup numbers

### Keyboard
- `Ctrl/Cmd + Shift + Y` — open popup
- `Esc` — close any open modal
- `Enter` on focused tab row — focus that tab

## Stack

- **Vite 6** + `@crxjs/vite-plugin` for MV3 build
- **TypeScript** (strict mode)
- **Preact 10** with React compat (for `@phosphor-icons/react`)
- **Tailwind CSS v4** with CSS-first `@theme` design tokens
- **Phosphor Icons** (regular weight, single icon family)
- **Inter Variable** font (bundled via `@fontsource-variable`)

## Development

```bash
npm install
npm run dev          # Vite dev server with HMR for popup pages
npm run build        # produces dist/ ready to load as unpacked extension
npm run typecheck    # tsc --noEmit
```

## Loading as unpacked extension

1. Run `npm run build`
2. Open `chrome://extensions`
3. Enable **Developer mode** (top right)
4. Click **Load unpacked** → select the **`dist/`** folder (not the project root)
5. Pin the extension and press `Ctrl+Shift+Y` (or `Cmd+Shift+Y` on Mac)

## Project layout

```
src/
  manifest.config.ts        MV3 manifest (CRXJS)
  background/index.ts       Service worker: pin sync, orphan cleanup, command handler
  popup/
    main.tsx                Entry — applies saved theme before render
    Popup.tsx               Root component
    hooks.ts                useTabSnapshot — fetches tabs, subscribes to chrome.tabs events
    components/
      TabRow.tsx            Single tab UI with quick actions + indicators
      TabGroupSection.tsx   Collapsible group section
      GroupBy.tsx           Group-by dropdown
      Modal.tsx             Reusable modal with backdrop + Esc handling
      Toggle.tsx            Switch component
      WizardModal.tsx       Cleanup options + result panel
      SessionsModal.tsx     Sessions + Backups tabs
      SettingsModal.tsx     Theme picker + wizard threshold inputs
      TabDetailsModal.tsx   Tags + Notes + Move to window
  mission-control/          Full-window dashboard (placeholder)
  lib/
    chrome.ts               Typed Chrome API wrappers
    storage.ts              Typed chrome.storage.local wrapper
    preferences.ts          getPreferences, setPreference with defaults
    theme.ts                applyTheme, watchSystemTheme
    grouping.ts             groupTabs, sort logic per criterion
    tabs.ts                 addTag, removeTag, addNote, removeNote, moveTab
    sessions.ts             save/restore/delete sessions
    backups.ts              list/restore/delete backups
    wizard.ts               runWizard cleanup actions + auto-backup
    utils.ts                getRootDomain, hashStringToColor
  styles/
    tokens.css              Tailwind v4 @theme with Notion/Arc palette
    globals.css             Base styles, font import
  types.ts                  All shared interfaces
public/icons/               Extension icons (16, 48, 128)
legacy/                     Original v1 codebase, kept for reference
dist/                       Build output — load this as unpacked extension
```

## Design system

Notion / Arc warm light aesthetic. Single accent color, semantic functional colors (warning/success/danger). Tokens defined in `src/styles/tokens.css` via Tailwind v4 `@theme` directive.

| Token | Light | Dark |
|---|---|---|
| `bg` | `#FAFAF7` | `#18181B` |
| `surface` | `#F4F4F0` | `#1F1F23` |
| `border` | `#E4E4E0` | `#2E2E33` |
| `fg` | `#18181B` | `#FAFAF7` |
| `fg-muted` | `#52525B` | `#A1A1AA` |
| `accent` | `#2563EB` | `#3B82F6` |
| `warning` | `#D97706` | `#F59E0B` |
| `success` | `#059669` | `#10B981` |
| `danger` | `#DC2626` | `#EF4444` |

## Tagged commits

- `legacy-v1` — original vanilla JS + Bootstrap codebase
