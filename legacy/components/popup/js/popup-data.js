import { sendChromeMessage, getChromeStorage, setChromeStorage } from '../../../utils/chrome-util.js';
import { getRootDomain } from "../../../utils/utils.js";
import { closeAndClearModal, refreshTabRow, renderTabDetailsNotes } from "./popup-dom.js";




export function getAllTabsAndCounts() {
    return sendChromeMessage('getAllTabsAndCounts', { action: 'getAllTabsAndCounts' }, 'tabs');
}

export function getPreferences() {
    return getChromeStorage(['currentGrouping', 'currentOrdering']);
}

export const calculateTabStatistics = (tabs) => {
    const flatTabs = flattenTabs(tabs);
    return {
        totalWindows: getTotalWindows(flatTabs),
        totalTabs: flatTabs.length,
        inactiveTabs: countInactiveTabs(flatTabs)
    };
};

export const getDuplicateCounts = (tabs) => {
    return tabs.reduce((counts, tab) => {
        counts[tab.url] = (counts[tab.url] || 0) + 1;
        return counts;
    }, {});
};

export function groupTabs(tabs, criteria) {
    const flatTabs = flattenTabs(tabs);

    const groups = flatTabs.reduce((acc, tab) => {
        const key = getGroupKey(tab, criteria);
        if (!acc[key]) acc[key] = [];
        acc[key].push(tab);
        return acc;
    }, {});
    return applySpecialGroupingRules(groups, criteria);
}

export function orderTabs(tabs, criteria) {
    if (!tabs) return [];
    if (Array.isArray(tabs)) {
        return sortTabsArray(tabs, criteria);
    } else {
        return Object.keys(tabs).reduce((orderedGroups, groupKey) => {
            orderedGroups[groupKey] = sortTabsArray(tabs[groupKey], criteria);
            return orderedGroups;
        }, {});
    }
}

export function countInactiveTabs(tabs) {
    return tabs.filter(tab => tab.discarded).length;
}

export function getGroupKey(tab, criteria) {
    switch (criteria) {
        case 'WindowId':
            return tab.windowId;
        case 'Domain':
            return getRootDomain(tab.url);
        case 'Pinned':
            return tab.pinned ? 'Pinned' : 'Not Pinned';
        case 'Starred':
            return tab.starred ? 'Starred' : 'Not Starred';
        case 'Saved':
            return tab.saved ? 'Saved' : 'Not Saved';
        case 'Audible':
            return tab.audible ? 'Audible' : 'Not Audible';
        default:
            return 'Others';
    }
}

export async function getTabsInGroup(groupTitle, currentTabs, currentGrouping, methodCalled = '') {

    if (!Array.isArray(currentTabs) || !currentGrouping) {
        console.error('Invalid input to getTabsInGroup:', { groupTitle, currentTabs, currentGrouping });
        return [];
    }

    const result = await getChromeStorage(['windows']);

    const windows = result.windows || {};

    const groupingMap = {
        'WindowId': tab => (windows[tab.windowId]?.title || `Window ${tab.windowId}`) === groupTitle,
        'Domain': tab => getRootDomain(tab.url) === groupTitle,
        'Starred': tab => groupTitle === 'Pawed' ? tab.starred : groupTitle === 'Not Pawed' ? !tab.starred : false,
        'Pinned': tab => groupTitle === 'Pinned' ? tab.pinned : groupTitle === 'Not Pinned' ? !tab.pinned : false,
        'Saved': tab => groupTitle === 'Saved' ? tab.saved : groupTitle === 'Not Saved' ? !tab.saved : false
    };

    const filterFn = groupingMap[currentGrouping];
    if (!filterFn) {
        console.warn('Unknown grouping type:', currentGrouping);
        return [];
    }
    return currentTabs.filter(filterFn);
}

export function removeNoteFromTab(tabId, indexToRemove) {
    getChromeStorage(['savedPages'])
        .then(result => {
            const savedPages = result.savedPages || {};
            const tabData = savedPages[tabId];

            if (tabData && Array.isArray(tabData.notes)) {
                tabData.notes.splice(indexToRemove, 1);

                // Save the updated object back to chrome storage
                chrome.storage.local.set({ savedPages }, () => {
                    renderTabDetailsNotes(tabId, tabData.notes); // Re-render notes
                    refreshTabRow(tabId);  // Refresh the tab row to update the UI
                });
            } else {
                console.error('No notes found for this tab or tab does not exist.');
            }
        })
        .catch(error => {
            console.error('Error retrieving saved pages:', error);
        });
}

export async function saveNotesForGroup(group, tabs, grouping, noteData, callback) {
    const tabsInGroup = await getTabsInGroup(group, tabs, grouping);
    if (tabsInGroup.length > 0) {
        updateStorageForTabs(tabsInGroup, 'notes', [noteData], callback);
    } else {
        console.error('No tabs found in the selected group.');
    }
}

export function saveNoteForSingleTab(tabId, noteData, callback) {
    updateStorageForTabs([{ id: tabId }], 'notes', [noteData], callback);
}

export function updateStorageForTabs(tabs, key, value, callback) {
    getChromeStorage(['savedPages'])
        .then((result) => {
            const savedPages = result.savedPages || {};
            tabs.forEach(tab => {
                initializeTabData(savedPages, tab.id);
                if (key === 'tags') {
                    updateTags(savedPages, tab.id, value);
                } else if (key === 'notes') {
                    updateNotes(savedPages, tab.id, value);
                }
            });
            return setChromeStorage({ savedPages }); // Return the promise from setChromeStorage
        })
        .then(() => {
            if (callback) callback();
        })
        .catch(error => {
            console.error('Error accessing local storage:', error);
            if (callback) callback(error); // Ensure callback is called with error
        });
}


function flattenTabs(tabs) {
    return Array.isArray(tabs) ? tabs : Object.values(tabs).flat();
}

function getTotalWindows(tabs) {
    return new Set(tabs.map(tab => tab.windowId)).size;
}

function applySpecialGroupingRules(groups, criteria) {
    if (criteria === 'Domain') {
        return sortGroupsByDomain(groups);
    }
    if (['Pinned', 'Starred', 'Saved', 'Audible'].includes(criteria)) {
        return prioritizeGroups(groups, criteria);
    }
    return groups;
}

function sortTabsArray(tabsArray, criteria) {
    if (!Array.isArray(tabsArray)) return [];
    switch (criteria) {
        case 'Domain':
            return tabsArray.sort((a, b) => getRootDomain(a.url).localeCompare(getRootDomain(b.url)));
        case 'WindowId':
            return tabsArray.sort((a, b) => a.windowId - b.windowId);
        case 'Pinned':
            return tabsArray.sort((a, b) => b.pinned - a.pinned);
        case 'Starred':
            return tabsArray.sort((a, b) => (b.starred ? 1 : 0) - (a.starred ? 1 : 0));
        case 'Saved':
            return tabsArray.sort((a, b) => (b.saved ? 1 : 0) - (a.saved ? 1 : 0));
        case 'Audible':
            return tabsArray.sort((a, b) => compareAudibleTabs(a, b));
        default:
            return tabsArray;
    }
}

function sortGroupsByDomain(groups) {
    return Object.keys(groups)
        .sort((a, b) => a.localeCompare(b))
        .reduce((orderedGroups, key) => {
            orderedGroups[key] = groups[key];
            return orderedGroups;
        }, {});
}

function prioritizeGroups(groups, criteria) {
    const prioritizedKey = criteria;
    const nonPrioritizedKey = `Not ${criteria}`;
    const prioritizedGroups = {};
    if (groups[prioritizedKey]) prioritizedGroups[prioritizedKey] = groups[prioritizedKey];
    if (groups[nonPrioritizedKey]) prioritizedGroups[nonPrioritizedKey] = groups[nonPrioritizedKey];
    return prioritizedGroups;
}

function compareAudibleTabs(a, b) {
    if (b.audible && b.muted) return 1;
    if (a.audible && a.muted) return -1;
    if (b.audible && !b.muted) return 1;
    if (a.audible && !a.muted) return -1;
    return 0;
}

function initializeTabData(savedPages, tabId) {
    if (!savedPages[tabId]) {
        savedPages[tabId] = { tags: [], notes: [] };
    }
}

function updateTags(savedPages, tabId, value) {
    if (!Array.isArray(savedPages[tabId].tags)) {
        savedPages[tabId].tags = [];
    }
    savedPages[tabId].tags = Array.from(new Set([...savedPages[tabId].tags, ...value]));
}

function updateNotes(savedPages, tabId, value) {
    if (!Array.isArray(savedPages[tabId].notes)) {
        savedPages[tabId].notes = [];
    }
    savedPages[tabId].notes = [...savedPages[tabId].notes, ...value];
}


// Function to remove a tag from a specific tab
export function removeTagFromTab(tabId, tagToRemove, method = '') {
    return new Promise((resolve, reject) => {
        getChromeStorage(['savedPages'])
            .then((result) => {
                const savedPages = result.savedPages || {};
                const savedTab = savedPages[tabId];

                if (savedTab && savedTab.tags) {
                    const updatedTags = savedTab.tags.filter(existingTag => existingTag !== tagToRemove);
                    savedTab.tags = updatedTags;

                    return setChromeStorage({ savedPages }).then(() => ({ tabId, updatedTags }));
                } else {
                    reject(`No tags found for tab ID ${tabId} or tab does not exist.`);
                }
            })
            .then(({ tabId, updatedTags }) => {
                console.log(method + ` removeTagFromTab -> Tag "${tagToRemove}" removed from tab ID: ${tabId}`);
                resolve({ tabId, updatedTags });
            })
            .catch((error) => {
                console.error('Error removing tag:', error);
                reject(error);
            });
    });
}

// Function to save data for multiple tabs
export function saveDataForTabs(tabIdList, type, data, modalId, updateCallback) {
    saveData(tabIdList, type, data)
        .then((savedPages) => {
            if (modalId) {
                closeAndClearModal(modalId);
            }
            tabIdList.forEach((tabId) => updateCallback(tabId, savedPages[tabId][type]));
        })
        .catch((error) => {
            console.error('Error accessing local storage:', error);
        });
}

// Helper function to handle saving data for tabs
function saveData(tabIdList, type, data) {
    return getChromeStorage(['savedPages'])
        .then((result) => {
            const savedPages = result.savedPages || {};

            tabIdList.forEach((tabId) => {
                let savedTab = savedPages[tabId] || {};

                let tabData = null;
                let noteData = null;
                let tagsData = null;
                let tabGroups = null;

                if(Array.isArray(data)) {
                    const foundTab = data?.find(tab => tab.tabData.tabId === tabId);
                    tabData = foundTab?.tabData;
                    noteData = foundTab?.noteData;
                    tagsData = foundTab?.tagsData;
                    tabGroups = foundTab?.tabGroups;
                } else {
                    tabData = data?.tabData;
                    noteData = data?.noteData;
                    tagsData = data?.tagsData;
                    tabGroups = data?.tabGroups;
                }

                if(Object.keys(savedTab).length === 0 && tabData) savedTab = tabData;

                if (type === 'notes') {
                    savedTab.notes = savedTab.notes || [];
                    savedTab.notes.push(noteData);
                } else if (type === 'tags') {
                    savedTab.tags = Array.from(new Set([...(savedTab.tags || []), ...tagsData]));
                }
                else if (type === 'tabGroups') {
                    savedTab.tabGroups = tabGroups;
                }

                savedPages[tabId] = savedTab;
            });

            return setChromeStorage({ savedPages }).then(() => savedPages);
        });
}

export function saveSessionData(sessionName, tabs) {
    const sessionId = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const session = {
        id: sessionId,
        sessionName,
        dateTime: new Date().toLocaleString(),
        tabs
    };

    getChromeStorage(['savedSessions']).then((result) => {
        const savedSessions = result.savedSessions || [];
        savedSessions.push(session);
        setChromeStorage({ savedSessions }).then(() => {
            console.log('Session saved successfully:', session);
        }).catch((error) => {
            console.error('Error saving session data:', error);
        });
    }).catch((error) => {
        console.error('Error retrieving saved sessions:', error);
    });
}

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

export function openUnderTheSameWindow(tabs) {
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

export async function backupCurrentState() {
    const chromeWindows = await chrome.windows.getAll({ populate: true });

    // Get backups and window names from storage
    const result = await getChromeStorage(['backups', 'windows']);
    const backups = result.backups || [];
    const savedWindows = result.windows || {}; // { [windowId: string]: windowName }

    const backup = chromeWindows.map(win => ({
        focused: win.focused,
        incognito: win.incognito,
        state: win.state,
        windowId: win.id,
        windowName: savedWindows[win.id?.toString()]?.title || undefined, // Match saved name if available
        tabs: (win.tabs || []).map(tab => ({
            url: tab.url,
            pinned: tab.pinned,
            active: tab.active,
            title: tab.title,
            favIconUrl: tab.favIconUrl,
            audible: tab.audible,
            muted: tab.muted || tab.mutedInfo?.muted,
        }))
    }));

    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');
    const formattedDate = `${year}_${month}_${day}`;

    backups.unshift({
        id: `backup_${Date.now()}`,
        name: `Automatic_Wizard_Backup_${formattedDate}`,
        dateTime: new Date().toLocaleString(),
        windows: backup,
        description: 'Automatic Backup done before Wizard',
    });

    await setChromeStorage({ backups });
}



