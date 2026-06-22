
export function sendChromeMessage(action, requestMessage, responseKey) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(requestMessage, (response) => {
            if (response && response[responseKey]) {
                resolve(response[responseKey]);
            } else {
                reject(`Failed to receive response for action: ${action}`);
            }
        });
    });
}



export function getChromeStorage(keys) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(keys, (result) => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve(result);
            }
        });
    });
}


// Utility function to set data to Chrome local storage (returns a promise)
export function setChromeStorage(data) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.set(data, () => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve();
            }
        });
    });
}


export function getFocusedWindowId() {
    return new Promise((resolve, reject) => {
        chrome.windows.getCurrent({ populate: false }, (window) => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve(window.id);
            }
        });
    });
}

export function checkTabGroupsForWindow(windowId) {
    return new Promise((resolve, reject) => {
        chrome.tabGroups.query({ windowId }, (groups) => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve(groups.length > 0); // Active if groups exist
            }
        });
    });
}

export function getAllWindowIds() {
    return new Promise((resolve, reject) => {
        chrome.windows.getAll({ populate: false }, (windows) => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                const windowIds = windows.map((win) => win.id);
                resolve(windowIds);
            }
        });
    });
}

// Check if the tab is open
export function isTabOpen(tabId) {
    return new Promise((resolve) => {
        chrome.tabs.query({}, (tabs) => {
            resolve(tabs.some((tab) => tab.id === tabId));
        });
    });
}

// Check if the tab is pinned
export function isTabPinned(tabId) {
    return new Promise((resolve) => {
        chrome.tabs.get(tabId, (tab) => {
            if (chrome.runtime.lastError) {
                resolve(false);
            } else {
                resolve(tab.pinned);
            }
        });
    });
}

// Check if the tab is saved
export function isTabSaved(tabId) {
    return getChromeStorage("savedPages").then((result) => {
        const savedPages = result.savedPages || {};
        return Boolean(savedPages[tabId]);
    }).catch(() => false);
}

// Check if the tab is pawed (starred)
export function isTabPawed(tabId) {
    return getChromeStorage("savedPages").then((result) => {
        const savedPages = result.savedPages || {};
        return !!savedPages[tabId]?.starred;
    }).catch(() => false);
}

export function isTabMuted(tabId) {
    return new Promise((resolve) => {
      chrome.tabs.get(tabId, (tab) => {
        if (chrome.runtime.lastError || !tab) {
          resolve(false);
        } else {
          resolve(!!tab.mutedInfo?.muted);
        }
      });
    });
  }
  
  export function isTabAudible(tabId) {
    return new Promise((resolve) => {
      chrome.tabs.get(tabId, (tab) => {
        if (chrome.runtime.lastError || !tab) {
          resolve(false);
        } else {
          resolve(!!tab.audible);
        }
      });
    });
  }

// Open the tab in a new window
export function openTabInNewWindow(url, pinTab = false) {
    return new Promise((resolve, reject) => {
        chrome.tabs.create({ url }, (tab) => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError.message);
            } else {
                if(pinTab) {
                    chrome.tabs.update(tab.id, { pinned: true }, async () => {
                        if (chrome.runtime.lastError) {
                            reject(chrome.runtime.lastError.message);
                        } else {
                            resolve(tab);
                        }
                    });
                } else {
                    resolve(tab);
                }
            }
        });
    });
}

export function closeTab(tabId) {
    return new Promise((resolve, reject) => {
        chrome.tabs.remove(tabId, () => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError.message);
            } else {
                resolve();
            }
        });
    });
}

export function focusTabById(tabId, windowId) {
    chrome.windows.getCurrent({}, (currentWindow) => {
        if (currentWindow.id?.toString() === windowId) {
            // If the tab is in the current window, activate it
            chrome.tabs.update(tabId, { active: true }, (tab) => {
                if (chrome.runtime.lastError) {
                    console.error(`Error activating tab ID ${tabId}:`, chrome.runtime.lastError.message);
                }
            });
        } else {
            // Otherwise, focus the target window first, then activate the tab
            chrome.windows.update(windowId, { focused: true }, (window) => {
                if (chrome.runtime.lastError) {
                    console.error(`Error focusing window ID ${windowId}:`, chrome.runtime.lastError.message);
                    return;
                }
                chrome.tabs.update(tabId, { active: true }, (tab) => {
                    if (chrome.runtime.lastError) {
                        console.error(`Error activating tab ID ${tabId}:`, chrome.runtime.lastError.message);
                    }
                });
            });
        }
    });
}

