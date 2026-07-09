import { defineManifest } from "@crxjs/vite-plugin";

export default defineManifest({
  manifest_version: 3,
  name: "PawTabs",
  version: "2.3.3",
  description: "Tab & window manager: group, tag, note, auto-snapshot, safely restore, plus full Chrome history search.",
  permissions: [
    "tabs",
    "tabGroups",
    "scripting",
    "activeTab",
    "storage",
    "history",
    "sessions",
    "topSites",
    "windows",
    "alarms",
  ],
  host_permissions: ["<all_urls>"],
  commands: {
    open_popup: {
      suggested_key: { default: "Alt+Shift+P" },
      description: "Open the PawTabs popup",
    },
  },
  action: {
    default_popup: "src/popup/index.html",
  },
  background: {
    service_worker: "src/background/index.ts",
    type: "module",
  },
  web_accessible_resources: [
    {
      resources: ["src/mission-control/index.html"],
      matches: ["<all_urls>"],
    },
  ],
  icons: {
    "16": "icons/icon-16.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png",
  },
});
