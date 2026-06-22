// Utility Functions
import { getChromeStorage, setChromeStorage, focusTabById } from '../../../utils/chrome-util.js';
import { escapeHtml, getPlaceholderIconUrl, getRootDomain } from "../../../utils/utils.js";
import {
    closeTab,
    openMissionControl,
    togglePin,
    toggleSave,
    toggleStar,
    toggleVolume,
    saveGroupSessionAndCloseTabs
} from "./popup-tab.js";

import {
    extractTabData,
    handleTagClick,
    moveTabsToNewWindow,
    openNotesModal,
    openTabGroupsModal,
    openTabDetailsModal,
    openTagsModal,
    updateGroupingOrderingStyles,
    updatePopup,
    updateTabDetailsBadge,
    updateTagsForSpecificTab,
    updateTabGroupBadge,
    closeNotesModal,
    updateTheme,
    removeTagElements,
    renderTabDetailsTags,
    openChangeTabWindowModal,
    moveTabToNewWindow,
    closeAndClearModal,
    closeDiscardedTabs,
    closeDuplicateTabs,
    regroupIntoNewWindows,
    splitLargeWindows,
} from "./popup-dom.js";

// Popup Data Operations
import { backupCurrentState, getTabsInGroup, groupTabs, openUnderTheSameWindow, orderTabs, removeTagFromTab, saveDataForTabs } from "./popup-data.js";

// Popup State Management
import {
    getCurrentTabs,
    getGroupingContext,
    getOrderingContext,
    getSelectedGroup,
    getSelectedTab,
    getSelectedTabId,
    getTagsChoicesInstance,
    setGroupingContext,
    setOrderingContext
} from "./popup-state.js";

// Miscellaneous
import { initializeExtension, loadTabsList } from "../popup.js";

let typingTimer;
const typingDelay = 300;

export const REGROUP_WINDOWS_WITH_FEWER_THAN_DEFAULT = 2;
export const SPLIT_INTO_WINDOWS_WITH_UP_TO_DEFAULT = 5;
export const SPLIT_WINDOWS_WITH_MORE_THAN_DEFAULT = 20;


const groupingActions = {
    'group-by-window-id': 'WindowId',
    'group-by-domain': 'Domain',
    'group-by-pinned': 'Pinned',
    'group-by-starred': 'Starred',
    'group-by-saved': 'Saved',
    'group-by-audible': 'Audible'
};
const orderingActions = {
    'order-by-window-id': 'WindowId',
    'order-by-domain': 'Domain',
    'order-by-pinned': 'Pinned',
    'order-by-starred': 'Starred',
    'order-by-saved': 'Saved',
    'order-by-audible': 'Audible'
};


// Exported Functions
export function attachTagRemoveListeners(container) {
    const tagRemoveButtons = container.querySelectorAll('.tag-close-btn');
    tagRemoveButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            event.preventDefault();
            const tagContainer = button.parentElement;
            const tabId = tagContainer.getAttribute('data-tab-id');
            const tagToRemove = tagContainer.getAttribute('data-tag');
            if (tabId && tagToRemove) {
                removeTagFromTab(tabId, tagToRemove, 'attachTagRemoveListeners')
                    .then(({ tabId, updatedTags }) => {
                        removeTagElements(tabId, tagToRemove);
                        updateTagsForSpecificTab(tabId, updatedTags);
                        renderTabDetailsTags(tabId, updatedTags);
                    })
                    .catch(error => {
                        console.error('Error removing tag:', error);
                    });
            }
        });
    });
}

export function handleSearchInput(event, currentTabs) {
    getChromeStorage(['savedPages', 'currentGrouping', 'currentOrdering']).then(result => {
        const { query, savedPages } = getFilteringData(event, result.savedPages);
        const filteredTabs = filterTabs(currentTabs, query, savedPages);
        const filteredGroupedTabs = applyGroupingAndOrdering(filteredTabs, result.currentGrouping, result.currentOrdering);
        updatePopup(filteredGroupedTabs, result.currentGrouping);
    }).catch(err => {
        console.error('Error retrieving data from Chrome storage:', err);
    });
}

export async function setupDarkModeToggleListener() {
    const darkModeSwitch = document.getElementById('darkModeSwitch');

    if (!darkModeSwitch) {
        return;
    }

    await applyDarkModeSetting();
    darkModeSwitch.removeEventListener('change', handleDarkModeToggle);
    darkModeSwitch.addEventListener('change', handleDarkModeToggle);
}

export async function setupSettingsRegroupWindows() {
    const regroupWindowsLabel = document.getElementById('regroupWindowsLabel');

    if (!regroupWindowsLabel) {
        return;
    }

    const result = await getChromeStorage(['regroupWindowsWithFewerThan', 'splitIntoWindowsWithUpTo']);
    const regroupWindowsWithFewerThan = result.regroupWindowsWithFewerThan || REGROUP_WINDOWS_WITH_FEWER_THAN_DEFAULT;
    const splitIntoWindowsWithUpTo = result.splitIntoWindowsWithUpTo || SPLIT_INTO_WINDOWS_WITH_UP_TO_DEFAULT;

    regroupWindowsLabel.innerHTML = `Regroup Windows with fewer than ${regroupWindowsWithFewerThan} Tabs into Windows with up to ${splitIntoWindowsWithUpTo} Tabs`;
}

export async function setupSettingsSplitWindows() {
    const splitWindowsLabel = document.getElementById('splitWindowsLabel');

    if (!splitWindowsLabel) {
        return;
    }

    const result = await getChromeStorage(['splitIntoWindowsWithUpTo', 'splitWindowsWithMoreThan']);
    const splitIntoWindowsWithUpTo = result.splitIntoWindowsWithUpTo || SPLIT_INTO_WINDOWS_WITH_UP_TO_DEFAULT;
    const splitWindowsWithMoreThan = result.splitWindowsWithMoreThan || SPLIT_WINDOWS_WITH_MORE_THAN_DEFAULT;

    splitWindowsLabel.innerHTML = `Split Windows with more than ${splitWindowsWithMoreThan} Tabs into Windows with up to ${splitIntoWindowsWithUpTo} Tabs`;
}

export async function setupConfirmCloseToggleListener() {
    const confirmCloseSwitch = document.getElementById('confirmCloseSwitch');

    if (!confirmCloseSwitch) {
        return;
    }

    await applyConfirmCloseSetting();
    confirmCloseSwitch.removeEventListener('change', handleConfirmCloseToggle);
    confirmCloseSwitch.addEventListener('change', handleConfirmCloseToggle);
}

export async function setupSettingsRegroupWindowsWithFewerThan() {
    const regroupWindowsWithFewerThan = document.getElementById('regroupWindowsWithFewerThan');
    const regroupWindowsWithFewerThanMinus = document.getElementById('regroupWindowsWithFewerThanMinus');
    const regroupWindowsWithFewerThanPlus = document.getElementById('regroupWindowsWithFewerThanPlus');

    const result = await getChromeStorage(['regroupWindowsWithFewerThan']);
    const regroupWindowsWithFewerThanValue = result.regroupWindowsWithFewerThan || REGROUP_WINDOWS_WITH_FEWER_THAN_DEFAULT;

    if (!regroupWindowsWithFewerThan || !regroupWindowsWithFewerThanMinus || !regroupWindowsWithFewerThanPlus) {
        return;
    }

    regroupWindowsWithFewerThan.innerHTML = regroupWindowsWithFewerThanValue;

    regroupWindowsWithFewerThanMinus.addEventListener('click', () => {
        const oldValue = Number(regroupWindowsWithFewerThan.innerHTML);
        const newValue = oldValue === 1 ? oldValue : oldValue - 1;
        handleChangeSettingsRegroupWindowsWithFewerThan(newValue);
        regroupWindowsWithFewerThan.innerHTML = newValue;
    });

    regroupWindowsWithFewerThanPlus.addEventListener('click', () => {
        const oldValue = Number(regroupWindowsWithFewerThan.innerHTML);
        const newValue = oldValue + 1;
        handleChangeSettingsRegroupWindowsWithFewerThan(newValue);
        regroupWindowsWithFewerThan.innerHTML = newValue;
    });
}

export async function setupSettingsSplitIntoWindowsWithUpTo() {
    const splitIntoWindowsWithUpTo = document.getElementById('splitIntoWindowsWithUpTo');
    const splitIntoWindowsWithUpToMinus = document.getElementById('splitIntoWindowsWithUpToMinus');
    const splitIntoWindowsWithUpToPlus = document.getElementById('splitIntoWindowsWithUpToPlus');

    const result = await getChromeStorage(['splitIntoWindowsWithUpTo']);
    const settingsSplitMinValue = result.splitIntoWindowsWithUpTo || SPLIT_INTO_WINDOWS_WITH_UP_TO_DEFAULT;

    if (!splitIntoWindowsWithUpTo || !splitIntoWindowsWithUpToMinus || !splitIntoWindowsWithUpToPlus) {
        return;
    }

    splitIntoWindowsWithUpTo.innerHTML = settingsSplitMinValue;

    splitIntoWindowsWithUpToMinus.addEventListener('click', () => {
        const oldValue = Number(splitIntoWindowsWithUpTo.innerHTML);
        const newValue = oldValue === 1 ? oldValue : oldValue - 1;
        handleChangeSettingsSplitIntoWindowsWithUpTo(newValue);
        splitIntoWindowsWithUpTo.innerHTML = newValue;
    });

    splitIntoWindowsWithUpToPlus.addEventListener('click', () => {
        const oldValue = Number(splitIntoWindowsWithUpTo.innerHTML);
        const newValue = oldValue + 1;
        handleChangeSettingsSplitIntoWindowsWithUpTo(newValue);
        splitIntoWindowsWithUpTo.innerHTML = newValue;
    });
}

export async function setupSettingsSplitWindowsWithMoreThan() {
    const splitWindowsWithMoreThan = document.getElementById('splitWindowsWithMoreThan');
    const splitWindowsWithMoreThanMinus = document.getElementById('splitWindowsWithMoreThanMinus');
    const splitWindowsWithMoreThanPlus = document.getElementById('splitWindowsWithMoreThanPlus');

    const result = await getChromeStorage(['splitWindowsWithMoreThan']);
    const settingsSplitMaxValue = result.splitWindowsWithMoreThan || SPLIT_WINDOWS_WITH_MORE_THAN_DEFAULT;

    if (!splitWindowsWithMoreThan || !splitWindowsWithMoreThanMinus || !splitWindowsWithMoreThanPlus) {
        return;
    }

    splitWindowsWithMoreThan.innerHTML = settingsSplitMaxValue;

    splitWindowsWithMoreThanMinus.addEventListener('click', () => {
        const oldValue = Number(splitWindowsWithMoreThan.innerHTML);
        const newValue = oldValue === 1 ? oldValue : oldValue - 1;
        handleChangeSettingsSplitWindowsWithMoreThan(newValue);
        splitWindowsWithMoreThan.innerHTML = newValue;
    });

    splitWindowsWithMoreThanPlus.addEventListener('click', () => {
        const oldValue = Number(splitWindowsWithMoreThan.innerHTML);
        const newValue = oldValue + 1;
        handleChangeSettingsSplitWindowsWithMoreThan(newValue);
        splitWindowsWithMoreThan.innerHTML = newValue;
    });
}

export function setupDropdownListeners() {
    const dropdownItems = document.querySelectorAll('.dropdown-item');
    const hasDropdownItems = dropdownItems.length > 0;

    const logNoDropdownItemsWarning = () => console.warn('No dropdown items found!');
    
    const attachEventListeners = () => {
        dropdownItems.forEach(item => {
            item.removeEventListener('click', handleDropdownClick);
            item.addEventListener('click', handleDropdownClick);
        });
    };

    hasDropdownItems ? attachEventListeners() : logNoDropdownItemsWarning();
}

async function handleSaveNotes() {
    const notesInput = document.getElementById('notes-input');
    const noteText = notesInput.value.trim();

    if (!noteText) {
        return;
    }

    const selectedTab = getSelectedTab();
    const selectedGroup = getSelectedGroup();


    if (selectedTab) {
        const data = { noteData: { note: noteText, date: new Date().toISOString() }, tabData: selectedTab };
        saveDataForTabs([selectedTab.tabId], 'notes', data, 'notesModal', updateTabDetailsBadge);
    } else if (selectedGroup) {
        const tabsInGroup = await getTabsInGroup(selectedGroup, getCurrentTabs(), getGroupingContext());

        const result = await getChromeStorage(['savedPages']);
        const savedTabs = result.savedPages || {};
        const groupData = tabsInGroup.map(tab => {
            const savedTab = savedTabs[tab.id];

            return {
                noteData: { note: noteText, date: new Date().toISOString() }, tabData: {
                    tabId: tab.id,
                    url: tab.url,
                    windowId: tab.windowId,
                    favicon: tab.favIconUrl?.trim() ? tab.favIconUrl : getPlaceholderIconUrl(tab.url),
                    title: escapeHtml(tab.title),
                    date: new Date().toLocaleString(), // Add save date
                    pinned: tab.pinned,
                    starred: false,
                    muted: tab.muted,
                    saved: true,
                    ...(!!savedTab && { ...savedTab })
                }
            }
        });
        const tabIdList = tabsInGroup.map((tab) => tab.id);
        saveDataForTabs(tabIdList, 'notes', groupData, 'notesModal', updateTabDetailsBadge);
    } else {
        console.error('No group or tab selected to add notes.');
    }
}

export function setupSaveNotesListener() {
    const saveNotesButton = document.getElementById('saveNotesButton');
    if (saveNotesButton) {
        saveNotesButton.removeEventListener('click',handleSaveNotes);
        saveNotesButton.addEventListener('click',handleSaveNotes);
    }
}

async function handleSaveTags() {
    const newTags = getTagsChoicesInstance().getValue(true);

    if (newTags.length === 0) {
        return;
    }

    const selectedTab = getSelectedTab();
    const selectedGroup = getSelectedGroup();


    if (selectedTab && selectedGroup == null) {
        saveDataForTabs([selectedTab.tabId], 'tags', { tabData: selectedTab, tagsData: newTags }, 'tagsModal', updateTagsForSpecificTab);
    } else if (selectedGroup) {
        const tabsInGroup = await getTabsInGroup(selectedGroup, getCurrentTabs(), getGroupingContext());

        const result = await getChromeStorage(['savedPages']);
        const savedTabs = result.savedPages || {};
        const groupData = tabsInGroup.map(tab => {
            const savedTab = savedTabs[tab.id];

            return {
                tagsData: newTags, tabData: {
                    tabId: tab.id,
                    url: tab.url,
                    windowId: tab.windowId,
                    favicon: tab.favIconUrl?.trim() ? tab.favIconUrl : getPlaceholderIconUrl(tab.url),
                    title: escapeHtml(tab.title),
                    date: new Date().toLocaleString(), // Add save date
                    pinned: tab.pinned,
                    starred: false,
                    muted: tab.muted,
                    saved: true,
                    ...(!!savedTab && { ...savedTab })
                }
            }
        });
        const tabIdList = tabsInGroup.map((tab) => tab.id);
        saveDataForTabs(tabIdList, 'tags', groupData, 'tagsModal', updateTagsForSpecificTab);
    } else {
        console.error('No group or tab selected to add tags.');
    }
}

export function setupSaveTagsListener() {
    const saveTagsButton = document.getElementById('saveTagsButton');
    if (saveTagsButton) {
        saveTagsButton.removeEventListener('click', handleSaveTags);
        saveTagsButton.addEventListener('click', handleSaveTags);
    }
}

async function handleSaveTabGroups() {
    const changeTabGroupsContainer = document.getElementById("changeTabGroupsContainer");
    const groupId = changeTabGroupsContainer.getAttribute("data-selected-group-id");

    if (!groupId) {
        return;
    }

    const selectedTab = getSelectedTab();
    const selectedGroup = getSelectedGroup();

    if (selectedTab) {

        const result = await getChromeStorage(['savedGroups']);
        let savedGroups = result.savedGroups || [];

        const originalGroup = savedGroups.find(sG => sG.id === groupId);

        const group = { ...originalGroup };
        delete group.tabs;

        saveDataForTabs([selectedTab.tabId], 'tabGroups', { tabData: selectedTab, tabGroups: group }, 'tabGroupsModal', updateTabGroupBadge);

        selectedTab.tabGroups = group;

        savedGroups = savedGroups.map(sG => sG.id === groupId ? { ...sG, tabs: [...(sG.tabs || []).filter(tab => tab.tabId !== selectedTab.tabId), selectedTab] } : { ...sG, tabs: (sG.tabs || []).filter(tab => tab.tabId !== selectedTab.tabId) });

        setChromeStorage({ savedGroups });

    } else if (selectedGroup) {
        const result = await getChromeStorage(['savedGroups']);
        let savedGroups = result.savedGroups || [];

        const originalGroup = savedGroups.find(sG => sG.id === groupId);

        const group = { ...originalGroup };
        delete group.tabs;

        const tabsInGroup = await getTabsInGroup(selectedGroup, getCurrentTabs(), getGroupingContext());
        const groupData = tabsInGroup.map(tab => ({
            tabGroups: group, tabData: {
                tabId: tab.id,
                url: getRootDomain(tab.url),
                windowId: tab.windowId,
                favicon: tab.favIconUrl?.trim() ? tab.favIconUrl : getPlaceholderIconUrl(tab.url),
                title: escapeHtml(tab.title)
            }
        }));
        const tabIdList = tabsInGroup.map((tab) => tab.id);
        saveDataForTabs(tabIdList, 'tabGroups', groupData, 'tabGroupsModal', updateTabGroupBadge);

        const updatedTabs = groupData.map(({ tabData }) => ({ ...tabData, tabGroups: group }));

        // First remove these tabs from all groups
        savedGroups = savedGroups.map(sG => ({
            ...sG,
            tabs: (sG.tabs || []).filter(tab => !tabIdList.includes(tab.tabId))
        }));

        // Then update/add them to the selected group
        savedGroups = savedGroups.map(sG => {
            if (sG.id === groupId) {
                return {
                    ...sG,
                    tabs: [...(sG.tabs || []), ...updatedTabs]
                };
            }
            return sG;
        });

        await setChromeStorage({ savedGroups });
    } else {
        console.error('No group or tab selected to add tabgroup.');
    }
}

export async function setupSaveTabGroupsListener() {
    const saveTabGroupsButton = document.getElementById('saveTabGroupsButton');
    if (saveTabGroupsButton) {
        saveTabGroupsButton.removeEventListener('click', handleSaveTabGroups);
        saveTabGroupsButton.addEventListener('click', handleSaveTabGroups);
    }
}

async function handleSaveChangeTabWindow() {
    const changeTabWindowContainer = document.getElementById("changeTabWindowContainer");
    const windowId = changeTabWindowContainer.getAttribute("data-selected-window-id");

    if (!windowId) {
        return;
    }

    const selectedTabId = getSelectedTabId();
    const selectedGroup = getSelectedGroup();

    if (selectedTabId) {
        moveTabToNewWindow(Number(selectedTabId), Number(windowId));

        closeAndClearModal('changeTabWindowModal');

    } else if (selectedGroup) {
        // TODO Check what to do here
        // const tabsInGroup = await getTabsInGroup(selectedGroup, getCurrentTabs(), getGroupingContext());
        // const tabIdList = tabsInGroup.map((tab) => tab.id);
        // saveDataForTabs(tabIdList, 'tabGroups', tabGroupText, 'tabGroupsModal', updateTabGroupBadge);
    } else {
        console.error('No group or tab selected to add tabgroup.');
    }
}

export function setupSaveChangeTabWindowListener() {
    const saveChangeTabWindowsButton = document.getElementById('saveChangeTabWindowsButton');
    if (saveChangeTabWindowsButton) {
        saveChangeTabWindowsButton.removeEventListener('click', handleSaveChangeTabWindow);
        saveChangeTabWindowsButton.addEventListener('click', handleSaveChangeTabWindow);
    }
}

function handleSearchInputFn (event) {
    const currentTabs = getCurrentTabs();

    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => handleSearchInput(event, currentTabs), typingDelay);
}

export function setupSearchInputListener() {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.removeEventListener('input', handleSearchInputFn);
        searchInput.addEventListener('input', handleSearchInputFn);
    } else {
        console.warn('Search input not found!');
    }
}

export function setupTagRemoveListener() {
    const tabsContainer = document.getElementById('tabs-container');

    if (!tabsContainer) {
        console.warn('Parent container for tags not found. Skipping tag removal listener setup.');
        return;
    }

    tabsContainer.removeEventListener('click', handleTagClick);
    tabsContainer.addEventListener('click', handleTagClick);
}



export function setupTabActionListeners(scope = document) {
    applyButtonListeners(scope, '.star-button', toggleStar);
    applyButtonListeners(scope, '.pin-button', togglePin);
    applyButtonListeners(scope, '.save-button', toggleSave);
    applyButtonListeners(scope, '.volume-button', toggleVolume);

    // Attach event listeners for clickable icons and titles
    applyIconClickListeners(scope, '.clickable-icon, .clickable-title', 'data-tab-id', 'data-window-id', (tabId, windowId) => {
        const targetTabId = parseInt(tabId, 10);
        const targetWindowId = parseInt(windowId, 10);
        focusTabById(targetTabId, targetWindowId);
    });

    addEventListenerToElements(scope, '.close-tab-button', 'click', function () {
        const tabId = this.getAttribute('data-tab-id');
        closeTab(tabId);
    });

    addEventListenerToElements(scope, '.save-this-group-to-session-and-close-tabs', 'click', async function () {
        let groupTitle = this.closest('.card').querySelector('.card-title').textContent;
        const tabsInGroup = await getTabsInGroup(groupTitle, getCurrentTabs(), getGroupingContext());

        const currentDate = new Date();
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
        const day = String(currentDate.getDate()).padStart(2, '0');
        const formattedDate = `${year}_${month}_${day}`;

        groupTitle = `${groupTitle}_${formattedDate}`;

        console.log('groupTitle->>', groupTitle);

        saveGroupSessionAndCloseTabs(groupTitle, tabsInGroup);
    });

    addEventListenerToElements(scope, '.activate-deactivate-groups-at-this-window', 'click', async function () {
        let groupTitle = this.closest('.card').querySelector('.card-title').textContent;

        openTabGroupsModal(groupTitle);
    });

    addEventListenerToElements(scope, '.tab-details-button', 'click', function () {
        const tabId = this.getAttribute('data-tab-id');
        openTabDetailsModal(tabId);
    });

    addEventListenerToElements(scope, '.tag-button', 'click', function () {
        const tabData = {
            tabId: Number(this.getAttribute('data-tab-id')),
            url: this.getAttribute('data-url'),
            windowId: this.getAttribute('data-window-id'),
            title: this.getAttribute('data-title'),
            favicon: this.getAttribute('data-favicon'),
        };
        openTagsModal(null, tabData);
    });

    addEventListenerToElements(scope, '.open-under-same-window', 'click', async function () {
        const groupTitle = this.closest('.card').querySelector('.card-title').textContent;
        const tabsInGroup = await getTabsInGroup(groupTitle, getCurrentTabs(), getGroupingContext());

        openUnderTheSameWindow(tabsInGroup);
    });

    addEventListenerToElements(scope, '.add-tag-to-all-tabs', 'click', function () {
        const groupTitle = this.closest('.card').querySelector('.card-title').textContent;
        openTagsModal(groupTitle);
    });

    addEventListenerToElements(scope, '.note-button', 'click', function () {
        const tabData = {
            tabId: Number(this.getAttribute('data-tab-id')),
            url: this.getAttribute('data-url'),
            windowId: this.getAttribute('data-window-id'),
            title: this.getAttribute('data-title'),
            favicon: this.getAttribute('data-favicon'),
        };
        openNotesModal(null, tabData);
    });

    addEventListenerToElements(scope, '.add-note-to-all-tabs', 'click', function () {
        const groupTitle = this.closest('.card').querySelector('.card-title').textContent;
        openNotesModal(groupTitle);
    });

    addEventListenerToElements(scope, '.change-tab-window-button', 'click', function () {
        const tabId = this.getAttribute('data-tab-id');
        openChangeTabWindowModal(null, tabId);
    });

    addEventListenerToElements(scope, '.tab-groups-button', 'click', function () {
        const tabData = {
            tabId: Number(this.getAttribute('data-tab-id')),
            url: this.getAttribute('data-url'),
            windowId: this.getAttribute('data-window-id'),
            title: this.getAttribute('data-title'),
            favicon: this.getAttribute('data-favicon'),
        };
        openTabGroupsModal(null, tabData);
    });

    addEventListenerToElements(scope, '.closeNotesButton', 'click', function () {
        closeNotesModal();
    });

    const missionControlButton = document.getElementById('open-mission-control');
    if (missionControlButton) {
        missionControlButton.replaceWith(missionControlButton.cloneNode(true));
        document.getElementById('open-mission-control').addEventListener('click', openMissionControl, { once: true });
    }

    const missionControlButtonAdvanced = document.getElementById('open-mission-control-advanced');
    if (missionControlButtonAdvanced) {
        missionControlButtonAdvanced.replaceWith(missionControlButtonAdvanced.cloneNode(true));
        document.getElementById('open-mission-control-advanced').addEventListener('click', openMissionControl, { once: true });
    }

    const tabGroupsManageButton = document.getElementById('tabGroupsModalManageButton');
    if (tabGroupsManageButton) {
        tabGroupsManageButton.replaceWith(tabGroupsManageButton.cloneNode(true));
        document.getElementById('tabGroupsModalManageButton').addEventListener('click', openMissionControl, { once: true });
    }

    addEventListenerToElements(scope, '.clickable-domain', 'click', function (event) {
        event.preventDefault();
        const tabId = this.getAttribute('data-tab-id');
        if (!tabId) {
            console.error('No tab ID found for domain click event.');
            return;
        }
        const tab = getCurrentTabs().find(tab => tab.id == parseInt(tabId, 10));
        if (tab) {
            const domain = getRootDomain(tab.url);
            if (domain) {
                window.open(`https://${domain}`, '_blank');
            } else {
                console.error('Failed to extract domain from URL:', tab.url);
            }
        } else {
            console.error('Tab not found for the provided tabId:', tabId);
        }
    });
}

function addEventListenerToElements(scope, selector, event, handler) {
    // First, remove any existing event listeners for the selector, if any
    const existingListener = scope.__eventListeners?.[event]?.[selector];
    if (existingListener) {
        scope.removeEventListener(event, existingListener);
    }

    // Set up a new listener
    const newListener = (e) => {
        const target = e.target.closest(selector);
        if (target) {
            handler.call(target, e);
        }
    };

    // Store the new listener for future removal
    if (!scope.__eventListeners) {
        scope.__eventListeners = {};
    }
    if (!scope.__eventListeners[event]) {
        scope.__eventListeners[event] = {};
    }
    scope.__eventListeners[event][selector] = newListener;

    // Add the event listener
    scope.addEventListener(event, newListener);
}



function applyButtonListeners(scope, selector, callback) {
    addEventListenerToElements(scope, selector, 'click', function () {
        const tabData = extractTabData(this);
        callback(tabData);
    });
}

async function applyDarkModeSetting() {
    const { darkModeEnabled } = await getChromeStorage(['darkModeEnabled']);

    const element = document.getElementById('darkModeSwitch');
    if (element) {
        element.checked = !!darkModeEnabled;
        updateTheme(darkModeEnabled);
    }
}

async function applyConfirmCloseSetting() {
    const { confirmClose } = await getChromeStorage(['confirmClose']);

    const element = document.getElementById('confirmCloseSwitch');
    if (element) {
        element.checked = !!confirmClose;
    }
}

function applyGroupingAndOrdering(filteredTabs, currentGrouping, currentOrdering) {
    if (currentGrouping) {
        const groupedTabs = groupTabs(filteredTabs, currentGrouping);
        if (currentOrdering) {
            Object.keys(groupedTabs).forEach(groupKey => {
                groupedTabs[groupKey] = orderTabs(groupedTabs[groupKey], currentOrdering);
            });
        }
        return groupedTabs;
    } else {
        if (currentOrdering) {
            return orderTabs(filteredTabs, currentOrdering);
        }
        return filteredTabs;
    }
}

function applyIconClickListeners(scope, selector, dataTabIdAttr, dataWindowIdAttr, callback) {
    addEventListenerToElements(scope, selector, 'click', function () {
        const tabId = this.getAttribute(dataTabIdAttr);
        const windowId = this.getAttribute(dataWindowIdAttr);
        if (tabId && windowId) {
            callback(tabId, windowId);
        } else {
            console.error('Invalid data attributes for tab or window ID:', { tabId, windowId });
        }
    });
}

function executeDropdownAction(actionMappings, id, actionFunction, resetValue = null) {
    if (actionMappings[id] !== undefined) {
        actionFunction(actionMappings[id]);
    } else if (['clear-grouping', 'clear-ordering'].includes(id)) {
        actionFunction(resetValue);
    }
}

function filterTabs(tabs, query, savedPages) {
    return tabs.filter(tab => {
        const tabTitleMatches = tab.title.toLowerCase().includes(query);
        const tabUrlMatches = tab.url.toLowerCase().includes(query);
        const tabTags = savedPages[tab.id]?.tags || [];
        const tabNotes = savedPages[tab.id]?.notes || [];
        const tagMatches = tabTags.some(tag => tag.toLowerCase().includes(query));
        const noteMatches = tabNotes.some(note => note.note.toLowerCase().includes(query));
        return tabTitleMatches || tabUrlMatches || tagMatches || noteMatches;
    });
}

function getFilteringData(event, savedPages) {
    const query = event.target.value.trim().toLowerCase();
    return { query, savedPages: savedPages || {} };
}

function getSearchInputValue(elementId) {
    const inputElement = document.getElementById(elementId);
    return inputElement ? inputElement.value.trim().toLowerCase() : '';
}

async function handleDarkModeToggle() {
    const darkModeStatus = this.checked;
    await setChromeStorage({ darkModeEnabled: darkModeStatus });
    updateTheme(darkModeStatus);
}

async function handleConfirmCloseToggle() {
    const confirmCloseStatus = this.checked;
    await setChromeStorage({ confirmClose: confirmCloseStatus });
}

async function handleChangeSettingsRegroupWindowsWithFewerThan(value) {
    await setChromeStorage({ regroupWindowsWithFewerThan: value });
    setupSettingsRegroupWindows();
}

async function handleChangeSettingsSplitIntoWindowsWithUpTo(value) {
    await setChromeStorage({ splitIntoWindowsWithUpTo: value });
    setupSettingsSplitWindows();
    setupSettingsRegroupWindows();
}

async function handleChangeSettingsSplitWindowsWithMoreThan(value) {
    await setChromeStorage({ splitWindowsWithMoreThan: value });
    setupSettingsSplitWindows();
}

function handleDropdownClick(event) {
    const { id } = event.currentTarget;
    executeDropdownAction(groupingActions, id, setGroupingContext);
    executeDropdownAction(orderingActions, id, setOrderingContext);

    updateAndSaveGroupingOrdering();

    const searchInputValue = getSearchInputValue('search-input');
    processSearchInput(searchInputValue, getCurrentTabs());
}

function processSearchInput(searchInputValue, currentTabs) {
    if (searchInputValue) {
        handleSearchInput({ target: { value: searchInputValue } }, currentTabs);
    } else {
        loadTabsList();
    }
}

function updateAndSaveGroupingOrdering() {
    const currentGrouping = getGroupingContext();
    const currentOrdering = getOrderingContext();

    updateChromeStorage(currentGrouping, currentOrdering);
    updateGroupingOrderingStyles(currentGrouping, currentOrdering);

    return { currentGrouping, currentOrdering };
}

function updateChromeStorage(grouping, ordering) {
    const data = { currentGrouping: grouping, currentOrdering: ordering };
    setChromeStorage(data);
}

const handleCleanup = async () => {

    await backupCurrentState();

    const closeInactiveTabsEl = document.getElementById('closeInactiveTabs');
    const removeDuplicateWindowsEl = document.getElementById('removeDuplicateWindows');
    const regroupWindowsEl = document.getElementById('regroupWindows');
    const splitWindowsEl = document.getElementById('splitWindows');

    // Then access the checked state:
    const isCloseInactiveTabsChecked = closeInactiveTabsEl?.checked;
    const isRemoveDuplicateWindowsChecked = removeDuplicateWindowsEl?.checked;
    const isSplitWindowsChecked = splitWindowsEl?.checked;
    const isRegroupWindowsChecked = regroupWindowsEl?.checked;

    if (isCloseInactiveTabsChecked) {
        await closeDiscardedTabs();
    }

    if (isRemoveDuplicateWindowsChecked) {
        await closeDuplicateTabs();
    }

    if (isSplitWindowsChecked) {
        await splitLargeWindows();
    }

    if (isRegroupWindowsChecked) {
        await regroupIntoNewWindows();
    }

    closeAndClearModal('wizardModal');
    if (closeInactiveTabsEl) closeInactiveTabsEl.checked = false;
    if (removeDuplicateWindowsEl) removeDuplicateWindowsEl.checked = false;
    if (splitWindowsEl) splitWindowsEl.checked = false;
    if (regroupWindowsEl) regroupWindowsEl.checked = false;

    initializeExtension();
};

export function setupCleanupButton() {
    const cleanupButton = document.getElementById('cleanupButton');

    if (cleanupButton) {
        cleanupButton.removeEventListener('click', handleCleanup);
        cleanupButton.addEventListener('click', handleCleanup);
    }
}

// Used to test discarding a tab
// chrome.tabs.query({ active: false }, (tabs) => {
//     if (tabs.length > 0) {
//       chrome.tabs.discard(tabs[0].id, (discardedTab) => {
//         console.log("Discarded:", discardedTab);
//       });
//     }
//   });



