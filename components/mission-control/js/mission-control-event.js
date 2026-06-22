import { getChromeStorage, setChromeStorage } from "../../../utils/chrome-util.js";
import { editGroupData, saveGroupData } from "./mission-control-data.js";
import { renderTabsForSession, renderWindows, renderMissionControlTabs, updateActiveDashboardLink, renderSessionList, updateSessionMessages, handleSearchInputChange, renderGroupList, renderTabsForGroup, updateGroupMessages, closeAndClearModal, updateTheme, restartOptionHeader, renderBackups, switchView } from "./mission-control-dom.js";

export async function applyDarkModeSetting() {
    const { darkModeEnabled } = await getChromeStorage(['darkModeEnabled']);

    updateTheme(darkModeEnabled);

    // Update icon display
    updateDarkModeIcons(darkModeEnabled);
}

export function setupDarkModeToggle() {
    const lightIcon = document.querySelector('.light-icon');
    const darkIcon = document.querySelector('.dark-icon');

    const toggleTheme = async () => {
        const { darkModeEnabled } = await getChromeStorage(['darkModeEnabled']);
        const newTheme = !darkModeEnabled;

        await setChromeStorage({ darkModeEnabled: newTheme });
        updateTheme(newTheme);
        updateDarkModeIcons(newTheme);
    };

    if (lightIcon) {
        lightIcon.addEventListener('click', toggleTheme);
    }

    if (darkIcon) {
        darkIcon.addEventListener('click', toggleTheme);
    }
}

export function setupViewToggle() {
    const tableViewBtn = document.getElementById('table-view-btn');
    const gridViewBtn = document.getElementById('grid-view-btn');

    if (tableViewBtn) {
        tableViewBtn.addEventListener('click', () => {
            switchView('table');
        });
    }

    if (gridViewBtn) {
        gridViewBtn.addEventListener('click', () => {
            switchView('grid');
        });
    }
}

function updateDarkModeIcons(isDarkMode) {
    const lightIcon = document.querySelector('.light-icon');
    const darkIcon = document.querySelector('.dark-icon');

    if (isDarkMode) {
        lightIcon?.classList.add('d-none');
        darkIcon?.classList.remove('d-none');
    } else {
        lightIcon?.classList.remove('d-none');
        darkIcon?.classList.add('d-none');
    }
}

export function setupOpenCreateGroupModalClickListener(addNewGroupButtonId) {
    const addNewGroupButton = document.getElementById(addNewGroupButtonId);

    if(!addNewGroupButton) {
        console.error(`Add New Group Button with ID "${addNewGroupButtonId}" not found.`);
    }

    addNewGroupButton.addEventListener('click', () => {
        const groupsInput = document.getElementById('groups-input');
        if(groupsInput) {
            groupsInput.value = ''; // Clear the input field when opening the modal
        }
        const tabGroupsColorButtons = document.querySelectorAll(".groups-color-select");
        tabGroupsColorButtons.forEach(el => el.classList.remove("custom-border-gray"));

        tabGroupsColorButtons.forEach((outerElement, outerIndex) => {
            outerElement.addEventListener("click", () => {
                outerElement.classList.add("custom-border-gray");

                tabGroupsColorButtons.forEach((innerElement, innerIndex) => {
                    if(outerIndex !== innerIndex && innerElement.classList.contains("custom-border-gray")) {
                        innerElement.classList.remove("custom-border-gray");
                    }
                });
            });
        });
    });
}

export function setupSaveGroupsCreateListener() {
    const saveGroupsCreateButton = document.getElementById('save-groups-create-button');

    if (saveGroupsCreateButton) {
        saveGroupsCreateButton.addEventListener('click', async function () {
            const groupIdToEdit = saveGroupsCreateButton?.getAttribute('data-group-id-to-edit');

            const groupsColorButtons = document.querySelectorAll(".groups-color-select");

            const groupColor = Array.from(groupsColorButtons).find(el => el.classList.contains("custom-border-gray"))?.getAttribute('data-tabs-group-color');

            const groupInput = document.getElementById('groups-input');
            const groupText = groupInput.value.trim();

            if (!groupText || !groupColor) {
                return;
            }

            let groupId = null;

            if(groupIdToEdit) {
                await editGroupData(groupIdToEdit, groupText, groupColor);
                groupId = groupIdToEdit;
            } else {
                groupId = await saveGroupData(groupText, groupColor, []);
            }

            closeAndClearModal('groups-modal-create');

            // Refresh list and select current group
            await renderGroupList("group-items");

            // Setup click handlers
            setupGroupClickHandlers("group-items");

            const groupItemsContainer = document.getElementById("group-items");

            if(groupItemsContainer) {
                if(groupIdToEdit) {
                    for(let i = 0; i < groupItemsContainer.children.length; i++) {
                        if(groupItemsContainer.children[i].id === `${groupId}-li`) {
                            groupItemsContainer.children[i]?.click();
                            break;
                        }
                    }
                } else {
                    groupItemsContainer.children[groupItemsContainer.children.length - 1]?.click();
                }
                renderTabsForGroup(groupId);

                const groupList = document.getElementById("group-list");
                groupList?.classList.remove("d-none");
            }

            saveGroupsCreateButton.removeAttribute('data-group-id-to-edit');
        });

        const tabGroupsColorButtons = document.querySelectorAll(".tab-groups-color-select");

        tabGroupsColorButtons.forEach((outerElement, outerIndex) => {
            outerElement.addEventListener("click", () => {
                outerElement.classList.add("custom-border-gray");

                tabGroupsColorButtons.forEach((innerElement, innerIndex) => {
                    if(outerIndex !== innerIndex && innerElement.classList.contains("custom-border-gray")) {
                        innerElement.classList.remove("custom-border-gray");
                    }
                });
            });
        });
    }
}


function sessionClickHandler(event) {
    const target = event.target.closest('.session-link');
    if (!target) return;

    const sessionId = target.getAttribute('data-session-id');
    renderTabsForSession(sessionId);
}

function groupClickHandler(event) {
    const target = event.target.closest('.group-link');
    if (!target) return;

    const groupId = target.getAttribute('data-group-id');
    renderTabsForGroup(groupId);
}

export function setupSessionClickHandlers(sessionListId) {
    const sessionList = document.getElementById(sessionListId);

    if (!sessionList) {
        console.error(`Session list with ID "${sessionListId}" not found.`);
        return;
    }

    sessionList.addEventListener('click', sessionClickHandler);
}

export function setupGroupClickHandlers(groupListId) {
    const groupList = document.getElementById(groupListId);

    if (!groupList) {
        console.error(`Group list with ID "${groupListId}" not found.`);
        return;
    }

    groupList.addEventListener('click', groupClickHandler);
}

export const setupSessionsNavigationItemClickListener = async (itemId, submenuContainerId) => {
    const navigationItem = document.getElementById(itemId);
    const submenu = document.getElementById(submenuContainerId)

    if (!navigationItem || !submenu) {
        console.error(`Element with ID "${itemId}" or with ID "${submenuContainerId}" not found.`);
        return;
    }

    await renderSessionList("session-items");

    // Setup click handlers
    setupSessionClickHandlers("session-items");

    navigationItem.addEventListener('click', async () => {

        await updateActiveDashboardLink(itemId, "session-list");

         // Render sessions
         const noOfSessions = await renderSessionList("session-items");

         // Setup click handlers
         setupSessionClickHandlers("session-items");

         updateSessionMessages("filetype-title", "tab-select-session", "tab-select-group", "tab-no-data-message", noOfSessions);

         // Hide view toggle buttons when on main sessions view
         const viewToggleGroup = document.querySelector('.btn-group[role="group"]');
         if (viewToggleGroup) {
             viewToggleGroup.classList.add("d-none");
         }

        if (submenu.classList.contains("d-none")) {
            submenu.classList.remove("d-none");
        } else {
            submenu.classList.add("d-none");
        }
    });
}

export const setupGroupsNavigationItemClickListener = async (itemId, submenuContainerId) => {
    const navigationItem = document.getElementById(itemId);
    const submenu = document.getElementById(submenuContainerId)

    if (!navigationItem || !submenu) {
        console.error(`Element with ID "${itemId}" or with ID "${submenuContainerId}" not found.`);
        return;
    }

    await renderGroupList("group-items");

    // Setup click handlers
    setupGroupClickHandlers("group-items");

    navigationItem.addEventListener('click', async () => {

        await updateActiveDashboardLink(itemId, "group-list");

         // Render sessions
         const noOfGroups = await renderGroupList("group-items");

         // Setup click handlers
         setupGroupClickHandlers("group-items");

         updateGroupMessages("filetype-title", "tab-select-group", "tab-select-session", "tab-no-data-message", noOfGroups);

         // Hide view toggle buttons when on main groups view
         const viewToggleGroup = document.querySelector('.btn-group[role="group"]');
         if (viewToggleGroup) {
             viewToggleGroup.classList.add("d-none");
         }

        if (submenu.classList.contains("d-none")) {
            submenu.classList.remove("d-none");
        } else {
            submenu.classList.add("d-none");
        }
    });
}

export const setupWindowsNavigationItemClickListener = (itemId) => {
    const navigationItem = document.getElementById(itemId);


    if (!navigationItem) {
        console.error(`Element with ID "${itemId}" not found.`);
        return;
    }

    navigationItem.addEventListener('click', () => {
        restartOptionHeader();
        updateActiveDashboardLink(itemId);
        
        // Show view toggle buttons when viewing windows
        const viewToggleGroup = document.querySelector('.btn-group[role="group"]');
        if (viewToggleGroup) {
            viewToggleGroup.classList.remove("d-none");
        }
        
        // Hide New Group button when navigating from groups to windows
        const addNewGroupButton = document.getElementById("add-new-group");
        if (addNewGroupButton) {
            addNewGroupButton.classList.add("d-none");
        }
        
        renderWindows('file-list', 'main-table-header-row', 'session-meta-data-table-id', 'session-meta-data-table-container-id', 'filetype-title');
    });
}

export const setupBackupsNavigationItemClickListener = (itemId) => {
    const navigationItem = document.getElementById(itemId);


    if (!navigationItem) {
        console.error(`Element with ID "${itemId}" not found.`);
        return;
    }

    navigationItem.addEventListener('click', () => {
        restartOptionHeader();
        updateActiveDashboardLink(itemId);
        
        // Show view toggle buttons when viewing backups
        const viewToggleGroup = document.querySelector('.btn-group[role="group"]');
        if (viewToggleGroup) {
            viewToggleGroup.classList.remove("d-none");
        }
        
        // Hide New Group button when navigating from groups to backups
        const addNewGroupButton = document.getElementById("add-new-group");
        if (addNewGroupButton) {
            addNewGroupButton.classList.add("d-none");
        }
        
        renderBackups('file-list', 'main-table-header-row', 'session-meta-data-table-id', 'session-meta-data-table-container-id', 'filetype-title');
    });
}

export const setupSavedNavigationItemClickListener = (itemId) => {
    const navigationItem = document.getElementById(itemId);

    if (!navigationItem) {
        console.error(`Element with ID "${itemId}" not found.`);
        return;
    }

    // Called to initially load saved tabs
    renderMissionControlTabs('file-list', 'main-table-header-row', 'session-meta-data-table-id', 'session-meta-data-table-container-id');
    updateActiveDashboardLink(itemId);

    navigationItem.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const tagsMatched = navigationItem?.children?.[1];
        const searchedValue = tagsMatched?.getAttribute('data-searched-value');
        
        // Show view toggle buttons for saved tabs
        const viewToggleGroup = document.querySelector('.btn-group[role="group"]');
        if (viewToggleGroup) {
            viewToggleGroup.classList.remove("d-none");
        }
        
        updateActiveDashboardLink(itemId);
        renderMissionControlTabs('file-list', 'main-table-header-row', 'session-meta-data-table-id', 'session-meta-data-table-container-id', { searchedValue, type: 'saved' });
    });
}

export const setupPawedNavigationItemClickListener = (itemId) => {
    const navigationItem = document.getElementById(itemId);

    if (!navigationItem) {
        console.error(`Element with ID "${itemId}" not found.`);
        return;
    }

    navigationItem.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const tagsMatched = navigationItem?.children?.[1];
        const searchedValue = tagsMatched?.getAttribute('data-searched-value');
        
        // Show view toggle buttons for pawed tabs
        const viewToggleGroup = document.querySelector('.btn-group[role="group"]');
        if (viewToggleGroup) {
            viewToggleGroup.classList.remove("d-none");
        }
        
        updateActiveDashboardLink(itemId);
        renderMissionControlTabs('file-list', 'main-table-header-row', 'session-meta-data-table-id', 'session-meta-data-table-container-id', { type: 'pawed', searchedValue });
    });
}

export const setupPinnedNavigationItemClickListener = (itemId) => {
    const navigationItem = document.getElementById(itemId);

    if (!navigationItem) {
        console.error(`Element with ID "${itemId}" not found.`);
        return;
    }

    navigationItem.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const tagsMatched = navigationItem?.children?.[1];
        const searchedValue = tagsMatched?.getAttribute('data-searched-value');
        
        // Show view toggle buttons for pinned tabs
        const viewToggleGroup = document.querySelector('.btn-group[role="group"]');
        if (viewToggleGroup) {
            viewToggleGroup.classList.remove("d-none");
        }
        
        updateActiveDashboardLink(itemId);
        renderMissionControlTabs('file-list', 'main-table-header-row', 'session-meta-data-table-id', 'session-meta-data-table-container-id', { type: 'pinned', searchedValue });
    });
}

export const setupSearchInputListener = async (itemId) => {
    const searchItem = document.getElementById(itemId);

    if (!searchItem) {
        console.error(`Element with ID "${itemId}" not found.`);
        return;
    }

   searchItem.addEventListener('input', (e) => {
        handleSearchInputChange(e.target.value?.trim()?.replace(/ {2,}/g, ' '), "sidebar-navigation-list");
   });
}

export function setupOpenEditGroupModalClickListener(editGroupButtonId, group) {
    const editGroupButton = document.getElementById(editGroupButtonId);

    if(!editGroupButton) {
        console.error(`Edit Group Button with ID "${editGroupButtonId}" not found.`);
    }

    editGroupButton.addEventListener('click', () => {
        const groupsInput = document.getElementById('groups-input');
        const groupsInputLabel = document.getElementById('groups-input-label');
        const saveButton = document.getElementById('save-groups-create-button');
        if(groupsInput) {
            groupsInput.value = group.name; // Clear the input field when opening the modal
        }
        if(groupsInputLabel) {
            groupsInputLabel.innerHTML = 'Edit Group'; // Change label
        }
        if(saveButton) {
            saveButton.setAttribute('data-group-id-to-edit', group.id); // Add group id to edit to save button
        }
        const tabGroupsColorButtons = document.querySelectorAll(".groups-color-select");
        tabGroupsColorButtons.forEach(el => el.getAttribute('data-tabs-group-color') === group.color ? 
            el.classList.add("custom-border-gray") : el.classList.remove("custom-border-gray"));

        tabGroupsColorButtons.forEach((outerElement, outerIndex) => {
            outerElement.addEventListener("click", () => {
                outerElement.classList.add("custom-border-gray");

                tabGroupsColorButtons.forEach((innerElement, innerIndex) => {
                    if(outerIndex !== innerIndex && innerElement.classList.contains("custom-border-gray")) {
                        innerElement.classList.remove("custom-border-gray");
                    }
                });
            });
        });
    });
}

export async function setupSettingsModal() {
    // Function to load and update all settings
    async function loadSettingsValues() {
        const preferences = await getChromeStorage([
            'darkModeEnabled',
            'confirmCloseEnabled',
            'regroupWindowsWithFewerThan',
            'splitWindowsWithMoreThan',
            'splitIntoWindowsWithUpTo'
        ]);

        // Set toggle switch values
        const darkModeSwitch = document.getElementById('darkModeSwitch');
        const confirmCloseSwitch = document.getElementById('confirmCloseSwitch');

        if (darkModeSwitch) {
            darkModeSwitch.checked = preferences.darkModeEnabled || false;
        }

        if (confirmCloseSwitch) {
            confirmCloseSwitch.checked = preferences.confirmCloseEnabled || false;
        }

        // Set wizard setting values
        const regroupWindowsWithFewerThan = document.getElementById('regroupWindowsWithFewerThan');
        const splitWindowsWithMoreThan = document.getElementById('splitWindowsWithMoreThan');
        const splitIntoWindowsWithUpTo = document.getElementById('splitIntoWindowsWithUpTo');

        if (regroupWindowsWithFewerThan) {
            regroupWindowsWithFewerThan.textContent = preferences.regroupWindowsWithFewerThan || 5;
        }

        if (splitWindowsWithMoreThan) {
            splitWindowsWithMoreThan.textContent = preferences.splitWindowsWithMoreThan || 5;
        }

        if (splitIntoWindowsWithUpTo) {
            splitIntoWindowsWithUpTo.textContent = preferences.splitIntoWindowsWithUpTo || 5;
        }
    }

    // Load initial values
    await loadSettingsValues();

    // Set up modal event listener to reload settings when opened
    const settingsModal = document.getElementById('settingsModal');
    if (settingsModal) {
        settingsModal.addEventListener('show.bs.modal', async () => {
            await loadSettingsValues();
        });
    }

    // Setup dark mode toggle
    if (darkModeSwitch) {
        darkModeSwitch.addEventListener('change', async function() {
            const darkModeStatus = this.checked;
            await setChromeStorage({ darkModeEnabled: darkModeStatus });
            updateTheme(darkModeStatus);
            updateDarkModeIcons(darkModeStatus);
        });
    }

    // Setup confirm close toggle
    if (confirmCloseSwitch) {
        confirmCloseSwitch.addEventListener('change', async function() {
            const confirmCloseStatus = this.checked;
            await setChromeStorage({ confirmCloseEnabled: confirmCloseStatus });
        });
    }

    // Setup wizard setting controls
    setupWizardSettingControls();
}

function setupWizardSettingControls() {
    // Regroup Windows With Fewer Than controls
    const regroupMinus = document.getElementById('regroupWindowsWithFewerThanMinus');
    const regroupPlus = document.getElementById('regroupWindowsWithFewerThanPlus');
    const regroupSpan = document.getElementById('regroupWindowsWithFewerThan');

    if (regroupMinus && regroupPlus && regroupSpan) {
        regroupMinus.addEventListener('click', async () => {
            let currentValue = parseInt(regroupSpan.textContent);
            if (currentValue > 1) {
                currentValue--;
                regroupSpan.textContent = currentValue;
                await setChromeStorage({ regroupWindowsWithFewerThan: currentValue });
            }
        });

        regroupPlus.addEventListener('click', async () => {
            let currentValue = parseInt(regroupSpan.textContent);
            if (currentValue < 50) {
                currentValue++;
                regroupSpan.textContent = currentValue;
                await setChromeStorage({ regroupWindowsWithFewerThan: currentValue });
            }
        });
    }

    // Split Windows With More Than controls
    const splitMinus = document.getElementById('splitWindowsWithMoreThanMinus');
    const splitPlus = document.getElementById('splitWindowsWithMoreThanPlus');
    const splitSpan = document.getElementById('splitWindowsWithMoreThan');

    if (splitMinus && splitPlus && splitSpan) {
        splitMinus.addEventListener('click', async () => {
            let currentValue = parseInt(splitSpan.textContent);
            if (currentValue > 1) {
                currentValue--;
                splitSpan.textContent = currentValue;
                await setChromeStorage({ splitWindowsWithMoreThan: currentValue });
            }
        });

        splitPlus.addEventListener('click', async () => {
            let currentValue = parseInt(splitSpan.textContent);
            if (currentValue < 50) {
                currentValue++;
                splitSpan.textContent = currentValue;
                await setChromeStorage({ splitWindowsWithMoreThan: currentValue });
            }
        });
    }

    // Split Into Windows With Up To controls
    const splitIntoMinus = document.getElementById('splitIntoWindowsWithUpToMinus');
    const splitIntoPlus = document.getElementById('splitIntoWindowsWithUpToPlus');
    const splitIntoSpan = document.getElementById('splitIntoWindowsWithUpTo');

    if (splitIntoMinus && splitIntoPlus && splitIntoSpan) {
        splitIntoMinus.addEventListener('click', async () => {
            let currentValue = parseInt(splitIntoSpan.textContent);
            if (currentValue > 1) {
                currentValue--;
                splitIntoSpan.textContent = currentValue;
                await setChromeStorage({ splitIntoWindowsWithUpTo: currentValue });
            }
        });

        splitIntoPlus.addEventListener('click', async () => {
            let currentValue = parseInt(splitIntoSpan.textContent);
            if (currentValue < 50) {
                currentValue++;
                splitIntoSpan.textContent = currentValue;
                await setChromeStorage({ splitIntoWindowsWithUpTo: currentValue });
            }
        });
    }
}