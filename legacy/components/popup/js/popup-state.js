

const INITIAL_TABS = [];

// State Variables
let currentGroupingContext = null;
let currentOrderingContext = null;
let currentTabs = [...INITIAL_TABS];

let selectedGroup = null;
let selectedTabIdForTag = null;
let selectedTabId = null;
let selectedTab = null;


export let tagsChoicesInstance = null;

export function getTagsChoicesInstance() {
    return tagsChoicesInstance;
}

export const setTagsChoicesInstance = (newTagsChoicesInstance) => {
    tagsChoicesInstance = newTagsChoicesInstance;
};

export function getSelectedGroup() {
    return selectedGroup;
}

export function setSelectedGroup(newGroup) {
    selectedGroup = newGroup;
}

export function getSelectedTabIdForTag() {
    return selectedTabIdForTag;
}

export function setSelectedTabIdForTag(newTabId) {
    selectedTabIdForTag = newTabId;
}

export function getSelectedTabId() {
    return selectedTabId;
}

export function getSelectedTab() {
    return selectedTab;
}

export function setSelectedTabId(newTabId) {
    selectedTabId = newTabId;
}

export function setSelectedTab(newTab) {
    selectedTab = newTab;
}

export function setGroupingContext(grouping) {
    currentGroupingContext = grouping;
}

export function getGroupingContext() {
    return currentGroupingContext;
}

export function setOrderingContext(ordering) {
    currentOrderingContext = ordering;
}

export function getOrderingContext() {
    return currentOrderingContext;
}

export function getCurrentTabs() {
    return currentTabs;
}
// Update Function
export function updateTabs(tabs) {
    updateArrayContent(currentTabs, tabs);
}

// Helper - Extracted Function to Update Array Content
function updateArrayContent(array, newContent) {
    array.length = 0; // Clear the existing array
    array.push(...newContent); // Push new elements to the array
}

const windowGroupStates = new Map();

export function getGroupsActiveStatusForWindow(windowId) {
    return windowGroupStates.get(windowId) || false;
}

export function setGroupsActiveStatusForWindow(windowId, status) {
    windowGroupStates.set(windowId, status);
}

export function getGroupsActiveForFocusedWindowStatus(focusedWindowId) {
    return getGroupsActiveStatusForWindow(focusedWindowId);
}

export function initializeWindowGroupStatuses(windowIds) {
    windowIds.forEach((windowId) => {
        chrome.tabGroups.query({ windowId }, (groups) => {
            const isActive = groups.length > 0;
            setGroupsActiveStatusForWindow(windowId, isActive);
        });
    });
}
