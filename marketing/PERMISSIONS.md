# Chrome Web Store — Permissions Justifications

Paste these directly into the Web Store developer console when prompted.

## Single purpose

PawTabs helps users organize their browser tabs and windows with grouping, tagging, notes, snapshots, and a cleanup wizard — all stored locally on the user's device.

---

## tabs

PawTabs reads tab metadata (title, URL, favicon, pinned/muted/audible state) to display, group, search, and rearrange tabs in its popup and Mission Control dashboard. It uses `chrome.tabs.update`, `chrome.tabs.move`, `chrome.tabs.remove`, and `chrome.tabs.reload` to act on tabs the user explicitly selects in PawTabs UI.

## tabGroups

Used to read existing Chrome native tab groups so they appear correctly in PawTabs' window views.

## storage

`chrome.storage.local` is the sole location for user data. PawTabs persists per-tab tags and notes, custom window names and colors, saved snapshots of tab state, wizard backups, and user preferences (theme, grouping, sort order, wizard thresholds). No remote storage is used.

## sessions

Used to populate the "Recently closed" view (`chrome.sessions.getRecentlyClosed`) and to reopen a closed tab with `chrome.sessions.restore` when the user clicks reopen.

## activeTab

The popup uses `chrome.action.openPopup` and acts on the user's current tab when they invoke actions from the keyboard shortcut. `activeTab` grants the minimum needed access for these cases.

## scripting

Required by Manifest V3 for the extension's HTML/JS pages (popup, Mission Control, background service worker) to load.

## history

Used by the Mission Control Overview dashboard to surface tab age and recency insights. PawTabs does not export or transmit history data.

## topSites

Reserved for future "most visited" suggestions in the dashboard. Currently used only by Chrome's recently closed list code path.

## windows

Read window structure (IDs, focus, tab counts) for the Windows view and to move tabs between windows (`chrome.windows.create`, `chrome.windows.update`).

## alarms

Powers the optional auto-save feature. When the user enables auto-save in Settings, PawTabs registers a single `chrome.alarms` alarm (interval configurable in minutes / hours / days) that wakes the service worker to save a snapshot of open tabs. No network calls happen during the wake-up; the snapshot is written to `chrome.storage.local`. If auto-save is disabled, no alarms are scheduled.

---

## Host permissions

### `<all_urls>`

PawTabs needs to read the title and URL of tabs across all origins to display them in its UI and to allow searching across all open tabs. It does NOT inject content scripts or read page DOM contents — it only reads metadata that the Chrome `tabs` API exposes per tab.

---

## Remote code

PawTabs does NOT execute any remote code. All scripts are bundled into the extension package via Vite. No CDN, no eval, no remote modules.

---

## Data usage disclosures (for the Privacy practices section)

| Type | Collected? |
|---|---|
| Personally identifiable information | **No** |
| Health information | **No** |
| Financial and payment information | **No** |
| Authentication information | **No** |
| Personal communications | **No** |
| Location | **No** |
| Web history | Read locally only; never transmitted |
| User activity | Read locally only; never transmitted |
| Website content | **No** (only tab titles/URLs, not page contents) |

I certify that:

- PawTabs does not sell or transfer user data to third parties for purposes unrelated to the single purpose stated.
- PawTabs does not use or transfer user data for creditworthiness or lending purposes.
- PawTabs does not use or transfer user data for purposes unrelated to its single purpose.
