chrome.runtime.onInstalled.addListener(() => {
  console.info("[PawTabs] background service worker installed");
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command === "open_popup") {
    try {
      await chrome.action.openPopup();
    } catch (err) {
      console.error("[PawTabs] failed to open popup", err);
    }
  }
});
