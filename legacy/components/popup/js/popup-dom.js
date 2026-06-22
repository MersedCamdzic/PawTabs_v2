import { BADGE_COLOR_CLASSES, ButtonClasses, DefaultUrls } from "../../../config/config.js";
import { escapeHtml, getPlaceholderIconUrl, getRootDomain, hashStringToColorIndex } from "../../../utils/utils.js";
import { getChromeStorage, getFocusedWindowId, setChromeStorage } from "../../../utils/chrome-util.js";
import {
    calculateTabStatistics,
    getDuplicateCounts,
    getTabsInGroup,
    groupTabs,
    orderTabs,
    removeNoteFromTab,
    removeTagFromTab,
    saveWindowData
} from "./popup-data.js";
import { attachTagRemoveListeners, REGROUP_WINDOWS_WITH_FEWER_THAN_DEFAULT, SPLIT_WINDOWS_WITH_MORE_THAN_DEFAULT, SPLIT_INTO_WINDOWS_WITH_UP_TO_DEFAULT, setupTabActionListeners } from "./popup-event.js";
import {
    getCurrentTabs,
    getGroupingContext,
    getTagsChoicesInstance,
    setSelectedGroup,
    setSelectedTabId,
    setTagsChoicesInstance,
    getGroupsActiveForFocusedWindowStatus,
    setSelectedTab
} from "./popup-state.js";
import { setButtonClass } from '../../../utils/button-util.js'
import { closeModal } from "../../../utils/modal-util.js";
import { mapColorToChromeColor } from "../../mission-control/js/mission-control-dom.js";
import { initializeExtension } from "../popup.js";


export const initializeChoicesInput = (elementId, options = {}) => {
    const inputElement = document.getElementById(elementId);

    if (inputElement) {
        const existingInstance = getTagsChoicesInstance();

        // Destroy existing instance to avoid duplications
        if (existingInstance) {
            existingInstance.destroy(); // Destroy Choices instance completely
            setTagsChoicesInstance(null); // Clear reference to old instance
        }

        // Initialize a new Choices instance
        const instance = new Choices(inputElement, {
            removeItems: true,
            removeItemButton: false,
            maxItemCount: 10,
            searchResultLimit: 10,
            renderChoiceLimit: 10,
            duplicateItemsAllowed: false, // Prevent duplicate tags
            shouldSort: false, // Maintain the order of items
            ...options, // Spread additional options provided
        });

        setTagsChoicesInstance(instance); // Use the setter function to store the new instance
    } else {
        console.warn(`Element with ID ${elementId} not found for Choices initialization.`);
    }
};
export async function refreshTagsForAllTabs() {
    try {
        const savedPages = (await getChromeStorage(['savedPages'])).savedPages || {};
        Object.keys(savedPages).forEach((tabId) => {
            updateTagContainer(tabId, savedPages[tabId].tags);
        });
    } catch (error) {
        console.error('Failed to refresh tags for all tabs:', error);
    }
}
export function setupTagsModalContext(groupTitle, tabData) {
    if (groupTitle) {
        setSelectedGroup(groupTitle);
        setSelectedTab(null);
    } else if (tabData) {
        setSelectedGroup(null);
        setSelectedTab(tabData);
    }
}
export function updateTabsWithSavedState(tabs, savedPages) {
    const iterateOverTabs = Array.isArray(tabs)
        ? tabs.forEach.bind(tabs)
        : (callback) => Object.values(tabs).forEach(group => group.forEach(callback));

    iterateOverTabs((tab) => {
        const savedTab = savedPages[tab.id];
        if (savedTab) updateTabState(tab, savedTab);
    });
}
export function updateGroupingOrderingStyles(currentGrouping, currentOrdering) {
    updateDropdownStyles(currentGrouping, currentOrdering);
    updateClearButtons(currentGrouping, currentOrdering);
    updateButtonStyles('groupByButton', currentGrouping, 'btn-ghost-primary', 'btn-primary');
    updateButtonStyles('orderByButton', currentOrdering, 'btn-ghost-secondary', 'btn-secondary');
}
export function createTagBadges(tabId, tags, isPopup = false) {
    const sortedTags = [...tags].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
    let badgesHtml = '';
    let rowHtml = '';

    sortedTags.forEach((tag, index) => {
        const colorClass = BADGE_COLOR_CLASSES[hashStringToColorIndex(tag, BADGE_COLOR_CLASSES.length)];
        const badgeHtml = createBadgeHtml(tag, colorClass, tabId);

        if (index > 0 && index % 100 === 0) {
            badgesHtml += createBadgeRow(rowHtml, isPopup);
            rowHtml = '';
        }

        rowHtml += badgeHtml;
    });

    if (rowHtml.length > 0) {
        badgesHtml += createBadgeRow(rowHtml, isPopup);
    }

    return badgesHtml;
}

export function renderTabsTable(tabs, currentTabId) {
    const tabsContainer = document.getElementById('tabs-container');
    clearContainer(tabsContainer);

    const card = document.createElement('div');
    card.className = 'card';

    const body = document.createElement('div');
    body.className = 'card-body';

    const table = document.createElement('table');
    table.className = 'table table-centered table-hover align-middle table-nowrap mb-0';

    const tbody = document.createElement('tbody');
    const duplicateCounts = getDuplicateCounts(tabs);

    // Move the current tab to the top of the list
    const currentTab = tabs.find(tab => tab.id === currentTabId);
    if (currentTab) {
        const currentRow = createTabRow(currentTab, duplicateCounts[currentTab.url], true); // 'true' indicates it's the current tab
        tbody.appendChild(currentRow);
    }

    // Append rows for the other tabs
    tabs.forEach(tab => {
        if (tab.id !== currentTabId) {
            const row = createTabRow(tab, duplicateCounts[tab.url]);
            tbody.appendChild(row);
        }
    });

    if (tabs.length === 0) {
        const emptyMessage = document.createElement('tr');
        emptyMessage.innerHTML = `<td colspan="3" class="text-center empty-row">No tabs found</td>`;
        tbody.appendChild(emptyMessage);
    }

    table.appendChild(tbody);
    body.appendChild(table);
    card.appendChild(body);
    tabsContainer.appendChild(card);
}
export function attachImageErrorHandler(row, googleFaviconUrl, defaultImageUrl) {
    const imgElement = row.querySelector('img');
    imgElement.onerror = function () {
        if (imgElement.src === googleFaviconUrl) {
            imgElement.src = defaultImageUrl;
        }
    };
}
export function updatePopup(tabs, currentGrouping = null, currentOrdering = null) {
    const tabsContainer = document.getElementById('tabs-container');
    clearContainer(tabsContainer);

    const { totalWindows, totalTabs, inactiveTabs } = calculateTabStatistics(tabs);
    updateUIStatistics(totalWindows, totalTabs, inactiveTabs);

    chrome.tabs.query({ active: true, currentWindow: true }, (activeTabs) => {
        getChromeStorage(['savedPages'])
            .then(async (result) => {
                const savedPages = result.savedPages || {};
                updateTabsWithSavedState(tabs, savedPages);
                await renderTabs(tabs, currentGrouping, currentOrdering, activeTabs[0]?.id);
                setupTabActionListeners();
            })
            .catch((err) => {
                console.error('Error retrieving saved pages:', err);
            });
    });
}
export function renderGroupedTabs(groupedTabs, currentTabId, currentGrouping) {
    const tabsContainer = document.getElementById('tabs-container');
    clearContainer(tabsContainer);
    Object.entries(groupedTabs).forEach(([group, tabs]) => {
        renderGroupCard(tabsContainer, group, tabs, currentTabId, currentGrouping);
    });
}
export async function createGroupCard(groupTitle, tabsInGroup, currentTabId, currentGrouping, additionalData = {}) {
    const card = document.createElement('div');
    card.className = 'card';

    const header = await createCardHeader(groupTitle, currentGrouping, additionalData);
    const body = createCardBody(tabsInGroup, currentTabId);

    card.appendChild(header);
    card.appendChild(body);

    return card;
}
export function createIconButton(iconClass, title, buttonClass, visible, modalData = null) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `${buttonClass} ${!visible ? 'd-none' : ''}`; // Append 'hidden' class if not visible
    button.innerHTML = `<i class="${iconClass}" title="${title}"></i>`;

    if (modalData) {
        if (modalData.dataBsTarget) button.setAttribute('data-bs-target', modalData.dataBsTarget);
        if (modalData.dataBsToggle) button.setAttribute('data-bs-toggle', modalData.dataBsToggle);
    }

    return button;
}
export function createTabRow(tab, duplicateCount, isCurrent = false) {
    const row = document.createElement('tr');
    row.setAttribute('data-tab-id', tab.id);

    if (isCurrent) row.classList.add('bg-warning', 'border-info', 'bg-opacity-10', 'border-opacity-10');

    getChromeStorage(['savedPages']).then((result) => {
        const savedPages = result.savedPages || {};
        const savedTab = savedPages[tab.id];
        const tags = savedTab?.tags || [];
        const notes = savedTab?.notes || [];
        const tagBadges = createTagBadges(tab.id, tags);
        const tabGroups = savedTab?.tabGroups || "";

        row.innerHTML = generateRowHtml(tab, tags, tagBadges, savedTab, duplicateCount, notes, isCurrent, tabGroups);
        attachImageErrorHandler(row, getPlaceholderIconUrl(tab.url), DefaultUrls.IMAGES.NO_IMAGE);
        setButtonStates(row, savedTab, tab);
        setupTabActionListeners(row);
    }).catch((error) => {
        console.error('Error retrieving saved pages:', error);
    });

    return row;
}
export function handleTagClick(event) {
    const closeButton = event.target.closest('.tag-close-btn');
    if (!closeButton) return;

    event.preventDefault();
    const tagContainer = closeButton.parentElement;
    const tabId = tagContainer.getAttribute('data-tab-id');
    const tagToRemove = tagContainer.getAttribute('data-tag');

    if (tabId && tagToRemove) {
        removeTagFromTab(tabId, tagToRemove, 'clearTagListContainer')
            .then(({ tabId, updatedTags }) => {
                console.log(`clearTagListContainer -> Tag "${tagToRemove}" removed from tab with ID ${tabId}`);
                removeTagElements(tabId, tagToRemove);
                updateTagsForSpecificTab(tabId, updatedTags);
                renderTabDetailsTags(tabId, updatedTags);
            })
            .catch(error => {
                console.error('Error removing tag:', error);
            });
    }
}
export function updateTabState(tabOrTabId, buttonTypeOrSavedTab, isActive = false, isAudible = false, isMuted = false) {
    // Check if the first argument is a number (tabId) or an object (tab)
    if (typeof tabOrTabId === 'number') {
        // Handle the first use case: update button states in the UI
        const tabId = tabOrTabId;
        const buttonType = buttonTypeOrSavedTab;

        const selector = `.${buttonType}-button[data-tab-id="${tabId}"]`;
        const buttons = document.querySelectorAll(selector);

        if (buttons.length === 0) {
            console.warn(`No buttons found for selector: ${selector}`);
            return;
        }

        buttons.forEach(button => {
            if (buttonType === 'volume') {
                // For volume, pass both isActive (muted state) and isAudible to setButtonClass
                setButtonClass(button, buttonType, isActive, true, isAudible, isMuted);
            } else {
                setButtonClass(button, buttonType, isActive);
            }
        });
    } else if (typeof tabOrTabId === 'object' && buttonTypeOrSavedTab) {
        // Handle the second use case: update tab object properties
        const tab = tabOrTabId;
        const savedTab = buttonTypeOrSavedTab;

        tab.saved = true;
        tab.starred = !!savedTab.starred;
    } else {
        console.error('Invalid arguments passed to updateTabState.');
    }
}
export function removeBackdrop() {
    const backdrops = document.querySelectorAll('.modal-backdrop');
    backdrops.forEach(backdrop => backdrop.remove());
}
export function renderTabDetailsTags(tabId, tags) {
    const tagListContainer = document.getElementById('tag-list-container');
    if (!tagListContainer) {
        console.error('Tag list container not found');
        return;
    }

    clearTagListContainer(tagListContainer);
    tagListContainer.innerHTML = createTagBadges(tabId, tags, true);
    attachTagRemoveListeners(tagListContainer);
}
export function removeTagElements(tabId, tagToRemove) {
    const tagElements = document.querySelectorAll(`[data-tab-id="${tabId}"][data-tag="${tagToRemove}"]`);
    tagElements.forEach(tagElement => {
        tagElement.remove();
    });
}
export function refreshTabRow(tabId) {
    let rowElement = getRowElement(tabId);
    if (!rowElement) {
        return;
    }

    getChromeStorage(['savedPages']).then(function (storageData) {
        let savedPagesData = storageData.savedPages || {};
        let tabDetails = savedPagesData[tabId];

        if (!tabDetails) {
            console.warn('No data found for tab ID: ' + tabId);
            return;
        }

        updateTagsContainer(tabId, tabDetails.tags, rowElement);
        if (tabDetails.notes === 0) {
            updateTabDetailsBadge(tabId);
        }
    }).catch(function (error) {
        console.error('Error retrieving saved pages:', error);
    });
}
export function renderTabDetailsNotes(tabId, notes) {
    const notesContainer = document.getElementById('notes-list');
    notesContainer.innerHTML = '';

    notes.sort((a, b) => new Date(b.date) - new Date(a.date));
    notes.forEach((note, index) => {
        const listItem = createNoteListItem(note, index, tabId);
        notesContainer.appendChild(listItem);
    });

    addRemoveNoteEventListeners(tabId);
}
export function setupNotesModalContext(tabData = null, groupTitle = null) {
    const importantMessage = document.querySelector('.add-note-to-all-tabs-important-message');

    if (tabData) {
        setSelectedTab(tabData);
        setSelectedGroup(null);
        importantMessage?.classList.add("d-none");
    } else if (groupTitle) {
        setSelectedGroup(groupTitle);
        setSelectedTab(null);
        importantMessage?.classList.remove("d-none");
    }


    document.getElementById('notes-input').value = ''; // Clear the input field when opening the modal
}
export async function setupTabGroupsModalContext(tabData = null, groupTitle = null) {
    const changeTabGroupsContainer = document.getElementById('changeTabGroupsContainer');

    if (tabData) {
        setSelectedTab(tabData);
        setSelectedGroup(null);
    } else if (groupTitle) {
        setSelectedGroup(groupTitle);
        setSelectedTab(null);
    }

    const result = await getChromeStorage(['savedGroups', 'savedPages']);
    const savedGroups = result.savedGroups || [];
    const savedPages = result.savedPages || {};

    const currentSavedPage = savedPages[tabData?.tabId];

    const currentSavedPageTabGroup = currentSavedPage?.tabGroups;
    const group = savedGroups?.find(sG => sG.id === currentSavedPageTabGroup?.id);

    if (changeTabGroupsContainer && group?.id) {
        changeTabGroupsContainer.setAttribute('data-selected-group-id', group.id);
    }

    if (changeTabGroupsContainer) {
        changeTabGroupsContainer.innerHTML = "";

        let newChangeTabGroupsContainerHTML = "";

        savedGroups.forEach(savedGroup => {

            newChangeTabGroupsContainerHTML += `
            <div id="change-tab-group-option-${savedGroup.id}" class="card card-animate border m-0 cursor-pointer ${savedGroup.id === group?.id ? 'border-white' : ''}">
                <div class="card-body">
                    <div class="d-flex align-items-center">
                        <div class="flex-grow-1">
                            <p class="fw-medium text-white text-truncate-two-lines overflow-auto d-flex align-items-center column-gap-2 m-0 flex-wrap">
                            <span class="p-2 rounded-circle" style="background-color: ${mapColorToChromeColor(savedGroup?.color)};"></span>
                            <span class="fw-semibold">${savedGroup.name}</span>
                            <span class="fs-12 mb-0 text-muted">
                                <span class="total-tabs">(${savedGroup.tabs.length} ${savedGroup.tabs.length === 1 ? 'tab' : 'tabs'})</span>
                            </span>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
            `
        });

        changeTabGroupsContainer.innerHTML = newChangeTabGroupsContainerHTML;

        savedGroups.forEach(savedGroup => {
            const el = document.getElementById(`change-tab-group-option-${savedGroup.id}`)

            el?.addEventListener("click", (e) => {
                e.preventDefault();

                for (let i = 0; i < changeTabGroupsContainer.children.length; i++) {
                    changeTabGroupsContainer.children[i].classList.remove("border-white");
                }

                el?.classList?.add("border-white");

                changeTabGroupsContainer.setAttribute('data-selected-group-id', savedGroup.id);
            });
        });

        if (!changeTabGroupsContainer.innerHTML) {
            newChangeTabGroupsContainerHTML = `
                <span class="fs-12 text-muted">No Groups available</span>
            `;
            changeTabGroupsContainer.innerHTML = newChangeTabGroupsContainerHTML;
        }
    }
}

export async function setupChangeWindowTabModalContext(tabId = null, groupTitle = null) {
    const changeTabWindowContainer = document.getElementById('changeTabWindowContainer');

    if (tabId) {
        setSelectedTabId(tabId);
        setSelectedGroup(null);
    } else if (groupTitle) {
        setSelectedGroup(groupTitle);
        setSelectedTabId(null);
    }

    const result = await getChromeStorage(['windows']);
    const storedWindows = result.windows || {};

    chrome.tabs.get(Number(tabId), tab => {
        chrome.windows.getAll({ populate: true }, windows => {
            const currentWindow = windows.find(({ id }) => id === tab.windowId);

            if (changeTabWindowContainer && currentWindow) {
                changeTabWindowContainer.setAttribute('data-selected-window-id', currentWindow.id);
            }

            if (changeTabWindowContainer) {
                changeTabWindowContainer.innerHTML = "";

                let newChangeTabWindowContainerHTML = "";

                windows.forEach(window => {
                    newChangeTabWindowContainerHTML += `
                         <div id="change-tab-window-option-${window.id}" class="card card-animate border m-0 cursor-pointer ${currentWindow.id === window.id ? 'border-white' : ''}">
                            <div class="card-body">
                                <div class="d-flex align-items-center">
                                    <div class="flex-grow-1">
                                        <p class="fw-medium text-white text-truncate-two-lines overflow-auto d-flex align-items-center column-gap-2 m-0 flex-wrap">
                                            <span class="fw-semibold">${storedWindows[window.id]?.title || `Window ${window.id}`}</span>
                                            <span class="fs-12  mb-0 text-muted">
                                                <span class="total-tabs">(${window.tabs.length} ${window.tabs.length === 1 ? 'tab' : 'tabs'})</span>
                                            </span>
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        `;
                });

                changeTabWindowContainer.innerHTML = newChangeTabWindowContainerHTML;

                windows.forEach(window => {
                    const el = document.getElementById(`change-tab-window-option-${window.id}`);

                    el?.addEventListener("click", (e) => {
                        e.preventDefault();

                        for (let i = 0; i < changeTabWindowContainer.children.length; i++) {
                            changeTabWindowContainer.children[i].classList.remove("border-white");
                        }

                        el?.classList?.add("border-white");

                        changeTabWindowContainer.setAttribute('data-selected-window-id', window.id);
                    });
                });
            }
        });
    });
}

export function openNotesModal(groupTitle = null, tabData = null) {
    const modalId = 'notesModal';
    const modalElement = document.getElementById(modalId);

    if (!modalElement) {
        console.error(`Modal with ID "${modalId}" not found.`);
        return;
    }

    // Set up modal-specific logic
    setupNotesModalContext(tabData, groupTitle);

    // Clear the input field
    const notesInput = modalElement.querySelector('#notes-input');
    if (notesInput) {
        notesInput.value = '';
    }
}
export function closeNotesModal() {
    closeModal('notesModal');
}

export function openTabGroupsModal(groupTitle = null, tabData = null) {
    const modalElement = document.getElementById('tabGroupsModal');

    if (modalElement) {
        // Create a new Bootstrap modal instance
        setupTabGroupsModalContext(tabData, groupTitle); // Set up the modal context based on whether it's a group or single tab
        // document.getElementById('tab-groups-input').value = ''; // Clear the input field
    } else {
        console.error('Modal element with ID "tabGroupsModal" not found.');
    }
}

export function openChangeTabWindowModal(groupTitle = null, tabId = null) {
    const modalElement = document.getElementById('changeTabWindowModal');
    if (modalElement) {
        setupChangeWindowTabModalContext(tabId, groupTitle); // Set up the modal context based on whether it's a group or single tab
    } else {
        console.error('Modal element with ID "changeTabWindowModal" not found.');
    }
}

export function updateTabGroupBadge(tabId) {
    const tabGroupButton = document.querySelector(`.tab-groups-button[data-tab-id="${tabId}"]`);
    const tabGroupContainer = document.querySelector(`.tab-group-container[data-tab-id="${tabId}"]`);
    const saveButton = document.querySelector(`.save-button[data-tab-id="${tabId}"]`);
    getChromeStorage(['savedPages'])
        .then((result) => {
            const savedPages = result.savedPages || {};
            const savedTab = savedPages[tabId];
            const hasTabGroup = savedTab && !!savedTab.tabGroups;

            setButtonClass(saveButton, 'SAVE', hasTabGroup);
            setButtonClass(tabGroupButton, "TABGROUP", hasTabGroup);
            tabGroupContainer.innerHTML = `<p class="mt-3 badge text-dark p-2 fs-12 ms-1" style="background-color: ${mapColorToChromeColor(savedTab.tabGroups.color)};">${savedTab.tabGroups.name}</p>`;
        })
        .catch((error) => {
            console.error('Error retrieving saved pages:', error);
        });
}

export function moveTabToNewWindow(tabId, windowId) {
    if (!tabId || !windowId) return;

    chrome.tabs.move(tabId, { windowId, index: -1 }, () => {
        if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError);
        }

        initializeExtension();
    });
}

export function updateTabDetailsBadge(tabId) {
    const EMPTY_BADGE_HTML = '<i class="ri-list-settings-line"></i>';
    const BADGE_HTML = `<i class="ri-list-settings-line"></i>
                        <span class="position-absolute top-0 start-100 translate-middle badge border border-light rounded-circle bg-danger p-1">
                            <span class="visually-hidden"></span>
                        </span>`;

    const button = document.querySelector(`.tab-details-button[data-tab-id="${tabId}"]`);
    const noteButton = document.querySelector(`.note-button[data-tab-id="${tabId}"]`);
    const saveButton = document.querySelector(`.save-button[data-tab-id="${tabId}"]`);


    if (!button) {
        console.warn(`Tab details button not found for tab ID: ${tabId}`);
        return;
    }

    getChromeStorage(['savedPages'])
        .then((result) => {
            const savedPages = result.savedPages || {};
            const savedTab = savedPages[tabId];
            const hasNotes = savedTab && Array.isArray(savedTab.notes) && savedTab.notes.length > 0;
            button.innerHTML = hasNotes ? BADGE_HTML : EMPTY_BADGE_HTML;
            setButtonClass(noteButton, "NOTE", hasNotes);
            setButtonClass(saveButton, "SAVE", hasNotes);

        })
        .catch((error) => {
            console.error('Error retrieving saved pages:', error);
        });
}
export function updateTagsForSpecificTab(tabId, tags) {
    const tagsContainerSelector = `[data-tab-id="${tabId}"] .tags-container`;
    const button = document.querySelector(`.tag-button[data-tab-id="${tabId}"]`);
    const saveButton = document.querySelector(`.save-button[data-tab-id="${tabId}"]`);
    const tagsContainer = document.querySelector(tagsContainerSelector);

    if (tagsContainer) {
        // Update the tags UI with new badges in the tab row
        tagsContainer.innerHTML = createTagBadges(tabId, tags);
        attachTagRemoveListeners(tagsContainer); // Attach listeners to new tags
        setButtonClass(button, "TAG", tags.length > 0);
        if (tags.length > 0) {
            setButtonClass(saveButton, "SAVE", tags.length > 0);
        }
    } else {
        console.error(`Tag container not found for tab ID: ${tabId}`);
    }

    // Update the standalone `tag-list-container` if it is present
    const standaloneTagContainer = document.getElementById('tag-list-container');

    if (standaloneTagContainer && standaloneTagContainer.getAttribute('data-tab-id') === `${tabId}`) {
        clearTagListContainer(standaloneTagContainer);
        const tagBadgesHtml = createTagBadges(tabId, tags, true);
        standaloneTagContainer.innerHTML = tagBadgesHtml;
        attachTagRemoveListeners(standaloneTagContainer); // Attach listeners to new tags
    }
}
export function closeAndClearModal(modalId, tabId = 0, updateIconsForType = '') {
    const modalElement = document.getElementById(modalId);

    if (!modalElement) {
        console.error(`Modal element with ID "${modalId}" not found.`);
        return;
    }

    const modalInstance = bootstrap.Modal.getInstance(modalElement);
    if (modalInstance) {
        modalInstance.hide();  // Hide the modal
    }

    // Clear all input fields
    const inputs = modalElement.querySelectorAll('input, textarea');
    inputs.forEach(input => input.value = '');  // Clear input fields

    removeBackdrop();  // Remove lingering backdrop if necessary
}
export function extractTabData(button) {
    const tabData = {
        tabId: button.getAttribute('data-tab-id'),
        url: button.getAttribute('data-url'),
        windowId: button.getAttribute('data-window-id'),
        title: button.getAttribute('data-title'),
        favicon: button.getAttribute('data-favicon'),
    };
    if (tabData.tabId) {
        tabData.tabId = parseInt(tabData.tabId, 10); // Ensure tabId is a number
    }
    return tabData;
}
export async function moveTabsToNewWindow(groupTitle, currentTabs, groupingType) {
    if (!groupTitle || !Array.isArray(currentTabs) || !groupingType) {
        console.error('Invalid input to moveTabsToNewWindow:', { groupTitle, currentTabs, groupingType });
        return;
    }
    const tabsInGroup = await getTabsInGroup(groupTitle, currentTabs, groupingType);
    if (!tabsInGroup || tabsInGroup.length === 0) {
        console.warn('No tabs found for the specified group:', groupTitle);
        return;
    }

    createNewWindow(tabsInGroup);
}
export function openTabDetailsModal(tabId) {
    const tab = findTabById(tabId);
    if (!tab) return;
    updateModalContent(tab);
    retrieveAndRenderSavedData(tab);
}
export function openTagsModal(groupTitle = null, tabData = null) {
    const modalSelector = 'tagsModal';
    const modalElement = document.getElementById(modalSelector);

    if (!modalElement) {
        console.error(`Modal element with ID "${modalSelector}" not found.`);
        return;
    }

    setupTagsModalContext(groupTitle, tabData);

    initializeChoicesInput('tags-input');
}
function findTabById(tabId) {
    const parsedTabId = parseInt(tabId, 10);
    const tab = getCurrentTabs().find(t => t.id === parsedTabId);
    if (!tab) {
        console.error('Tab not found for the provided tabId:', tabId);
    }
    return tab;
}
function updateModalContent(tab) {
    document.getElementById('tabDetailsModalLabel').textContent = `Tab Details - ${escapeHtml(tab.title)}`;
    document.getElementById('windowId').textContent = tab.windowId;
    document.getElementById('tabId').textContent = tab.id;
}
function retrieveAndRenderSavedData(tab) {
    console.log('retrieveAndRenderSavedData');
    getChromeStorage(['savedPages'])
        .then(result => {
            const savedPages = result.savedPages || {};
            const savedTab = savedPages[tab.id] || {};
            renderTabDetailsTags(tab.id, savedTab.tags || []);
            renderTabDetailsNotes(tab.id, savedTab.notes || []);
        })
        .catch(error => {
            console.error('Error retrieving saved pages:', error);
        });
}

function createNewWindow(tabsInGroup) {
    chrome.windows.create({ focused: true, state: 'normal' }, function (newWindow) {
        if (chrome.runtime.lastError) {
            console.error('Failed to create a new window:', chrome.runtime.lastError.message);
            return;
        }
        const newlyCreatedWindowId = newWindow.id;
        const initialEmptyTabId = newWindow.tabs[0].id; // The newly created empty tab in the new window
        moveAndCloseTabs(tabsInGroup, newlyCreatedWindowId, initialEmptyTabId);
    });
}
function moveAndCloseTabs(tabsInGroup, newWindowId, newTabId) {
    const tabIdsToMove = tabsInGroup.map(tab => tab.id);
    chrome.tabs.move(tabIdsToMove, { windowId: newWindowId, index: -1 }, function (movedTabs) {
        if (chrome.runtime.lastError) {
            console.error('Failed to move tabs:', chrome.runtime.lastError.message);
            return;
        }
        chrome.tabs.remove(newTabId, function () {
            if (chrome.runtime.lastError) {
                console.error('Failed to close the new empty tab:', chrome.runtime.lastError.message);
            } else {
                console.log(`New empty tab ${newTabId} closed.`);
            }
        });
    });
}

function createNoteListItem(note, index, tabId) {
    const noteDate = new Date(note.date);
    const day = noteDate.toLocaleDateString('en-US', { day: 'numeric' });
    const weekday = noteDate.toLocaleDateString('en-US', { weekday: 'short' });
    const time = noteDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const groupInfo = note.isGrouped ? 'group' : 'single';

    const listItem = document.createElement('li');
    listItem.className = 'list-group-item ps-0';
    listItem.innerHTML = `
        <div class="row align-items-center g-3">
            <div class="col-auto">
                <div class="avatar-sm p-1 py-2 h-auto bg-light rounded-3">
                    <div class="text-center">
                        <h5 class="mb-0">${day}</h5>
                        <div class="text-muted">${weekday}</div>
                    </div>
                </div>
            </div>
            <div class="col">
                <h5 class="text-muted mt-0 mb-1 fs-13">${time} - ${groupInfo} note</h5>
                <a href="#" class="text-reset fs-14 mb-0">${escapeHtml(note.note)}</a>
            </div>
            <div class="col-sm-auto">
                <button class="btn btn-sm btn-outline-danger btn-border remove-note-button" data-tab-id="${tabId}" data-index="${index}"><i class="ri-close-line"></i></button>
            </div>
        </div>
    `;
    return listItem;
}
function addRemoveNoteEventListeners(tabId) {
    document.querySelectorAll('.remove-note-button').forEach(button => {
        button.addEventListener('click', function () {
            const index = this.getAttribute('data-index');
            removeNoteFromTab(tabId, parseInt(index, 10));
        });
    });
}
function updateTagContainer(tabId, tags) {
    const tagContainer = document.querySelector(`[data-tab-id="${tabId}"] .tags-container`);
    if (tagContainer && tags) {
        tagContainer.innerHTML = createTagBadges(tabId, tags);
    }
}
async function renderTabs(tabs, currentGrouping, currentOrdering, currentTabId) {
    const tabData = currentGrouping ? await groupTabs(tabs, currentGrouping) : tabs;
    currentGrouping ? renderOrderedGroupedTabs(tabData, currentOrdering, currentTabId, currentGrouping) : renderTabsTable(orderTabs(tabData, currentOrdering), currentTabId);
}
function clearContainer(container) {
    if (container)
        container.innerHTML = '';
}
function updateUIStatistics(totalWindows, totalTabs, inactiveTabs) {
    const totalWindowsEl = document.getElementById('total-windows');
    const totalTabsEl = document.getElementById('total-tabs');
    const inactiveTabsEl = document.getElementById('inactive-tabs');

    if (totalWindowsEl) totalWindowsEl.textContent = totalWindows;
    if (totalTabsEl) totalTabsEl.textContent = totalTabs;
    if (inactiveTabsEl) inactiveTabsEl.textContent = inactiveTabs;
}
function renderOrderedGroupedTabs(groupedTabs, currentOrdering, currentTabId, currentGrouping) {
    const orderedGroupedTabs = Object.keys(groupedTabs).reduce((ordered, groupKey) => {
        ordered[groupKey] = orderTabs(groupedTabs[groupKey], currentOrdering);
        return ordered;
    }, {});
    renderGroupedTabs(orderedGroupedTabs, currentTabId, currentGrouping);
}
async function renderGroupCard(container, group, tabs, currentTabId, currentGrouping) {
    const card = await createGroupCard(group, tabs, currentTabId, currentGrouping, { ...(currentGrouping === 'WindowId' && { windowId: tabs?.[0]?.windowId }) });
    container?.appendChild(card);
}
async function createCardHeader(_groupTitle, currentGrouping, additionalData = {}) {
    let groupTitle = _groupTitle;
    const { windowId } = additionalData;

    // Adjust group title if it includes "Starred"
    if (groupTitle.includes("Starred")) {
        groupTitle = groupTitle.replace("Starred", "Pawed");
    }

    // Create header container
    const header = document.createElement('form');
    header.className = 'card-header border-2 align-items-center d-flex bg-light-subtle gap-2 justify-content-end';
    header.setAttribute('data-grouping-id', currentGrouping);
    header.addEventListener('submit', (e) => {
        e.preventDefault();

        if (!editInputField.value) return;

        saveWindowData({ id: windowId, title: editInputField.value });
        title.textContent = editInputField.value;
        groupTitle = editInputField.value;
        renderReadOnly();
    });

    // For inline edit, create container with input, confirm and cancel icon (only used for Window names for now)
    const editInputFieldContainer = document.createElement('div');
    editInputFieldContainer.className = 'd-flex align-items-center flex-grow-1 gap-1';

    const editInputField = document.createElement('input');
    editInputField.className = 'form-control w-50';
    editInputField.placeholder = 'Type the name here';

    const editIcon = document.createElement('i');
    editIcon.className = 'bx bx-edit fs-18 cursor-pointer';
    const confirmEditIcon = document.createElement('i');
    confirmEditIcon.className = 'bx bx-check text-success fs-20 cursor-pointer';
    const cancelEditIcon = document.createElement('i');
    cancelEditIcon.className = 'bx bx-x text-danger fs-20 cursor-pointer';

    if (windowId) {
        header.setAttribute('data-grouping-window-id', windowId);
        const result = await getChromeStorage(['windows']);
        const windows = result?.windows || {};
        groupTitle = windows[windowId]?.title || `Window ${windowId}`;
    }

    const renderEdit = () => {
        if (header.contains(editIcon)) {
            header.removeChild(editIcon);
            header.removeChild(title);
            header.prepend(editInputFieldContainer);
            editInputField.value = groupTitle === `Window ${windowId}` ? '' : groupTitle;
            editInputField?.focus();
            editInputField?.setSelectionRange(editInputField?.value.length, editInputField?.value.length);
        }
    }

    const renderReadOnly = () => {
        header.removeChild(editInputFieldContainer);
        header.prepend(editIcon, title);
    }

    // Edit icons prepends edit container and removes edit icon and title
    editIcon.addEventListener('click', () => {
        renderEdit();
    });

    // Cancel icon removes edit container and prepends edit icon and title
    cancelEditIcon.addEventListener('click', () => {
        renderReadOnly();
        editInputField.value = '';
    });

    // Confirm icon saves the edited value, removes edit container and prepends edit icon and title
    confirmEditIcon.addEventListener('click', () => {
        if (!editInputField.value) return;

        saveWindowData({ id: windowId, title: editInputField.value });
        title.textContent = editInputField.value;
        groupTitle = editInputField.value;
        renderReadOnly();
    });

    editInputFieldContainer.append(editInputField, confirmEditIcon, cancelEditIcon);


    // Create title element
    const title = document.createElement('h4');
    title.className = 'card-title mb-0 flex-grow-1 fs-18 cursor-pointer';
    title.textContent = groupTitle;

    // Create button container
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'd-flex';

    // Fetch focused window ID and group status
    getFocusedWindowId()
        .then(focusedWindowId => {
            const isActive = getGroupsActiveForFocusedWindowStatus(focusedWindowId); // Get group status
            const buttons = [
                // {
                //     allowedGroupings: ['WindowId'],
                //     icon: !isActive ? 'las la-object-group' : 'las la-object-ungroup',
                //     title: !isActive ? 'Activate groups for this window.' : 'Deactivate groups for this window.',
                //     btnClass: 'activate-deactivate-groups-at-this-window btn btn-light btn-border btn-sm',
                //     modalData: {
                //         dataBsTarget: '#tabGroupsModal',
                //         dataBsToggle: 'modal'
                //     }
                // },
                {
                    allowedGroupings: ['WindowId', 'Domain', 'Pinned', 'Starred', 'Saved'],
                    icon: 'mdi mdi-download-multiple',
                    title: 'Save tabs to session and close tabs.',
                    btnClass: 'save-this-group-to-session-and-close-tabs btn btn-soft-dark btn-border btn-sm ms-3'
                },
                {
                    allowedGroupings: ['Domain', 'Pinned', 'Starred', 'Saved'],
                    icon: 'ri-book-read-line',
                    title: 'Open under the same window.',
                    btnClass: 'open-under-same-window btn btn-outline-primary btn-sm'
                },
                {
                    allowedGroupings: ['WindowId', 'Domain', 'Pinned', 'Starred', 'Saved'],
                    icon: 'mdi mdi-tag-multiple-outline',
                    title: 'Add tag to all tabs under the group',
                    btnClass: 'add-tag-to-all-tabs btn btn-outline-secondary btn-sm',
                    modalData: {
                        dataBsTarget: '#tagsModal',
                        dataBsToggle: 'modal'
                    }
                },
                {
                    allowedGroupings: ['WindowId', 'Domain', 'Pinned', 'Starred', 'Saved'],
                    icon: 'las la-sticky-note',
                    title: 'Add note to all tabs under the group',
                    btnClass: 'add-note-to-all-tabs btn btn-outline-warning btn-sm',
                    modalData: {
                        dataBsTarget: '#notesModal',
                        dataBsToggle: 'modal'
                    }
                }
            ];

            // Add buttons to the container
            buttons.forEach(({ icon, title, btnClass, allowedGroupings, modalData }) => {
                if (allowedGroupings.includes(getGroupingContext())) {
                    const button = createIconButton(icon, title, btnClass, true, modalData);
                    buttonContainer.appendChild(button);
                }
            });
        })
        .catch(error => console.error('Error fetching group status:', error));

    // Append title, edit icon and buttons to header
    if (windowId) {
        header.appendChild(editIcon);
    }
    header.appendChild(title);
    header.appendChild(buttonContainer);

    return header;
}
function createCardBody(tabsInGroup, currentTabId) {
    const body = document.createElement('div');
    body.className = 'card-body';

    const table = document.createElement('table');
    table.className = 'table table-centered table-hover align-middle table-nowrap mb-0';

    const tbody = document.createElement('tbody');
    const duplicateCounts = getDuplicateCounts(tabsInGroup);

    tabsInGroup.forEach(tab => {
        const row = createTabRow(tab, duplicateCounts[tab.url], tab.id === currentTabId);
        if (row) tbody.appendChild(row);
    });

    if (tabsInGroup.length === 0) {
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = `<td colspan="3" class="text-center empty-row">No grouped tabs found</td>`;
        tbody.appendChild(emptyRow);
    }

    table.appendChild(tbody);
    body.appendChild(table);
    return body;
}
function generateRowHtml(tab, tags, tagBadges, savedTab, duplicateCount, notes, isCurrent = false, tabGroups = "") {
    const isAudible = tab.audible;
    const isMuted = tab.muted;
    const isInactive = tab.discarded;


    const hasTabGroup = !!tabGroups;
    const iconUrl = tab.favIconUrl?.trim() ? tab.favIconUrl : getPlaceholderIconUrl(tab.url);

    return `
        <td>
            <div class="d-flex align-items-center w-100">
                <div class="flex-shrink-0 me-0 mx-4">
                    <div>
                        <img src="${iconUrl}" alt="Icon" class="avatar-sm rounded p-1 me-0 clickable-icon" data-tab-id="${tab.id}" data-window-id="${tab.windowId}">
                    </div>
                </div>
                <div>
                    
                    ${isCurrent ? '<span class="badge bg-success-subtle text-success p-2 fs-12 ms-1">Active tab</span>' : ''}
                    ${isInactive ? '<span class="badge bg-danger-subtle text-danger p-2 fs-12">Inactive tab</span>' : ''}
                    ${duplicateCount > 1 ? `<p class="badge bg-primary-subtle text-primary duplicate-count p-2 fs-12 me-1" title="There are ${duplicateCount} tabs with this URL">${duplicateCount} same tabs opened</p>` : ''}
                    <h5 class="fs-14 my-1 mx-1 title-break cursor-pointer clickable-title" data-tab-id="${tab.id}" data-window-id="${tab.windowId}">${escapeHtml(tab.title)} <i class="bx bx-right-top-arrow-circle"></i></h5>
                    <a class="link-secondary fs-11 mx-1 cursor-pointer clickable-domain" data-tab-id="${tab.id}" data-window-id="${tab.windowId}">${getRootDomain(tab.url)}<i class="ri-external-link-fill"></i></a>
                    <p class="text-decoration-none text-muted fs-12 clickable-window" data-window-id="${tab.windowId}"></p>
                    
                    <div class="tags-container pb-2">${tagBadges}</div>
                </div>
            </div>
        </td>
        <td>
                <div class="w-auto text-center align-middle tab-group-container" data-tab-id="${tab.id}">
                    ${hasTabGroup ? `<p class="mt-3 badge text-dark p-2 fs-12 ms-1" style="background-color: ${mapColorToChromeColor(tabGroups.color)};">${tabGroups.name}</p>` : ''}
                </div>
                <button type="button" class="save-button btn" data-url="${tab.url}" data-tab-id="${tab.id}" data-window-id="${tab.windowId}" data-title="${escapeHtml(tab.title)}" data-favicon="${iconUrl}">
                    <i class="ri-save-3-fill"></i>
                </button>
                <button type="button" class="pin-button btn" data-tab-id="${tab.id}"><i class="las la-thumbtack"></i></button><br/>
                <button type="button" class="star-button btn" data-url="${tab.url}" data-tab-id="${tab.id}" data-window-id="${tab.windowId}" data-title="${escapeHtml(tab.title)}" data-favicon="${iconUrl}"><i class="mdi mdi-paw"></i></button>
                <button type="button" class="volume-button btn ${isAudible ? (isMuted ? ButtonClasses.VOLUME.AUDIBLE_MUTED : ButtonClasses.VOLUME.AUDIBLE_NOT_MUTED) : ButtonClasses.VOLUME.NOT_AUDIBLE}" data-tab-id="${tab.id}">
                    <i class="${isAudible ? (isMuted ? ButtonClasses.VOLUME.AUDIBLE_MUTED_ICON : ButtonClasses.VOLUME.AUDIBLE_NOT_MUTED_ICON) : ButtonClasses.VOLUME.NOT_AUDIBLE_ICON}"></i>
                </button>
            </div><br/>
            <div class="pt-1">
                <button data-bs-toggle="modal" data-bs-target="#tagsModal" type="button" class="tag-button btn btn-sm" data-url="${tab.url}" data-tab-id="${tab.id}" data-window-id="${tab.windowId}" data-title="${escapeHtml(tab.title)}" data-favicon="${iconUrl}"><i class="mdi mdi-tag-multiple-outline"></i></button>
                <button data-bs-toggle="modal" data-bs-target="#notesModal" type="button" class="note-button btn btn-sm" data-url="${tab.url}" data-tab-id="${tab.id}" data-window-id="${tab.windowId}" data-title="${escapeHtml(tab.title)}" data-favicon="${iconUrl}"><i class="las la-sticky-note"></i></button><br />
                <button data-bs-toggle="modal" data-bs-target="#tabGroupsModal" type="button" class="tab-groups-button btn btn-sm" data-url="${tab.url}" data-tab-id="${tab.id}" data-window-id="${tab.windowId}" data-title="${escapeHtml(tab.title)}" data-favicon="${iconUrl}"><i class="bx bx-layer"></i></button>
                <button data-bs-toggle="modal" data-bs-target="#changeTabWindowModal" type="button" class="change-tab-window-button btn btn-sm" data-tab-id="${tab.id}"><i class="bx bx-windows"></i></button>
            </div>
             <!-- <p class="text-muted mt-2 text-center"><span class="badge bg-danger-subtle text-danger p-2 fs-12">15d 12h 32m</span></p> -->
        </td>
        <td>
            <div class="d-flex">
                <div>
                    <button data-bs-toggle="modal" data-bs-target="#tabDetailsModal" type="button" class="btn btn-soft-success btn-border btn-icon tab-details-button" data-tab-id="${tab.id}">
                        <i class="ri-list-settings-line"></i>${notes.length > 0 ? '<span class="position-absolute top-0 start-100 translate-middle badge border border-light rounded-circle bg-danger p-1"><span class="visually-hidden"></span>' : ''}
                    </button>
                    <button type="button" class="btn btn-soft-danger btn-border btn-icon close-tab-button" data-tab-id="${tab.id}"><i class="ri-close-line"></i></button>
                </div>
            </div>
        </td>
    `;
}
function setButtonStates(row, savedTab, tab) {
    const isSaved = !!savedTab;
    const isStarred = isSaved && savedTab.starred;
    const isPinned = tab.pinned;
    const isAudible = tab.audible;
    const isMuted = tab.muted;
    const savedNotes = savedTab?.notes || [];
    const hasNote = savedNotes.length > 0;

    const savedTags = savedTab?.tags || [];
    const hasTag = savedTags.length > 0;

    const savedTabGroup = savedTab?.tabGroups || "";
    const hasTabGroup = savedTabGroup !== "";

    setButtonClass(row.querySelector('.save-button'), 'save', isSaved);
    setButtonClass(row.querySelector('.pin-button'), 'pin', isPinned);
    setButtonClass(row.querySelector('.star-button'), 'star', isStarred);
    setButtonClass(row.querySelector('.volume-button'), 'volume', false, true, isAudible, isMuted);

    setButtonClass(row.querySelector('.tag-button'), 'tag', hasTag);
    setButtonClass(row.querySelector('.note-button'), 'note', hasNote);

    setButtonClass(row.querySelector('.tab-groups-button'), 'tabgroup', hasTabGroup);
}
function updateClearButtons(currentGrouping, currentOrdering) {
    const clearGrouping = document.getElementById('clear-grouping');
    const clearOrdering = document.getElementById('clear-ordering');
    if (clearGrouping)
        clearGrouping.classList.toggle('active', currentGrouping !== null);
    if (clearOrdering)
        clearOrdering.classList.toggle('active', currentOrdering !== null);
}
function updateDropdownStyles(currentGrouping, currentOrdering) {
    document.querySelectorAll('.dropdown-item').forEach(item => {
        item.classList.remove('active');
        const isActive = (item.id === 'group-by-window-id' && currentGrouping === 'WindowId') ||
            (item.id === 'group-by-domain' && currentGrouping === 'Domain') ||
            (item.id === 'group-by-pinned' && currentGrouping === 'Pinned') ||
            (item.id === 'group-by-starred' && currentGrouping === 'Starred') ||
            (item.id === 'group-by-saved' && currentGrouping === 'Saved') ||
            (item.id === 'order-by-window-id' && currentOrdering === 'WindowId') ||
            (item.id === 'order-by-domain' && currentOrdering === 'Domain') ||
            (item.id === 'order-by-pinned' && currentOrdering === 'Pinned') ||
            (item.id === 'order-by-starred' && currentOrdering === 'Starred') ||
            (item.id === 'order-by-saved' && currentOrdering === 'Saved');
        if (isActive) item.classList.add('active');
    });
}
function updateButtonStyles(buttonId, condition, inactiveClass, activeClass) {
    const button = document.getElementById(buttonId);
    if (condition) {
        button?.classList.remove(inactiveClass);
        button?.classList.add(activeClass);
    } else {
        button?.classList.remove(activeClass);
        button?.classList.add(inactiveClass);
    }
}
function createBadgeHtml(tag, colorClass, tabId) {
    return `
        <span class="badge border ${colorClass} me-2 mb-2 d-flex align-items-center" data-tag="${escapeHtml(tag)}" data-tab-id="${tabId}">
            <i class="mdi mdi-tag-multiple-outline py-1"></i> ${escapeHtml(tag)}
            <a href="#" class="tag-close-btn pe-2" data-tag="${escapeHtml(tag)}" data-tab-id="${tabId}">
                <i class="ri-close-fill border-start-double pe-2"></i>
            </a>
        </span>`;
}

function createBadgeRow(tagHtml, isPopup) {
    return `<div class="d-flex flex-wrap mb-1 ${isPopup ? 'justify-content-center' : ''}">${tagHtml}</div>`;
}
function clearTagListContainer(container) {
    container.innerHTML = '';
}
function getRowElement(tabId) {
    let rowElement = document.querySelector('tr[data-tab-id="' + tabId + '"]');
    if (!rowElement) {
        console.error('Row not found for tab ID: ' + tabId);
    }
    return rowElement;
}
function updateTagsContainer(tabId, tags, rowElement) {
    tags = tags || [];
    let tagsContainer = rowElement.querySelector('.tags-container');
    if (!tagsContainer) {
        console.warn('Tags container not found in row for tab ID: ' + tabId);
        return;
    }
    tagsContainer.innerHTML = createTagBadges(tabId, tags); // Update the tags container
}

export function updateTheme(darkModeStatus) {
    document.documentElement.setAttribute('data-bs-theme', darkModeStatus ? 'dark' : 'light');
}

export function queryTabs(queryInfo) {
    return new Promise((resolve, reject) => {
        chrome.tabs.query(queryInfo, (result) => {
            if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
            resolve(result);
        });
    });
}

function removeTab(tabId) {
    return new Promise((resolve, reject) => {
        chrome.tabs.remove(tabId, () => {
            if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
            resolve();
        });
    });
}

export function getAllWindowsWithTabs() {
    return new Promise((resolve, reject) => {
        chrome.windows.getAll({ populate: true }, (windows) => {
            if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
            resolve(windows);
        });
    });
}

function removeTabs(tabIds) {
    return new Promise((resolve, reject) => {
        chrome.tabs.remove(tabIds, () => {
            if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
            resolve();
        });
    });
}

function chunkTabs(tabs, size) {
    const result = [];
    for (let i = 0; i < tabs.length; i += size) {
        result.push(tabs.slice(i, i + size));
    }
    return result;
}

function createWindowWithTabs(urls) {
    return new Promise((resolve, reject) => {
        chrome.windows.create({ url: urls }, (window) => {
            if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
            resolve(window);
        });
    });
}

function removeWindow(windowId) {
    return new Promise((resolve, reject) => {
        chrome.windows.remove(windowId, () => {
            if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
            resolve();
        });
    });
}

function getCurrentWindow() {
    return new Promise((resolve, reject) => {
        chrome.windows.getCurrent({ populate: true }, (window) => {
            if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
            resolve(window);
        });
    });
}

function moveTab(tabId, moveProperties) {
    return new Promise((resolve) => {
        chrome.tabs.move(tabId, moveProperties, (movedTab) => resolve(movedTab));
    });
}

function getCurrentTab() {
    return new Promise((resolve, reject) => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (chrome.runtime.lastError) {
                return reject(chrome.runtime.lastError);
            }
            if (!tabs || tabs.length === 0) {
                return reject(new Error("No active tab found"));
            }
            resolve(tabs[0]);
        });
    });
}


export async function closeDiscardedTabs(tabs) {
    try {
        const tabs = await queryTabs({});

        const currentTab = await getCurrentTab();

        const discardedTabs = tabs.filter(tab => tab.discarded);

        for (const tab of discardedTabs) {
            if (tab.id === currentTab.id) continue;  // Skip the current tab

            try {
                await removeTab(tab.id);
            } catch (err) {
                console.warn(`Failed to close tab ${tab.id}: ${err.message}`);
            }
        }
    } catch (err) {
        console.error('Failed to query tabs:', err);
    }
}

export async function closeDuplicateTabs() {
    try {
        const windows = await getAllWindowsWithTabs();

        const currentTab = await getCurrentTab();
        const currentTabId = currentTab?.id;
        const currentTabUrl = currentTab ? new URL(currentTab.url).href : null;
        const seenUrls = new Set();

        // Add the current tab's URL to the seenUrls set
        if (currentTabUrl) {
            seenUrls.add(currentTabUrl);
        }

        const duplicateTabIds = [];

        // Loop through all windows and tabs
        for (const window of windows) {
            for (const tab of window.tabs) {
                if (tab.id !== currentTabId) {
                    try {
                        const url = new URL(tab.url).href;

                        // If the URL has already been seen, mark the tab as a duplicate
                        if (seenUrls.has(url)) {
                            duplicateTabIds.push(tab.id);
                        } else {
                            seenUrls.add(url);
                        }
                    } catch (e) {
                        console.warn(`Invalid URL in tab ${tab.id}: ${tab.url}`);
                    }
                }
            }
        }

        // Remove all duplicate tabs
        if (duplicateTabIds.length > 0) {
            try {
                await removeTabs(duplicateTabIds);
                console.log(`Closed ${duplicateTabIds.length} duplicate tabs.`);
            } catch (err) {
                console.warn(`Failed to remove duplicate tabs: ${err.message}`);
            }
        }

    } catch (err) {
        console.error('Failed to get windows:', err);
    }
}

function updateTab(tabId, updateInfo) {
    return new Promise((resolve, reject) => {
        chrome.tabs.update(tabId, updateInfo, (tab) => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError));
            } else {
                resolve();
            }
        });
    });
}


export async function regroupIntoNewWindows() {
    try {
        const windows = await getAllWindowsWithTabs();
        const result = await getChromeStorage([
            'regroupWindowsWithFewerThan',
            'splitIntoWindowsWithUpTo',
            'savedPages',
            'windows'
        ]);

        const regroupWindowsWithFewerThan = result.regroupWindowsWithFewerThan || REGROUP_WINDOWS_WITH_FEWER_THAN_DEFAULT;
        const splitIntoWindowsWithUpTo = result.splitIntoWindowsWithUpTo || SPLIT_INTO_WINDOWS_WITH_UP_TO_DEFAULT;
        const savedPages = result.savedPages || {};
        const namedWindows = result.windows || {};

        const namedWindowIds = new Set(Object.keys(namedWindows).map(id => Number(id)));
        const tabsToMove = [];

        const currentWindow = await getCurrentWindow();
        const currentTabId = currentWindow.tabs.find(tab => tab.active)?.id;
        const isCurrentWindowNamed = namedWindowIds.has(currentWindow.id);

        // Step 1: Find small windows (not current, not named)
        const smallWindows = windows.filter(win =>
            win.tabs.length < regroupWindowsWithFewerThan &&
            win.id !== currentWindow.id &&
            !namedWindowIds.has(win.id)
        );

        // Step 2: Collect tabs to move
        for (const win of smallWindows) {
            tabsToMove.push(...win.tabs);
        }

        const remainingTabs = [...tabsToMove];

        // Step 3: Move tabs into current window (if eligible)
        if (!isCurrentWindowNamed && currentWindow.tabs.length < splitIntoWindowsWithUpTo) {
            const availableSlots = splitIntoWindowsWithUpTo - currentWindow.tabs.length;
            const tabsForCurrent = remainingTabs.splice(0, availableSlots);

            for (const tab of tabsForCurrent) {
                if (tab.id === currentTabId) continue;

                const wasPinned = tab.pinned;
                const wasMuted = tab.mutedInfo?.muted;

                try {
                    if (wasPinned) {
                        await updateTab(tab.id, { pinned: false });
                    }

                    await moveTab(tab.id, { windowId: currentWindow.id, index: -1 });

                    if (wasPinned) {
                        await updateTab(tab.id, { pinned: true });
                    }
                    if (wasMuted !== undefined) {
                        await updateTab(tab.id, { muted: wasMuted });
                    }

                    const fromWindow = windows.find(win => win.id === tab.windowId);
                    if (fromWindow) {
                        fromWindow.tabs = fromWindow.tabs.filter(t => t.id !== tab.id);
                    }

                    if (savedPages[tab.id]) {
                        savedPages[tab.id] = {
                            ...savedPages[tab.id],
                            tabId: tab.id,
                            windowId: currentWindow.id
                        };
                    }
                } catch (err) {
                    console.warn(`Failed to move tab ${tab.id} to current window: ${err.message}`);
                }
            }
        }

        // Step 4: Distribute remaining tabs to eligible windows
        for (const tab of remainingTabs) {
            const fromWindow = windows.find(win => win.id === tab.windowId);
            if (!fromWindow || fromWindow.tabs.length === 0) continue;

            const targetWindow = windows.find(win =>
                win.id !== currentWindow.id &&
                !namedWindowIds.has(win.id) &&
                win.tabs.length > 0 &&
                win.tabs.length < splitIntoWindowsWithUpTo
            );

            if (!targetWindow) {
                console.log("No available space for remaining tabs.");
                break;
            }

            const wasPinned = tab.pinned;
            const wasMuted = tab.mutedInfo?.muted;

            try {
                if (wasPinned) {
                    await updateTab(tab.id, { pinned: false });
                }

                await moveTab(tab.id, { windowId: targetWindow.id, index: -1 });

                if (wasPinned) {
                    await updateTab(tab.id, { pinned: true });
                }
                if (wasMuted !== undefined) {
                    await updateTab(tab.id, { muted: wasMuted });
                }

                fromWindow.tabs = fromWindow.tabs.filter(t => t.id !== tab.id);
                targetWindow.tabs.push(tab);

                if (savedPages[tab.id]) {
                    savedPages[tab.id] = {
                        ...savedPages[tab.id],
                        tabId: tab.id,
                        windowId: targetWindow.id
                    };
                }
            } catch (err) {
                console.warn(`Failed to move tab ${tab.id} to window ${targetWindow.id}: ${err.message}`);
            }
        }

        // Step 5: Save updated state
        await setChromeStorage({ savedPages });

    } catch (err) {
        console.error("Failed to regroup windows:", err);
    }
}

export async function splitLargeWindows() {
    try {
        const windows = await getAllWindowsWithTabs();

        const result = await getChromeStorage([
            'splitIntoWindowsWithUpTo',
            'splitWindowsWithMoreThan',
            'savedPages',
            'windows'
        ]);

        const splitIntoWindowsWithUpTo = result.splitIntoWindowsWithUpTo || SPLIT_INTO_WINDOWS_WITH_UP_TO_DEFAULT;
        const splitWindowsWithMoreThan = result.splitWindowsWithMoreThan || SPLIT_WINDOWS_WITH_MORE_THAN_DEFAULT;
        const savedPages = result.savedPages || {};
        const savedWindows = result.windows || {};

        const currentWindow = await getCurrentWindow();
        const currentTab = currentWindow.tabs.find(tab => tab.active);

        for (const win of windows) {
            if (win.tabs.length <= splitWindowsWithMoreThan) continue;

            const isCurrentWindow = win.id === currentWindow.id;
            const baseTitle = savedWindows[win.id]?.title;
            const maxTabs = splitIntoWindowsWithUpTo;

            let tabsToKeep = [];
            let tabsToSplit = [];

            if (isCurrentWindow) {
                const nonActiveTabs = win.tabs.filter(tab => tab.id !== currentTab.id);
                const spaceLeft = maxTabs - 1;
                tabsToKeep = [currentTab, ...nonActiveTabs.slice(0, spaceLeft)];
                tabsToSplit = nonActiveTabs.slice(spaceLeft);
            } else {
                tabsToKeep = win.tabs.slice(0, maxTabs);
                tabsToSplit = win.tabs.slice(maxTabs);
            }

            const chunks = chunkTabs(tabsToSplit, maxTabs);
            let windowCounter = 2;

            // Update savedPages for tabs we're keeping
            for (const tab of tabsToKeep) {
                const oldSavedPage = savedPages[tab.id];
                if (oldSavedPage) {
                    savedPages[tab.id] = {
                        ...oldSavedPage,
                        tabId: tab.id,
                        windowId: win.id
                    };
                }
            }

            if (baseTitle) {
                savedWindows[win.id] = { title: `${baseTitle}_1` };
            }

            // Create new windows from the chunks and remove original tabs
            for (const group of chunks) {
                if (group.length === 0) continue;

                const tabsToClone = group;
                const urls = tabsToClone.map(tab => tab.url || tab.pendingUrl);
                const tabIdsToClose = tabsToClone.map(tab => tab.id);

                try {
                    const newWindow = await createWindowWithTabs(urls);

                    // Update the savedPages for the new window's tabs and preserve pinned/muted states
                    newWindow.tabs.forEach((tab, index) => {
                        const oldTab = tabsToClone[index];
                        const oldSavedPage = savedPages[oldTab.id];
                        const wasPinned = oldTab.pinned;
                        const wasMuted = oldTab.mutedInfo?.muted;

                        if (oldSavedPage) {
                            delete savedPages[oldTab.id]; // Remove old entry

                            savedPages[tab.id] = {
                                ...oldSavedPage,
                                tabId: tab.id,
                                windowId: newWindow.id
                            };
                        }

                        // Restore the pinned and muted states on the new tab
                        if (wasPinned) {
                            updateTab(tab.id, { pinned: true });
                        }
                        if (wasMuted !== undefined) {
                            updateTab(tab.id, { muted: wasMuted });
                        }
                    });

                    await removeTabs(tabIdsToClose);

                    if (baseTitle) {
                        savedWindows[newWindow.id] = { title: `${baseTitle}_${windowCounter++}` };
                    }
                } catch (err) {
                    console.warn(`Failed to create new window from split: ${err.message}`);
                }
            }
        }

        if (Object.keys(savedWindows).length > 0) {
            await setChromeStorage({
                savedPages,
                windows: savedWindows
            });
        } else {
            await setChromeStorage({
                savedPages
            });
        }

    } catch (err) {
        console.error('Failed to split large windows:', err);
    }
}
