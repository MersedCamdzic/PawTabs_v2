import { getChromeStorage, setChromeStorage } from "../../../utils/chrome-util.js";

export function getSessions() {
    return getChromeStorage(['savedSessions']).then((result) => result.savedSessions || []);
}

export function getGroups() {
    return getChromeStorage(['savedGroups']).then((result) => result.savedGroups || []);
}

export function removeSession(sessionId) {
    return getChromeStorage(['savedSessions']).then((result) => {
        const savedSessions = result.savedSessions || [];
        const newSessions = savedSessions.filter(({id}) => id !== sessionId);
        return setChromeStorage({savedSessions: newSessions});
    });
}

export function removeGroup(groupId) {
    return getChromeStorage(['savedGroups', 'savedPages']).then((result) => {
        const savedGroups = result.savedGroups || [];
        const savedPages = result.savedPages || {};

        // Remove the group from savedGroups
        const newGroups = savedGroups.filter(({ id }) => id !== groupId);

        // Remove the group assignment from savedPages if it matches the groupId
        const newPages = Object.fromEntries(
            Object.entries(savedPages).map(([tabId, tabData]) => {
                if (
                    tabData.tabGroups &&
                    tabData.tabGroups.id === groupId
                ) {
                    tabData.tabGroups = undefined;
                }
                return [tabId, tabData];
            })
        );

        // Save updated data
        return setChromeStorage({
            savedGroups: newGroups,
            savedPages: newPages
        });
    });
}


export function restoreSession(tabs) {
    if (!tabs || tabs.length === 0) return;

    // Open the first tab in a new window
    chrome.windows.create(
        { url: tabs[0].url, focused: true }, 
        (newWindow) => {
            const windowId = newWindow.id;

            // Add remaining tabs one by one
            tabs.slice(1).forEach((tab) => {
                chrome.tabs.create({
                    windowId,
                    url: tab.url,
                    pinned: tab.pinned || false
                });
            });

            // Ensure the first tab is pinned if needed
            if (tabs[0].pinned) {
                chrome.tabs.update(newWindow.tabs[0].id, { pinned: true });
            }
        }
    );
}

export function saveSessionData(sessionName, tabs) {
    const session = {
        id: `session_${Date.now()}`, // Unique session ID
        sessionName,
        dateTime: new Date().toLocaleString(),
        tabs,
    };

    return getChromeStorage(['savedSessions']).then((result) => {
        const savedSessions = result.savedSessions || [];
        savedSessions.push(session);

        return setChromeStorage({ savedSessions });
    });
}

export function saveGroupData(groupName, groupColor, tabs) {
    const groupId = `group_${Date.now()}`; // Unique group ID

    const currentDate = new Date().toLocaleString();

    const group = {
        id: groupId, 
        name: groupName,
        color: groupColor,
        dateTime: currentDate,
        lastUpdatedAt: currentDate,
        tabs,
    };

    return getChromeStorage(['savedGroups']).then((result) => {
        const savedGroups = result.savedGroups || [];
        savedGroups.push(group);

        return setChromeStorage({ savedGroups }).then(() => groupId );
    });
}

export function editGroupData(groupId, groupName, groupColor) {
    return getChromeStorage(['savedGroups', 'savedPages']).then((result) => {
        const savedGroups = result.savedGroups || [];
        const savedPages = result.savedPages || {};

        const groupIndex = savedGroups.findIndex(group => group.id === groupId);
        if (groupIndex === -1) {
            throw new Error(`Group with ID ${groupId} not found`);
        }

        // Prepare the updated group object
        const updatedGroup = {
            ...savedGroups[groupIndex],
            name: groupName,
            color: groupColor,
            lastUpdatedAt: new Date().toLocaleString(),
        };

        // Update the group in savedGroups
        savedGroups[groupIndex] = updatedGroup;

        // Update the group in all tabs in savedPages
        for (const tabId in savedPages) {
            const page = savedPages[tabId];
            if (page.tabGroups && page.tabGroups.id === groupId) {
                page.tabGroups = { ...updatedGroup };
            }
        }

        // Save both updated savedGroups and savedPages
        return setChromeStorage({ savedGroups, savedPages }).then(() => groupId);
    });
}

export const getWindows = () => getChromeStorage(['windows']).then(result => result.windows || {});

export const getBackups = () => getChromeStorage(['backups']).then(result => result.backups || {});

export const getSavedTabs = () => getChromeStorage(['savedPages']).then(result => result.savedPages || {});

export const updateTab = (oldTabId, newTabId, additionalData =  null) => {
    return getChromeStorage(['savedPages']).then(result => {
        const savedPages = result.savedPages || {};

        const tabData = savedPages[oldTabId];
        tabData.tabId = newTabId;

        delete savedPages[oldTabId];

        savedPages[newTabId] = tabData;

        if(additionalData) {
            savedPages[newTabId] = {
                ...savedPages[newTabId],
                ...additionalData
            }
        }

        return setChromeStorage({savedPages});
    })
}

export function updateSessionData(sessionId, newData) {
    return getChromeStorage(['savedSessions']).then((result) => {
        let savedSessions = result.savedSessions || [];
        
        savedSessions = savedSessions.map(session => {
            if (session.id === sessionId) {
                return { ...session, ...newData };
            }
            return session;
        });

        return setChromeStorage({ savedSessions });
    });
}

export function updateGroupData(groupId, newData) {
    return getChromeStorage(['savedGroups']).then((result) => {
        let savedGroups = result.savedGroups || [];
        
        savedGroups = savedGroups.map(group => {
            if (group.id === groupId) {
                return { ...group, ...newData };
            }
            return group;
        });

        return setChromeStorage({ savedGroups });
    });
}

export function saveTab(tab) {
    return getChromeStorage(['savedPages']).then((result) => {
        const savedPages = result.savedPages || [];
        savedPages[tab.tabId] = tab;

        return setChromeStorage({ savedPages });
    });
}

export const removeTabFromStrorage = (tabId) => {
    if (!tabId) return;

    getChromeStorage(['savedPages']).then(result => {
        const savedPages = result.savedPages || {};

       delete savedPages[tabId];

        setChromeStorage({ savedPages }).then(() => {
            console.log('savedPages updated successfully:', savedPages);
        }).catch((error) => {
            console.error('Error saving savedPages data:', error);
        });
    }).catch((error) => {
        console.error('Error retrieving savedPages:', error);
    });
};

export const saveWindowData = (windowData = {}) => {
    const { id, title } = windowData;
    if (!id || !title) return;

    getChromeStorage(['windows']).then(result => {
        const windows = result.windows || {};

        windows[id] = {
            title
        };

        setChromeStorage({ windows }).then(() => {
            console.log('Session windows successfully:', windowData);
        }).catch((error) => {
            console.error('Error saving windows data:', error);
        });
    }).catch((error) => {
        console.error('Error retrieving  windows:', error);
    });
};