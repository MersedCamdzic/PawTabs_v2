# Privacy Policy — PawTabs

_Last updated: 2026-07-06_

## Summary

PawTabs is a fully local browser extension. It does not collect, transmit, store on remote servers, or share any of your data. There is no analytics, no telemetry, no third-party SDKs, and no account system.

## What data PawTabs accesses

PawTabs uses standard Chrome extension APIs to read information about your tabs and windows so it can display, group, search, and rearrange them. Specifically:

- Tab metadata: title, URL, favicon, pinned state, audio state, discarded state, last-accessed timestamp, window membership
- Window metadata: window IDs, tab counts, focus state
- Recently closed tabs list (via `chrome.sessions`)

PawTabs does NOT access:

- Page contents (HTML, text, form data)
- Cookies
- Browsing history beyond Chrome's standard "recently closed" API
- Passwords, autofill data, or any sensitive browser-stored credentials

## What data PawTabs stores (locally)

The extension uses `chrome.storage.local` to persist your choices on your device:

- Your tags and notes attached to specific tabs
- Saved snapshots (window + tab structure for restore)
- Wizard backups (your saved sessions/groups/page metadata snapshots)
- Window custom names and colors
- Your preferences (theme, grouping, sort, wizard thresholds)

All of this lives only in your browser, on the machine you installed PawTabs on. Uninstalling the extension removes all PawTabs storage.

## What PawTabs does NOT do

- Send any data to any server (no network requests are made by the extension)
- Use cookies
- Track you across sites or sessions
- Sync data between devices
- Include analytics or telemetry SDKs

## Permissions explained

| Permission | Why PawTabs needs it |
|---|---|
| `tabs`, `tabGroups` | Read and manage tabs and tab groups |
| `windows` | Read window structure; move tabs between windows |
| `storage` | Save your tags, notes, snapshots, and preferences locally |
| `sessions` | Show Chrome's recently closed tabs and reopen them |
| `activeTab` | Act on the currently focused tab from the popup |
| `scripting` | Required for the Manifest V3 extension to load its UI |
| `history`, `topSites` | Provide dashboard insights about your browsing |
| `alarms` | Fire the auto-save snapshot on your chosen interval (only when enabled) |
| Host `<all_urls>` | Read tab URLs and titles across all sites |

## Contact

For questions about this policy, open an issue at the extension's source repository.
