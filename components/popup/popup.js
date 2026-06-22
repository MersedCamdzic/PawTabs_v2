// Import utilities and event listeners
import {
    getPreferences,
    getAllTabsAndCounts
} from './js/popup-data.js';

import {
    getCurrentTabs,
    getGroupingContext,
    getOrderingContext,
    setGroupingContext,
    setOrderingContext,
    updateTabs,
    initializeWindowGroupStatuses,
    setGroupsActiveStatusForWindow
} from './js/popup-state.js';

import {
    refreshTagsForAllTabs,
    updatePopup,
    updateGroupingOrderingStyles
} from "./js/popup-dom.js";

import {
    setupDarkModeToggleListener,
    setupConfirmCloseToggleListener,
    setupDropdownListeners,
    setupSearchInputListener,
    setupSaveNotesListener,
    setupTabActionListeners,
    setupSaveTagsListener,
    setupTagRemoveListener,
    setupSaveTabGroupsListener,
    setupSaveChangeTabWindowListener,
    setupSettingsRegroupWindows,
    setupSettingsSplitWindows,
    setupCleanupButton,
    setupSettingsSplitIntoWindowsWithUpTo,
    setupSettingsRegroupWindowsWithFewerThan,
    setupSettingsSplitWindowsWithMoreThan
} from './js/popup-event.js'

import {generateSeedData} from '../../seed/seed.js';

import {
    getFocusedWindowId,
    getAllWindowIds,
    checkTabGroupsForWindow
} from '../../utils/chrome-util.js';



// --- UI Update Functions ---
export function loadTabsList() {
    getAllTabsAndCounts()
        .then(tabs => {
            updateTabs(tabs);
            return getPreferences();
        })
        .then(preferences => {
            applyPreferences(preferences);

            updateUI();
        })
        .catch(error => console.error('Error:', error));
}

function applyPreferences(preferences) {
    setGroupingContext(preferences.currentGrouping || null);
    setOrderingContext(preferences.currentOrdering || null);
}

function updateUI() {
    const currentTabs = getCurrentTabs();
    const currentGrouping = getGroupingContext();
    const currentOrdering = getOrderingContext();

    updatePopup(currentTabs, currentGrouping, currentOrdering);
    updateGroupingOrderingStyles(currentGrouping, currentOrdering);
    setupSearchInputListener();
    refreshTagsForAllTabs();
}

// --- Main Entry Point ---
document.addEventListener('DOMContentLoaded', async () => {
    initializeExtension();
});

export async function initializeExtension() {
    loadTabsList();
    setupEventListeners();
    generateSeedData();

    const windowIds = await getAllWindowIds();

    // Initialize group statuses for all windows
    initializeWindowGroupStatuses(windowIds);

    // Get the focused window ID and update its group status
    const focusedWindowId = await getFocusedWindowId();
    const isActive = await checkTabGroupsForWindow(focusedWindowId);
    setGroupsActiveStatusForWindow(focusedWindowId, isActive);
}

function setupEventListeners() {
    setupDropdownListeners();
    setupSearchInputListener();
    setupTabActionListeners();
    setupSaveTagsListener();
    setupSaveNotesListener();
    setupTagRemoveListener();
    setupSaveTabGroupsListener();
    setupDarkModeToggleListener();
    setupConfirmCloseToggleListener();
    setupSaveChangeTabWindowListener();
    setupSettingsRegroupWindows();
    setupSettingsSplitWindows();
    setupSettingsSplitIntoWindowsWithUpTo();
    setupSettingsRegroupWindowsWithFewerThan();
    setupSettingsSplitWindowsWithMoreThan();
    setupCleanupButton();
}