import { updateTabState } from './popup-dom.js';
import { calculateTabStatistics, saveSessionData } from "./popup-data.js";
import { getChromeStorage, setChromeStorage } from "../../../utils/chrome-util.js";

export function toggleSave(tabData) {
    chrome.tabs.get(tabData.tabId, (tab) => {
        if (chrome.runtime.lastError) {
            console.error('Error getting tab info:', chrome.runtime.lastError);
            return;
        }

        getChromeStorage(['savedPages']).then((result) => {
            const savedPages = result.savedPages || {};
            const savedTab = savedPages[tabData.tabId];
            const isPinned = tab.pinned; // Get actual pinned state from chrome.tabs

            if (savedTab) {
                // Remove the tab from savedPages
                delete savedPages[tabData.tabId];
                updateTabState(tabData.tabId, 'save', false); // Update the button state
                updateTabState(tabData.tabId, 'star', false); // Update the button state
            } else {
                // Add the tab to savedPages with its current state
                savedPages[tabData.tabId] = {
                    ...tabData, // Include all data from tabData
                    date: new Date().toLocaleString(), // Add save date
                    pinned: isPinned, // Use actual pinned state from chrome.tabs
                    starred: tabData.starred || false, // Save starred state if it exists
                    muted: tabData.muted || false, // Save muted state if it exists
                    saved: true
                };
                updateTabState(tabData.tabId, 'save', true); // Update the button state
            }

            // Save the updated savedPages back to storage
            return setChromeStorage({ savedPages });
        }).then(() => {
            console.log(`Tab ${tabData.tabId} saved state toggled.`);
        }).catch((error) => {
            console.error('Error accessing local storage:', error);
        });
    });
}


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

export async function closeTab(tabId) {
    const parsedTabId = parseInt(tabId, 10);
    const { confirmClose } = await getChromeStorage(['confirmClose'])

    const removeTab = () => {
        chrome.tabs.remove(parsedTabId, () => {
            if (chrome.runtime.lastError) {
                console.error('Failed to remove tab:', chrome.runtime.lastError.message);
                return;
            }

            const row = document.querySelector(`tr[data-tab-id="${tabId}"]`);
            if (row) row.remove();

            chrome.tabs.query({}, function (tabs) {
                updateTabCounter(tabs);
            });
        });
    };

    if (!!confirmClose) {
        Swal.fire({
            title: 'Are you sure?',
            text: "Do you want to close this tab?",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, close it!'
        }).then((result) => {
            if (result.isConfirmed) {
                removeTab();
            }
        });
    } else {
        removeTab();
    }
}

function updateTabCounter(tabs) {
    // Calculate statistics
    const { totalWindows, totalTabs, inactiveTabs } = calculateTabStatistics(tabs);

    // Update the UI statistics
    document.getElementById('total-windows').textContent = totalWindows;
    document.getElementById('total-tabs').textContent = totalTabs;
    document.getElementById('inactive-tabs').textContent = inactiveTabs;
}

export function openMissionControl(e) {
    if(e) e.preventDefault();

    // Generate the URL for the "Mission Control" page located in a subfolder
    const missionControlUrl = chrome.runtime.getURL('components/mission-control/mission-control.html');

    // Check if a Mission Control tab is already open
    chrome.tabs.query({}, function (tabs) {
        const missionControlTab = tabs.find(tab => tab.url === missionControlUrl);
        if (missionControlTab) {
            // Focus on the existing Mission Control tab
            chrome.tabs.update(missionControlTab.id, { active: true }, function () {
                // Then, focus the window it belongs to
                chrome.windows.update(missionControlTab.windowId, { focused: true });
            });
        } else {
            // Open the "Mission Control" page in a new tab
            chrome.tabs.create({ url: missionControlUrl });
        }
    });
}


export async function saveGroupSessionAndCloseTabs(groupTitle, tabsInGroup) {
    saveSessionData(groupTitle, tabsInGroup);

    const res = await Swal.fire({
        title: 'Session saved successfully!',
        text: "Do you want to close all tabs from session?",
        icon: 'success',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, close them!',
        cancelButtonText: 'No, keep them'
    });

    if(res.isConfirmed) {
        closeTabs(tabsInGroup.map(tab => tab.id));
    }
}

function closeTabs(tabIds) {
    chrome.tabs.remove(tabIds, () => {
        console.log('Tabs closed successfully.');
    });
}
