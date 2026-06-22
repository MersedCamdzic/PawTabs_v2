import { defineManifest } from "@crxjs/vite-plugin";

export default defineManifest({
  manifest_version: 3,
  name: "PawTabs",
  version: "2.0.0",
  description: "Manage tabs and windows, group them, leave notes, tags, and clean up your browser.",
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
  ],
  host_permissions: ["<all_urls>"],
  commands: {
    open_popup: {
      suggested_key: { default: "Ctrl+Shift+Y" },
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
