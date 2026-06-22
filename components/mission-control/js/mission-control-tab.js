import { getChromeStorage, setChromeStorage } from "../../../utils/chrome-util.js";
import { updateTabState } from "./mission-control-dom.js";

export async function togglePin(tabData) {
    const parsedTabId = parseInt(tabData.tabId, 10);

    // Validate that parsedTabId is a valid number
    if (isNaN(parsedTabId)) {
        console.error('Invalid tabId:', tabData.tabId);
        return;
    }

    try {
        // If the tab is saved, also update its pin state in storage
        const result = await getChromeStorage(['savedPages']);
        const savedPages = result.savedPages || {};
        
        if (savedPages[parsedTabId]) {
            savedPages[parsedTabId].pinned = !savedPages[parsedTabId].pinned;
            await setChromeStorage({ savedPages });
            console.log(`Pinned state for tab ${parsedTabId} saved.`);
        }
    } catch (error) {
        console.error('Failed to save updated pin state:', error);
    }

    // Get the tab to check its current pin state
    chrome.tabs.get(parsedTabId, (tab) => {
        if (chrome.runtime.lastError) {
            console.error('Failed to get tab:', chrome.runtime.lastError.message);
            return;
        }

        const newPinState = !tab.pinned;
        chrome.tabs.update(parsedTabId, { pinned: newPinState }, async () => {
            if (chrome.runtime.lastError) {
                console.error('Failed to update tab:', chrome.runtime.lastError.message);
                return;
            }

            updateTabState(parsedTabId, 'pin', newPinState);
        });
    });
}

export async function toggleStar(tabData) {
    const parsedTabId = parseInt(tabData.tabId, 10);

    // Validate that parsedTabId is a valid number
    if (isNaN(parsedTabId)) {
        console.error('Invalid tabId:', tabData.tabId);
        return;
    }

    // Fetch the tab details from Chrome storage to get the pinned status
    try {
        const tab = await chrome.tabs.get(parsedTabId);
        tabData.pinned = tab.pinned; // Ensure pinned status is up-to-date
    } catch (error) {
        // Error ignored
    }

    getChromeStorage(['savedPages'])
        .then((result) => {
            let savedPages = result.savedPages || {};
            let savedTab = savedPages[parsedTabId];

            if (!savedTab) {
                // If the tab is not saved, save it and star it
                savedPages[parsedTabId] = {
                    ...tabData,  // Include all tab data
                    starred: true  // Set starred property
                };

                return setChromeStorage({ savedPages }).then(() => {
                    updateTabState(parsedTabId, 'star', true); // Update the star state in UI
                    updateTabState(parsedTabId, 'save', true); // Also update the save state in UI
                    console.log(`Tab ${parsedTabId} is now starred and saved.`);
                });
            } else {
                // If the tab is already saved
                if (savedTab.starred) {
                    // If it is currently starred, unstar it
                    savedTab.starred = false;
                    return setChromeStorage({ savedPages }).then(() => {
                        updateTabState(parsedTabId, 'star', false); // Update the star state in UI
                        console.log(`Tab ${parsedTabId} is now unstarred but still saved.`);
                    });
                } else {
                    // If it is not starred, star it
                    savedTab.starred = true;
                    return setChromeStorage({ savedPages }).then(() => {
                        updateTabState(parsedTabId, 'star', true); // Update the star state in UI
                        console.log(`Tab ${parsedTabId} is now starred.`);
                    });
                }
            }
        })
        .catch((error) => {
            console.error('Error accessing local storage:', error);
        });
}

export function toggleVolume(tabData) {
    const parsedTabId = parseInt(tabData.tabId, 10);

    // Validate that parsedTabId is a valid number
    if (isNaN(parsedTabId)) {
        console.error('Invalid tabId:', tabData.tabId);
        return;
    }

    chrome.tabs.get(parsedTabId, (tab) => {
        if (chrome.runtime.lastError) {
            console.error('Failed to get tab:', chrome.runtime.lastError.message);
            return;
        }

        if (tab && tab.audible !== undefined) {
            const newMutedState = !tab.mutedInfo.muted;
            chrome.tabs.update(parsedTabId, { muted: newMutedState }, () => {
                if (chrome.runtime.lastError) {
                    console.error('Failed to update tab volume:', chrome.runtime.lastError.message);
                    return;
                }

                console.log('toggleVolume', newMutedState);

                updateTabState(parsedTabId, 'volume', true, true, newMutedState);

                // If the tab is saved, update its mute state in storage
                getChromeStorage(['savedPages'])
                    .then((result) => {
                        const savedPages = result.savedPages || {};
                        const savedTab = savedPages[parsedTabId];

                        if (savedTab) {
                            savedTab.muted = newMutedState;
                            return setChromeStorage({ savedPages });
                        }
                    })
                    .then(() => {
                        console.log(`Muted state for tab ${parsedTabId} saved.`);
                    })
                    .catch((error) => {
                        console.error('Failed to save updated mute state:', error);
                    });
            });
        }
    });
}

