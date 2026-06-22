chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getAllTabsAndCounts') {
        chrome.windows.getAll({ populate: true }, (windows) => {
            const tabCount = windows.reduce((acc, window) => acc + window.tabs.length, 0);
            const inactiveTabCount = windows.reduce((acc, window) => acc + window.tabs.filter(tab => tab.discarded).length, 0);
            const tabs = windows.flatMap(window => window.tabs.map(tab => ({
                audible: tab.audible || false,
                discarded: tab.discarded,
                favIconUrl: tab.favIconUrl || '',
                id: tab.id,
                lastAccessed: tab.lastAccessed,
                muted: tab.mutedInfo ? tab.mutedInfo.muted : false,
                pinned: tab.pinned || false,
                title: tab.title,
                url: tab.url,
                windowId: tab.windowId
            })));

            sendResponse({
                windowCount: windows.length,
                tabCount,
                inactiveTabCount,
                tabs
            });
        });
        return true; // Keep the message channel open for sendResponse
    }
});

let isPopupOpen = false;

chrome.commands.onCommand.addListener(async (command) => {
    if (command === 'open_popup') {
        if (isPopupOpen) {
            console.log('Popup is already open');
            return;
        }

        // First, check if there is an active window
        chrome.windows.getCurrent({ populate: true }, (window) => {
            if (window && window.id && window.state !== 'minimized') {
                // Ensure there’s also an active tab in the window
                chrome.tabs.query({ active: true, windowId: window.id }, (tabs) => {
                    if (tabs.length > 0) {
                        // Proceed to open the popup if an active tab exists
                        isPopupOpen = true;
                        chrome.action.openPopup().then(() => {
                            isPopupOpen = false;
                        }).catch((error) => {
                            console.error('Error opening the popup:', error);
                            isPopupOpen = false;  // Reset popup state in case of error
                        });
                    } else {
                        console.error('No active tab found');
                    }
                });
            } else {
                console.error('No active window found or window is minimized');
            }
        });
    }
});

async function updateTabPinnedStatus(tabId, isPinned, tab) {
    try {
        const result = await chrome.storage.local.get('savedPages');
        let savedPages = result.savedPages || {}; // Default to an empty object if nothing is saved

        if (savedPages[tabId]) {
            savedPages[tabId].pinned = isPinned;
            await chrome.storage.local.set({ savedPages });
            console.log(`Tab ${tabId} ${isPinned ? 'pinned' : 'unpinned'} and updated in storage.`);
        }


    } catch (error) {
        console.error('Error updating savedPages:', error);
    }
}

async function updateTabPinnedStatusForSessions(tabId, isPinned) {
    try {
        const result = await chrome.storage.local.get('savedSessions');
        let savedSessions = result.savedSessions || []; // Default to empty array if not found

        const updatedSessions = savedSessions.map(session => ({
            ...session,
            tabs: session.tabs.map(tab =>
                tab.id === tabId ? { ...tab, pinned: isPinned } : tab
            )
        }));

        await chrome.storage.local.set({ savedSessions: updatedSessions });
        console.log(`Tab ${tabId} ${isPinned ? 'pinned' : 'unpinned'} in savedSessions updated in storage.`);
    } catch (error) {
        console.error('Error updating savedSessions:', error);
    }
}

// Listener for tab updates (pinned/unpinned)
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.pinned !== undefined) {
        await Promise.all([updateTabPinnedStatus(tabId, changeInfo.pinned), updateTabPinnedStatusForSessions(tabId, changeInfo.pinned)]);
    }
});



