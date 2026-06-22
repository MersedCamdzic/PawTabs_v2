import { getBackups, getGroups, getSavedTabs, getSessions, getWindows, removeGroup, removeSession, removeTabFromStrorage, restoreSession, saveTab, saveWindowData, updateGroupData, updateSessionData, updateTab } from "./mission-control-data.js";
import { isTabOpen, focusTabById, openTabInNewWindow, setChromeStorage, closeTab, getChromeStorage, isTabPinned, isTabSaved, isTabPawed, isTabAudible, isTabMuted } from "../../../utils/chrome-util.js"; // Import the utility function
import { setupOpenEditGroupModalClickListener } from "./mission-control-event.js";
import { setButtonClass } from "../../../utils/button-util.js";
import { togglePin, toggleStar, toggleVolume } from "./mission-control-tab.js";

// View state management
let currentView = 'table'; // 'table' or 'grid'

export function getCurrentView() {
    return currentView;
}

export function setCurrentView(view) {
    currentView = view;
}

export const mapColorToChromeColor = (color) => {
    const chromeColors = {
        grey: "#e0e0e0",
        blue: "#aecbfa",
        red: "#f28b82",
        yellow: "#fdd663",
        green: "#81c995",
        pink: "#ff8bcb",
        purple: "#d7aefb",
        cyan: "#78d9ec",
        orange: "#fbac70"
    };
    return chromeColors[color] || chromeColors.grey;
}

export function updateTheme(darkModeStatus) {
    document.documentElement.setAttribute('data-bs-theme', darkModeStatus ? 'dark' : 'light');
}

export function restartOptionHeader() {
    const header = document.getElementById('filetype-title');
    const headerFilters = document.getElementById('filetype-title-filters');
    const headerEditIcon = document.getElementById('filetype-title-edit-icon');
    const headerEditInput = document.getElementById('filetype-title-edit-input');
    const headerEditIconConfirm = document.getElementById('filetype-title-edit-icon-confirm');
    const headerEditIconCancel = document.getElementById('filetype-title-edit-icon-cancel');
    header?.classList.remove('d-none');
    headerFilters?.classList.add('d-none');
    headerEditIcon?.classList.add('d-none');
    headerEditInput?.classList.add('d-none');
    headerEditIconConfirm?.classList.add("d-none");
    headerEditIconCancel?.classList.add("d-none");
}

export function removeBackdrop() {
    const backdrops = document.querySelectorAll('.modal-backdrop');
    backdrops.forEach(backdrop => backdrop.remove());
}

export function closeAndClearModal(modalId) {
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

export const updateActiveDashboardLink = async (itemId, activeSubmenu) => {
    const item = document.getElementById(itemId);

    const menuItems = [
        { menuId: "windows-navigation-item" },
        { menuId: "backups-navigation-item" },
        { menuId: "saved-navigation-item" },
        { menuId: "pawed-navigation-item" },
        { menuId: "pinned-navigation-item" },
        { menuId: "sessions-navigation-item", submenuId: activeSubmenu === "session-list" ? null : "session-list" },
        { menuId: "groups-navigation-item", submenuId: activeSubmenu === "group-list" ? null : "group-list" }
    ];

    const savedSessions = await getSessions();
    const savedGroups = await getGroups();

    menuItems.push(...savedSessions.map((session) => ({ menuId: session.id })));
    menuItems.push(...savedGroups.map((group) => ({ menuId: group.id })));

    removeActiveLinks(menuItems);

    if (item) {
        item.classList.add("file-list-link-active");
    }
}

export const handleSearchInputChange = async (value, containerId) => {
    const container = document.getElementById(containerId);

    if (!container) {
        console.error(`Container with ID "${containerId}" not found.`);
        return;
    }

    const result = await getChromeStorage(['savedPages']);
    const savedTabs = result.savedPages || {};

    const savedFormatted = Object.values(savedTabs);
    const savedTags = savedFormatted.flatMap(({tags}) => tags || []);
    const pinnedTags = savedFormatted.filter(({pinned}) => pinned).flatMap(({tags}) => tags || []);
    const pawedTags = savedFormatted.filter(({starred}) => starred).flatMap(({tags}) => tags || []);
    const savedNotes = savedFormatted.flatMap(({notes}) => notes || []);
    const pinnedNotes = savedFormatted.filter(({pinned}) => pinned).flatMap(({notes}) => notes || []);
    const pawedNotes = savedFormatted.filter(({starred}) => starred).flatMap(({notes}) => notes || []);

    const searchIncludesTagOrNote = (tags, notes) => tags.find(tag => tag.toLowerCase().includes(value.toLowerCase().replaceAll("\"", "").trim())) || notes.find(note => note.note?.toLowerCase().includes(value.toLowerCase().replaceAll("\"", "").trim()));

    for (let i = 0; i < container.children.length; i++) {
        const child = container.children[i];
        const span = child.querySelector('.file-list-link span');
        const tagsMatchedSpan = child.querySelector('.tags-or-notes-matched');
        const submenuContainer = child.querySelector('[data-simplebar]');
        const submenuItemsContainer = submenuContainer?.querySelector('.sub-menu');

        if (submenuItemsContainer) {
            for (let j = 0; j < submenuItemsContainer.children?.length; j++) {
                const li = submenuItemsContainer.children[j];
                li.classList.remove("d-none");
            }
        }

        if (!value) {
            child.classList.remove("d-none");

            tagsMatchedSpan?.classList.add("d-none");
            tagsMatchedSpan?.removeAttribute('data-searched-value');

            if (submenuContainer) {
                submenuContainer.classList.add("d-none");
            }
        } else {

            let showMenuItem = span && span.innerHTML.toString().toLowerCase().includes(value.toLowerCase());

            if (submenuItemsContainer && !showMenuItem) {
                for (let j = 0; j < submenuItemsContainer.children?.length; j++) {
                    const li = submenuItemsContainer.children[j];
                    const a = li.querySelector('a div');

                    console.log(a.innerHTML.replaceAll("\"", "").trim().toString().toLowerCase());

                    if (a.innerHTML.replaceAll("\"", "").trim().toString().toLowerCase().includes(value.toLowerCase())) {
                        showMenuItem = true;
                        li.classList.remove("d-none");
                    } else {
                        li.classList.add("d-none");
                    }
                }
            }

            if (showMenuItem) {
                child.classList.remove("d-none");
                ((span?.innerHTML === 'Saved' && searchIncludesTagOrNote(savedTags, savedNotes)) ||
                (span?.innerHTML === 'Pinned' && searchIncludesTagOrNote(pinnedTags, pinnedNotes)) ||
                (span?.innerHTML === 'Pawed' && searchIncludesTagOrNote(pawedTags, pawedNotes))) && 
                tagsMatchedSpan?.classList.remove("d-none");
                tagsMatchedSpan?.setAttribute('data-searched-value', value.toLowerCase().replaceAll("\"", "").trim());
            } else {
                if((span?.innerHTML === 'Saved' && searchIncludesTagOrNote(savedTags, savedNotes)) ||
                (span?.innerHTML === 'Pinned' && searchIncludesTagOrNote(pinnedTags, pinnedNotes)) ||
                (span?.innerHTML === 'Pawed' && searchIncludesTagOrNote(pawedTags, pawedNotes))) {
                    tagsMatchedSpan?.classList.remove("d-none");
                    child.classList.remove("d-none");
                    tagsMatchedSpan?.setAttribute('data-searched-value', value.toLowerCase().replaceAll("\"", "").trim());
                } else {
                    child.classList.add("d-none");
                    tagsMatchedSpan?.classList.add("d-none");
                    tagsMatchedSpan?.removeAttribute('data-searched-value');
                }
            }

            if (submenuContainer) {
                submenuContainer.classList.remove("d-none");
            }
        }
    }
};

export function renderSessionList(containerId, activeSessionId = null) {
    const container = document.getElementById(containerId);

    if (!container) {
        console.error(`Container with ID "${containerId}" not found.`);
        return 0;
    }

    return getSessions()
        .then((sessions) => {
            // Reverse sessions array to show latest first
            sessions.reverse();

            // Clear existing sessions
            container.innerHTML = '';

            // Render each session
            sessions.forEach((session) => {
                const listItem = document.createElement('li');
                listItem.id = `${session.id}-li`;
                listItem.addEventListener('click', () => {
                    updateActiveDashboardLink(session.id, "session-list");
                });
                listItem.innerHTML = `
                    <a id="${session.id}" href="#" class="session-link fs-12 overflow-auto" data-session-id="${session.id}">
                        <div>${session.sessionName} (${session.dateTime})</div>
                    </a>
                `;
                container.appendChild(listItem);

                if (session.id === activeSessionId) {
                    updateActiveDashboardLink(session.id, "session-list");
                }
            });

            return sessions.length;
        })
        .catch((error) => {
            console.error('Error rendering session list:', error);
            return 0;
        });
}

export function renderGroupList(containerId) {
    const container = document.getElementById(containerId);

    if (!container) {
        console.error(`Container with ID "${containerId}" not found.`);
        return 0;
    }

    return getGroups()
        .then((groups) => {
            // Clear existing groups
            container.innerHTML = '';

            // Render each groups
            groups.forEach((group) => {
                const listItem = document.createElement('li');
                listItem.id = `${group.id}-li`;
                listItem.addEventListener('click', () => {
                    updateActiveDashboardLink(group.id, "group-list");
                });
                listItem.innerHTML = `
                    <a id="${group.id}" href="#" class="group-link d-flex gap-2 align-items-center fs-12 overflow-auto" data-group-id="${group.id}">
                        <span class="p-2 rounded-circle" style="background-color: ${mapColorToChromeColor(group.color)};"></span>
                        <div>${group.name}</div>
                    </a>
                `;
                container.appendChild(listItem);
            });

            return groups.length;
        })
        .catch((error) => {
            console.error('Error rendering group list:', error);
            return 0;
        });
}

export async function renderTabsForSession(sessionId) {
    try {
        const sessions = await getSessions(); // Fetch all sessions
        const session = sessions.find((s) => s.id === sessionId);

        // Show view toggle buttons when viewing session tabs
        const viewToggleGroup = document.querySelector('.btn-group[role="group"]');
        if (viewToggleGroup) {
            viewToggleGroup.classList.remove("d-none");
        }

        renderMissionControlTabs('file-list', 'main-table-header-row', 'session-meta-data-table-id', 'session-meta-data-table-container-id', { type: 'session', session });

    } catch (error) {
        console.error('Error rendering tabs for session:', error);
    }
}

export async function renderTabsForGroup(groupId) {
    try {
        const groups = await getGroups(); // Fetch all groups
        const group = groups.find((g) => g.id === groupId);

        // Show view toggle buttons when viewing group tabs
        const viewToggleGroup = document.querySelector('.btn-group[role="group"]');
        if (viewToggleGroup) {
            viewToggleGroup.classList.remove("d-none");
        }

        // Always show metadata sidebar for groups, regardless of tab count
        const metadataTableWrapper = document.getElementById('session-meta-data-table-container-id');
        if (metadataTableWrapper) {
            metadataTableWrapper.classList.remove("d-none");
            metadataTableWrapper.style.display = 'block';
        }

        renderMissionControlTabs('file-list', 'main-table-header-row', 'session-meta-data-table-id', 'session-meta-data-table-container-id', { type: 'group', group });

    } catch (error) {
        console.error('Error rendering tabs for group:', error);
    }
}

export const updateSessionMessages = (headerId, selectSessionMessageId, selectGroupMessageId, noDataMessageId, noOfSessions) => {
    const header = document.getElementById(headerId);
    const selectSessionMessage = document.getElementById(selectSessionMessageId);
    const noDataMessage = document.getElementById(noDataMessageId);
    const mainTableWrapper = document.getElementById("main-table-wrapper");
    const mainGridWrapper = document.getElementById("main-grid-wrapper");
    const metadataTableWrapper = document.getElementById("session-meta-data-table-container-id");
    const selectGroupMessage = document.getElementById(selectGroupMessageId);
    const addNewGroupButton = document.getElementById("add-new-group");

    if (!header || !selectSessionMessage || !noDataMessage || !selectGroupMessage) {
        console.error(`Header with ID "${headerId}" not found or Select Session Message with ID "${selectSessionMessageId}" not found or Select Group Message with ID "${selectGroupMessageId}" not found or No Data Message with ID "${noDataMessageId}" not found.`);
        return;
    }

    restartOptionHeader();

    header.innerHTML = "Sessions";
    noDataMessage.classList.add("d-none");
    mainTableWrapper?.classList.add("d-none");
    mainGridWrapper?.classList.add("d-none");
    metadataTableWrapper?.classList.add("d-none");
    selectGroupMessage.classList.add("d-none");
    addNewGroupButton?.classList.add("d-none");

    if (!noOfSessions) {
        selectSessionMessage.classList.add("d-none");
        noDataMessage.classList.remove("d-none");
    } else {
        selectSessionMessage.classList.remove("d-none");
    }
}

export const updateGroupMessages = (headerId, selectGroupMessageId, selectSessionMessageId, noDataMessageId, noOfGroups) => {
    const header = document.getElementById(headerId);
    const selectGroupMessage = document.getElementById(selectGroupMessageId);
    const selectSessionMessage = document.getElementById(selectSessionMessageId);
    const noDataMessage = document.getElementById(noDataMessageId);
    const mainTableWrapper = document.getElementById("main-table-wrapper");
    const mainGridWrapper = document.getElementById("main-grid-wrapper");
    const metadataTableWrapper = document.getElementById("session-meta-data-table-container-id");
    const addNewGroupButton = document.getElementById("add-new-group");

    if (!header || !selectGroupMessage || !noDataMessage || !selectSessionMessage) {
        console.error(`Header with ID "${headerId}" not found or Select Group Message with ID "${selectGroupMessageId}" not found or Select Session Message with ID "${selectSessionMessageId}" not found or No Data Message with ID "${noDataMessageId}" not found.`);
        return;
    }


    restartOptionHeader();

    header.innerHTML = "Groups";
    noDataMessage.classList.add("d-none");
    mainTableWrapper?.classList.add("d-none");
    mainGridWrapper?.classList.add("d-none");
    metadataTableWrapper?.classList.add("d-none");
    selectSessionMessage.classList.add("d-none");
    addNewGroupButton?.classList.remove("d-none");

    if (!noOfGroups) {
        selectGroupMessage.classList.add("d-none");
        noDataMessage.classList.remove("d-none");
    } else {
        selectGroupMessage.classList.remove("d-none");
    }
}

export const removeActiveLinks = (menuItems) => {
    menuItems?.map(({ menuId }) => menuId).forEach(menuId => document.getElementById(menuId)?.classList.remove("file-list-link-active"));
    menuItems?.map(({ submenuId }) => submenuId)?.filter(submenuId => !!submenuId)
        ?.forEach(submenuId => document.getElementById(submenuId)?.classList.add("d-none"));
}

export const renderWindows = async (tableBodyId, tableHeaderRowId, metadataTableId, metadataTableWrapperId, headerId) => {
    const tableBody = document.getElementById(tableBodyId);
    const metadataTable = document.getElementById(metadataTableId);
    const tableHeaderRow = document.getElementById(tableHeaderRowId);
    const metadataTableWrapper = document.getElementById(metadataTableWrapperId);
    const header = document.getElementById(headerId);
    const fileGrid = document.getElementById('file-grid');

    if (!tableBody || !metadataTable || !tableHeaderRow || !metadataTableWrapper || !header || !fileGrid) {
        console.error(`Required elements not found for rendering windows.`);
        return;
    }

    const mainTableWrapper = document.getElementById("main-table-wrapper");
    const mainGridWrapper = document.getElementById("main-grid-wrapper");
    const noDataMessage = document.getElementById("tab-no-data-message");
    const selectSessionMessage = document.getElementById("tab-select-session");
    const selectGroupMessage = document.getElementById("tab-select-group");
    mainTableWrapper?.classList.remove("d-none");
    mainGridWrapper?.classList.add("d-none");
    noDataMessage?.classList.add("d-none");
    selectSessionMessage?.classList.add("d-none");
    selectGroupMessage?.classList.add("d-none");


    try {
        const windows = await getWindows();

        header.innerHTML = "Windows";

        chrome.windows.getAll({ populate: true }, async (chromeWindows) => {
            const activeWindowIds = new Set(chromeWindows.map(window => window.id.toString()));

            const newWindowsData = { ...windows };
            Object.keys(windows).forEach((windowId) => {
                if (!activeWindowIds.has(windowId)) {
                    delete newWindowsData[windowId];
                }
            });

            await setChromeStorage({ windows: newWindowsData });

            // Clear both table and grid
            tableBody.innerHTML = '';
            if (fileGrid) {
                while (fileGrid.firstChild) {
                    fileGrid.removeChild(fileGrid.firstChild);
                }
            }
            metadataTable.innerHTML = '';
            metadataTableWrapper.classList.add("d-none");

            if (!Object.values(newWindowsData).length) {
            // Update no data message for windows
            noDataMessage.innerHTML = `
                <div class="text-center py-5">
                                                    <div class="mb-3">
                                                        <i class="ri-inbox-line display-4 text-muted"></i>
                                                    </div>
                                                    <h5 class="text-muted">No Data Available</h5>
                                                    <p class="text-muted mb-4">There are currently no items to display
                                                        in this section.</p>
                                                </div>
            `;
            noDataMessage.classList.remove("d-none");
            mainTableWrapper?.classList.add("d-none");
            mainGridWrapper?.classList.add("d-none");
            return;
        }

            tableHeaderRow.innerHTML = `
                <th scope="col">No</th>
                <th scope="col">Title</th>
                <th scope="col"></th>
                <th scope="col">Status</th>
                <th scope="col">No of Tabs</th>
                <th class="text-center" scope="col">Actions</th>
            `;

            Object.keys(newWindowsData).forEach((windowId, index) => {
                const row = document.createElement('tr');
                const gridCol = document.createElement('div');
                gridCol.className = 'col-lg-4 col-md-6';

                const foundChromeWindow = chromeWindows.find(({ id }) => id === Number(windowId));

                let windowTitle = windows[windowId]?.title || `Window ${windowId}`;

                const editVersion = `
                    <form class="d-none align-items-center gap-1" id="window-edit-container-${windowId}">
                        <input id="window-edit-input-${windowId}" class="form-control w-50" placeholder="Type here" value="${windows[windowId]?.title || ''}">
                        <i class="bx bx-check fs-20 text-success cursor-pointer" id="window-confirm-edit-button-${windowId}"></i>
                        <i class="bx bx-x text-danger fs-20 cursor-pointer" id="window-cancel-edit-button-${windowId}"></i>
                    </form>
                `;

                const readOnlyVersion = `
                    <a href="#" id="window-readOnly-container-${windowId}">
                        ${windowTitle}
                    </a>
                `;

                row.innerHTML = `
                    <td>${index + 1}</td>
                    <td colspan="2" class="tab-link">
                        ${readOnlyVersion}
                        ${editVersion}
                    </td>
                    <td>${!!foundChromeWindow ? 'Active' : 'Inactive'}</td>
                    <td>${!!foundChromeWindow ? foundChromeWindow.tabs.length : '-'}</td>
                    <td class="text-center">
                        <button type="button" class="open-the-link btn btn-soft-primary btn-border btn-icon">
                            <i class="las la-eye"></i>
                        </button>
                        <button type="button" class="btn btn-soft-secondary btn-border btn-icon" id="window-edit-button-${windowId}">
                            <i class="bx bx-pencil"></i>
                        </button>
                        <button type="button" class="btn btn-soft-danger btn-border btn-icon delete-tab-button" id="window-delete-button-${windowId}"><i class="ri-delete-bin-line"></i></button>
                    </td>
                `;

                gridCol.innerHTML = `
                    <div class="tab-card">
                        <div class="tab-card-header">
                            <div class="tab-card-number">${index + 1}</div>
                            <div class="tab-card-status ${!!foundChromeWindow ? 'active' : 'inactive'}">
                                ${!!foundChromeWindow ? 'Active' : 'Inactive'}
                            </div>
                        </div>
                        <div class="tab-card-title">
                            <div id="window-readOnly-container-grid-${windowId}">
                                ${windowTitle}
                            </div>
                            <form class="d-none align-items-center gap-1" id="window-edit-container-grid-${windowId}">
                                <input id="window-edit-input-grid-${windowId}" class="form-control" placeholder="Type here" value="${windows[windowId]?.title || ''}">
                                <i class="bx bx-check fs-20 text-success cursor-pointer" id="window-confirm-edit-button-grid-${windowId}"></i>
                                <i class="bx bx-x text-danger fs-20 cursor-pointer" id="window-cancel-edit-button-grid-${windowId}"></i>
                            </form>
                        </div>
                        <div class="tab-card-info">
                            <div>Tabs: ${!!foundChromeWindow ? foundChromeWindow.tabs.length : '-'}</div>
                        </div>
                        <div class="tab-card-main-actions">
                            <button type="button" class="open-the-link-grid btn btn-soft-primary btn-border">
                                <i class="las la-eye"></i>
                            </button>
                            <button type="button" class="btn btn-soft-secondary btn-border" id="window-edit-button-grid-${windowId}">
                                <i class="bx bx-pencil"></i>
                            </button>
                            <button type="button" class="btn btn-soft-danger btn-border delete-tab-button-grid" id="window-delete-button-grid-${windowId}">
                                <i class="ri-delete-bin-line"></i>
                            </button>
                        </div>
                    </div>
                `;

                tableBody.append(row);
                fileGrid.append(gridCol);

                const tableElements = {
                    editButton: document.getElementById(`window-edit-button-${windowId}`),
                    confirmEditButton: document.getElementById(`window-confirm-edit-button-${windowId}`),
                    cancelEditButton: document.getElementById(`window-cancel-edit-button-${windowId}`),
                    readOnlyContainer: document.getElementById(`window-readOnly-container-${windowId}`),
                    editContainer: document.getElementById(`window-edit-container-${windowId}`),
                    editInput: document.getElementById(`window-edit-input-${windowId}`),
                    deleteButton: document.getElementById(`window-delete-button-${windowId}`),
                    viewWindowButton: row.querySelector('.open-the-link'),
                    link: row.querySelector('.tab-link')
                };

                const gridElements = {
                    editButton: document.getElementById(`window-edit-button-grid-${windowId}`),
                    confirmEditButton: document.getElementById(`window-confirm-edit-button-grid-${windowId}`),
                    cancelEditButton: document.getElementById(`window-cancel-edit-button-grid-${windowId}`),
                    readOnlyContainer: document.getElementById(`window-readOnly-container-grid-${windowId}`),
                    editContainer: document.getElementById(`window-edit-container-grid-${windowId}`),
                    editInput: document.getElementById(`window-edit-input-grid-${windowId}`),
                    deleteButton: document.getElementById(`window-delete-button-grid-${windowId}`),
                    viewWindowButton: gridCol.querySelector('.open-the-link-grid'),
                    link: gridCol.querySelector('.tab-card-title')
                };

                const allElements = [tableElements, gridElements];

                allElements.forEach(elements => {
                    if (elements.viewWindowButton) {
                        elements.viewWindowButton.addEventListener('click', () => {
                            chrome.windows.update(Number(windowId), { focused: true });
                        });
                    }

                    if (elements.link) {
                        elements.link.addEventListener('click', () => {
                            chrome.windows.update(Number(windowId), { focused: true });
                        });
                    }

                    if (elements.editContainer) {
                        elements.editContainer.addEventListener('submit', (e) => {
                            e.preventDefault();

                            if (!elements.editInput.value) return;

                            saveWindowData({ id: windowId, title: elements.editInput.value });

                            windowTitle = elements.editInput.value;

                            allElements.forEach(el => {
                                if (el.readOnlyContainer) {
                                    el.readOnlyContainer.innerHTML = windowTitle;
                                }
                            });

                            renderReadOnly();
                        });
                    }
                });

                const renderReadOnly = () => {
                    allElements.forEach(elements => {
                        elements.editContainer?.classList.remove("d-flex");
                        elements.editContainer?.classList.add("d-none");
                        elements.readOnlyContainer?.classList.remove("d-none");
                    });
                };

                allElements.forEach(elements => {
                    if (elements.editButton) {
                        elements.editButton.addEventListener('click', (e) => {
                            allElements.forEach(el => {
                                el.editContainer?.classList.remove("d-none");
                                el.editContainer?.classList.add("d-flex");
                                el.readOnlyContainer?.classList.add("d-none");
                            });
                            elements.editInput?.focus();
                            elements.editInput?.setSelectionRange(elements.editInput?.value.length, elements.editInput?.value.length);
                        });
                    }

                    if (elements.cancelEditButton) {
                        elements.cancelEditButton.addEventListener('click', (e) => {
                            renderReadOnly();

                            allElements.forEach(el => {
                                if (el.editInput) {
                                    el.editInput.value = windows[windowId]?.title || '';
                                }
                            });
                        });
                    }

                    if (elements.confirmEditButton) {
                        elements.confirmEditButton.addEventListener('click', (e) => {
                            if (!elements.editInput.value) return;

                            saveWindowData({ id: windowId, title: elements.editInput.value });

                            windowTitle = elements.editInput.value;

                            allElements.forEach(el => {
                                if (el.readOnlyContainer) {
                                    el.readOnlyContainer.innerHTML = windowTitle;
                                }
                            });

                            renderReadOnly();
                        });
                    }

                    if (elements.deleteButton) {
                        elements.deleteButton.addEventListener('click', async (e) => {
                            const newWindowsData = windows;
                            delete newWindowsData[windowId];

                            await setChromeStorage({ windows: newWindowsData });

                            if (!Object.values(newWindowsData).length) {
            // Update no data message for windows
            noDataMessage.innerHTML = `
                                                <div class="text-center py-5">
                                                    <div class="mb-3">
                                                        <i class="ri-inbox-line display-4 text-muted"></i>
                                                    </div>
                                                    <h5 class="text-muted">No Data Available</h5>
                                                    <p class="text-muted mb-4">There are currently no items to display
                                                        in this section.</p>
                                                </div>
            `;
                                noDataMessage.classList.remove("d-none");
                                mainTableWrapper?.classList.add("d-none");
                                mainGridWrapper?.classList.add("d-none");
                            }

                            row.remove();
                            gridCol.remove();

                            const rows = document.querySelectorAll(`#${tableBodyId} tr`);
                            rows.forEach((row, index) => {
                                const firstChild = row.children[0];
                                if (firstChild) firstChild.innerHTML = index + 1;
                            });

                            const gridCards = document.querySelectorAll('#file-grid .tab-card-number');
                            gridCards.forEach((numberElement, index) => {
                                numberElement.innerHTML = index + 1;
                            });
                        });
                    }
                });
            });
        });

        // Apply the current view state after rendering
        setTimeout(() => {
            switchView(getCurrentView());
        }, 0);
    } catch (error) {
        console.error('Error rendering windows:', error);
    }
};

export const renderBackups = async (tableBodyId, tableHeaderRowId, metadataTableId, metadataTableWrapperId, headerId) => {
    const tableBody = document.getElementById(tableBodyId);
    const metadataTable = document.getElementById(metadataTableId);
    const tableHeaderRow = document.getElementById(tableHeaderRowId);
    const metadataTableWrapper = document.getElementById(metadataTableWrapperId);
    const header = document.getElementById(headerId);
    const fileGrid = document.getElementById('file-grid');

    if (!tableBody || !metadataTable || !tableHeaderRow || !metadataTableWrapper || !header || !fileGrid) {
        console.error(`Required elements not found for rendering backups.`);
        return;
    }

    const mainTableWrapper = document.getElementById("main-table-wrapper");
    const mainGridWrapper = document.getElementById("main-grid-wrapper");
    const noDataMessage = document.getElementById("tab-no-data-message");
    const selectSessionMessage = document.getElementById("tab-select-session");
    const selectGroupMessage = document.getElementById("tab-select-group");
    mainTableWrapper?.classList.remove("d-none");
    mainGridWrapper?.classList.add("d-none");
    noDataMessage?.classList.add("d-none");
    selectSessionMessage?.classList.add("d-none");
    selectGroupMessage?.classList.add("d-none");


    try {
        const backups = await getBackups();

        header.innerHTML = "Backups";

        // Clear both table and grid
        tableBody.innerHTML = '';
        if (fileGrid) {
            while (fileGrid.firstChild) {
                fileGrid.removeChild(fileGrid.firstChild);
            }
        }
        metadataTable.innerHTML = '';
        metadataTableWrapper.classList.add("d-none");

        if (!backups.length) {
            noDataMessage.classList.remove("d-none");
            mainTableWrapper?.classList.add("d-none");
            mainGridWrapper?.classList.add("d-none");
            return;
        }

        tableHeaderRow.innerHTML = `
            <th scope="col">No</th>
            <th scope="col">Title</th>
            <th scope="col"></th>
            <th scope="col">Date</th>
            <th scope="col">Total Windows</th>
            <th scope="col">Total Tabs</th>
            <th class="text-center" scope="col">Actions</th>
        `;

        backups.forEach((backup, index) => {
            const row = document.createElement('tr');
            const gridCol = document.createElement('div');
            gridCol.className = 'col-lg-4 col-md-6';

            const readOnlyVersion = `
                <a href="#" id="backup-readOnly-container-${backup.id}">
                    ${backup.name}
                </a>
            `;

            const noOfTabs = backup.windows?.reduce((acc, el) => acc + (el.tabs?.length || 0), 0);

            row.innerHTML = `
                <td>${index + 1}</td>
                <td colspan="2">
                    ${readOnlyVersion}
                </td>
                <td>${backup.dateTime}</td>
                <td>${!!backup.windows.length ? backup.windows.length : '-'}</td>
                <td>${!!noOfTabs ? noOfTabs : '-'}</td>
                <td class="text-center">
                    <button type="button" class="btn btn-soft-secondary btn-border btn-icon" id="backup-restore-button-${backup.id}">
                        <i class="mdi mdi-restore"></i>
                    </button>
                    <button type="button" class="btn btn-soft-danger btn-border btn-icon delete-tab-button" id="backup-delete-button-${backup.id}"><i class="ri-delete-bin-line"></i></button>
                </td>
            `;

            gridCol.innerHTML = `
                <div class="tab-card">
                    <div class="tab-card-header">
                        <div class="tab-card-number">${index + 1}</div>
                        <div class="tab-card-status active">
                            Backup
                        </div>
                    </div>
                    <div class="tab-card-title">
                        <a href="#" id="backup-readOnly-container-grid-${backup.id}">
                            ${backup.name}
                        </a>
                    </div>
                    <div class="tab-card-info">
                        <div>Date: ${backup.dateTime}</div>
                        <div>Windows: ${!!backup.windows.length ? backup.windows.length : '-'}</div>
                        <div>Tabs: ${!!noOfTabs ? noOfTabs : '-'}</div>
                    </div>
                    <div class="tab-card-main-actions">
                        <button type="button" class="btn btn-soft-secondary btn-border" id="backup-restore-button-grid-${backup.id}">
                            <i class="mdi mdi-restore"></i>
                        </button>
                        <button type="button" class="btn btn-soft-danger btn-border delete-tab-button-grid" id="backup-delete-button-grid-${backup.id}">
                            <i class="ri-delete-bin-line"></i>
                        </button>
                    </div>
                </div>
            `;

            tableBody.append(row);
            fileGrid.append(gridCol);

            const tableElements = {
                restoreButton: document.getElementById(`backup-restore-button-${backup.id}`),
                deleteButton: document.getElementById(`backup-delete-button-${backup.id}`)
            };

            const gridElements = {
                restoreButton: document.getElementById(`backup-restore-button-grid-${backup.id}`),
                deleteButton: document.getElementById(`backup-delete-button-grid-${backup.id}`)
            };

            const allElements = [tableElements, gridElements];

            allElements.forEach(elements => {
                if (elements.deleteButton) {
                    elements.deleteButton.addEventListener('click', async (e) => {
                        const result = await getChromeStorage(['backups']);
                        const backups = result.backups || [];

                        const updatedBackups = backups.filter(b => b.id !== backup.id);

                        await setChromeStorage({ backups: updatedBackups });

                        if (!updatedBackups.length) {
                            noDataMessage.classList.remove("d-none");
                            mainTableWrapper?.classList.add("d-none");
                            mainGridWrapper?.classList.add("d-none");
                        }

                        row.remove();
                        gridCol.remove();

                        const rows = document.querySelectorAll(`#${tableBodyId} tr`);
                        rows.forEach((row, index) => {
                            const firstChild = row.children[0];
                            if (firstChild) firstChild.innerHTML = index + 1;
                        });

                        const gridCards = document.querySelectorAll('#file-grid .tab-card-number');
                        gridCards.forEach((numberElement, index) => {
                            numberElement.innerHTML = index + 1;
                        });
                    });
                }
            });

            async function restoreBackupAndRefreshWindowNames(backup) {
                if (!backup || !Array.isArray(backup.windows)) {
                    throw new Error("Invalid backup format.");
                }

                const oldWindowData = backup.windows;

                // 1. Store currently open windows (to close them later)
                const existingWindows = await chrome.windows.getAll();
                const existingWindowIds = existingWindows.map(w => w.id);

                const newWindowNameMap = {};
                const createdWindowIds = [];

                // 2. Create new windows and tabs
                for (const win of oldWindowData) {
                    const tabs = win.tabs || [];
                    const firstTab = tabs[0];

                    // Create window with first tab
                    const createdWin = await chrome.windows.create({
                        url: firstTab?.url || 'chrome://newtab/',
                        focused: win.focused,
                    });

                    const newWinId = createdWin.id;
                    createdWindowIds.push(newWinId);

                    const createdTabs = createdWin.tabs || [];

                    // Update first tab's pinned and active state
                    if (firstTab && createdTabs[0]) {
                        await chrome.tabs.update(createdTabs[0].id, {
                            pinned: firstTab.pinned,
                            active: firstTab.active,
                        });

                        if (typeof firstTab.muted === 'boolean') {
                            await chrome.tabs.update(createdTabs[0].id, {
                                muted: firstTab.muted
                            });
                        }
                    }

                    // Create remaining tabs
                    for (let i = 1; i < tabs.length; i++) {
                        const tab = tabs[i];
                        const createdTab = await chrome.tabs.create({
                            windowId: newWinId,
                            url: tab.url,
                            pinned: tab.pinned,
                            active: tab.active,
                        });

                        if (typeof tab.muted === 'boolean') {
                            await chrome.tabs.update(createdTab.id, {
                                muted: tab.muted
                            });
                        }
                    }

                    // Store window name
                    if (win.windowName) {
                        newWindowNameMap[newWinId.toString()] = {title: win.windowName};
                    }
                }

                // 3. Save only the new window name mappings
                await setChromeStorage({ windows: newWindowNameMap });

                // 4. Close all windows that existed before the restore
                for (const oldId of existingWindowIds) {
                    if (!createdWindowIds.includes(oldId)) {
                        try {
                            await chrome.windows.remove(oldId);
                        } catch (err) {
                            console.warn(`Could not close window ${oldId}:`, err);
                        }
                    }
                }
            }


            allElements.forEach(elements => {
                if (elements.restoreButton) {
                    elements.restoreButton.addEventListener('click', () => {
                        restoreBackupAndRefreshWindowNames(backup);
                    });
                }
            });

        });

        // Apply the current view state after rendering
        setTimeout(() => {
            switchView(getCurrentView());
        }, 0);
    } catch (error) {
        console.error('Error rendering backups:', error);
    }
};

export function switchView(view) {
    const tableWrapper = document.getElementById('main-table-wrapper');
    const gridWrapper = document.getElementById('main-grid-wrapper');
    const tableViewBtn = document.getElementById('table-view-btn');
    const gridViewBtn = document.getElementById('grid-view-btn');
    const noDataMessage = document.getElementById("tab-no-data-message");

    const noDataMessageHidden = noDataMessage?.classList.contains("d-none");

    if (view === 'grid') {
        tableWrapper?.classList.add('d-none');
        gridWrapper?.classList.remove('d-none');
        tableViewBtn?.classList.remove('active');
        gridViewBtn?.classList.add('active');
        setCurrentView('grid');
    } else {
        if(noDataMessageHidden) {
            tableWrapper?.classList.remove('d-none');
        }
        gridWrapper?.classList.add('d-none');
        tableViewBtn?.classList.add('active');
        gridViewBtn?.classList.remove('active');
        setCurrentView('table');
    }
}

export const renderMissionControlTabs = async (tableBodyId, tableHeaderRowId, metadataTableId, metadataTableWrapperId, additionalData = { type: 'saved', session: null, searchedValue: null }) => {
    const { type, session, group, searchedValue } = additionalData;

    const tableBody = document.getElementById(tableBodyId);
    const metadataTable = document.getElementById(metadataTableId);
    const tableHeaderRow = document.getElementById(tableHeaderRowId);
    const metadataTableWrapper = document.getElementById(metadataTableWrapperId);
    const fileGrid = document.getElementById('file-grid');

    if (!tableBody || !metadataTable || !tableHeaderRow || !metadataTableWrapper || !fileGrid) {
        console.error(`Required elements not found for rendering tabs.`);
        return;
    }

    const mainTableWrapper = document.getElementById("main-table-wrapper");
    const noDataMessage = document.getElementById("tab-no-data-message");
    const selectSessionMessage = document.getElementById("tab-select-session");
    const selectGroupMessage = document.getElementById("tab-select-group");
    const addNewGroupButton = document.getElementById("add-new-group");
    const header = document.getElementById('filetype-title');
    const headerFilters = document.getElementById('filetype-title-filters');
    const headerEditIcon = document.getElementById('filetype-title-edit-icon');
    const headerEditInput = document.getElementById('filetype-title-edit-input');
    const headerEditIconConfirm = document.getElementById('filetype-title-edit-icon-confirm');
    const headerEditIconCancel = document.getElementById('filetype-title-edit-icon-cancel');
    const headerForm = document.getElementById('filetype-title-form');
    mainTableWrapper?.classList.remove("d-none");
    noDataMessage?.classList.add("d-none");
    selectSessionMessage?.classList.add("d-none");
    selectGroupMessage?.classList.add("d-none");
    addNewGroupButton?.classList.add("d-none");

    restartOptionHeader();

    try {
        let missionControlTabs = await getSavedTabs();

        missionControlTabs = Object.values(missionControlTabs);

        const handleClickRemoveFilters = () => {
            renderMissionControlTabs(
                tableBodyId,
                tableHeaderRowId,
                metadataTableId,
metadataTableWrapperId,                
                { ...additionalData, searchedValue: null }
            );
        };

        if(searchedValue) {
            // Filter tabs to show those matching title, URL, tags, or notes
            const originalTabsCount = missionControlTabs.length;
            missionControlTabs = missionControlTabs.filter(({title, url, tags, notes}) => {
                const titleMatch = title?.toLowerCase().includes(searchedValue);
                const urlMatch = url?.toLowerCase().includes(searchedValue);
                const tagMatch = tags?.some(t => t.toLowerCase().includes(searchedValue));
                const noteMatch = notes?.some(n => n.note?.toLowerCase().includes(searchedValue));
                return titleMatch || urlMatch || tagMatch || noteMatch;
            });

            // Determine what type of filtering was applied
            const hasTitleMatches = missionControlTabs.some(({title}) => title?.toLowerCase().includes(searchedValue));
            const hasUrlMatches = missionControlTabs.some(({url}) => url?.toLowerCase().includes(searchedValue));
            const hasTagMatches = missionControlTabs.some(({tags}) => tags?.some(t => t.toLowerCase().includes(searchedValue)));
            const hasNoteMatches = missionControlTabs.some(({notes}) => notes?.some(n => n.note?.toLowerCase().includes(searchedValue)));

            headerFilters?.classList.remove("d-none");
            headerFilters?.classList.add("d-flex");

            const filterText = headerFilters?.children?.[0];
            if(filterText) {
                const filterTypes = [];
                if (hasTitleMatches) filterTypes.push('titles');
                if (hasUrlMatches) filterTypes.push('URLs');
                if (hasTagMatches) filterTypes.push('tags');
                if (hasNoteMatches) filterTypes.push('notes');

                const filterType = filterTypes.length > 1 ? filterTypes.slice(0, -1).join(', ') + ' and ' + filterTypes.slice(-1) : filterTypes[0];
                filterText.innerHTML = `showing ${missionControlTabs.length} tabs filtered by ${filterType}`;
            }
            const filterBtn = headerFilters?.children?.[1];
            if (filterBtn) {
                const newBtn = filterBtn.cloneNode(true);
                filterBtn.parentNode.replaceChild(newBtn, filterBtn);
                newBtn.addEventListener('click', handleClickRemoveFilters);
            }
        }

        switch (type) {
            case 'saved':
                header.innerHTML = "Saved Tabs";
                break;
            case 'pawed':
                header.innerHTML = "Pawed Tabs";
                missionControlTabs = Object.values(missionControlTabs).filter(({ starred }) => starred);
                break;
            case 'pinned':
                header.innerHTML = "Pinned Tabs";
                missionControlTabs = Object.values(missionControlTabs).filter(({ pinned }) => pinned);
                break;
            case 'session':
                if (session) {
                    missionControlTabs = session?.tabs?.map(tab => ({ ...tab, tabId: tab.id })) || [];
                    header.innerHTML = session.sessionName;
                    headerEditIcon?.classList.remove("d-none");
                }
                break;
            case 'group':
                if (group) {
                    missionControlTabs = group?.tabs || [];
                    header.innerHTML = group.name;
                }
                break;
            default:
                break;
        }

        const handleCancelTitleForm = () => {
            header?.classList.remove("d-none");
            headerEditIconConfirm?.classList.add("d-none");
            headerEditIconCancel?.classList.add("d-none");
            headerEditIcon?.classList.remove("d-none");
            headerEditInput?.classList.add("d-none");
        }

        const handleConfirmTitleForm = async () => {
            if (!headerEditInput?.value) return;

            if (type === 'session') {
                await updateSessionData(session.id, {
                    sessionName: headerEditInput?.value
                });
                header.innerHTML = headerEditInput?.value;
                await renderSessionList("session-items", session.id);

                const metadataTableSessionName = document.querySelector('.metadata-table-session-name');
                if (metadataTableSessionName) {
                    metadataTableSessionName.innerHTML = `Session Name: ${headerEditInput?.value}`;
                }
            }

            handleCancelTitleForm();
        }

        headerEditIcon?.addEventListener('click', () => {
            if (type === 'session') {
                headerEditIconConfirm?.classList.remove("d-none");
                headerEditIconCancel?.classList.remove("d-none");
                headerEditIcon?.classList.add("d-none");
                header?.classList.add("d-none");
                headerEditInput?.classList.remove("d-none");
                if (headerEditInput) {
                    headerEditInput.value = header.innerHTML;
                    headerEditInput.focus();
                    headerEditInput.setSelectionRange(headerEditInput.value.length, headerEditInput.value.length);
                }
            }
        });

        headerEditIconCancel?.addEventListener('click', () => {
            handleCancelTitleForm();
        });

        headerForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            handleConfirmTitleForm();
        })

        headerEditIconConfirm?.addEventListener('click', () => {
            handleConfirmTitleForm();
        });

        // Clear both table and grid before rendering - ensure complete cleanup
        if (tableBody) {
            while (tableBody.firstChild) {
                tableBody.removeChild(tableBody.firstChild);
            }
        }

        if (fileGrid) {
            while (fileGrid.firstChild) {
                fileGrid.removeChild(fileGrid.firstChild);
            }
        }

        if (metadataTable) {
            metadataTable.innerHTML = '';
        }
        metadataTableWrapper.classList.add("d-none");

        if (!missionControlTabs.length) {
            noDataMessage.classList.remove("d-none");
            mainTableWrapper?.classList.add("d-none");
            document.getElementById('main-grid-wrapper')?.classList.add("d-none");

            // For groups, still show metadata even if no tabs
            if (type === 'group' && group) {
                metadataTableWrapper.classList.remove("d-none");
                metadataTableWrapper.style.display = 'block';

                // Render group metadata even with no tabs
                metadataTable.innerHTML = `
                    <tbody>
                        <tr>
                            <td colspan="2">
                                <div class="metadata-card group-metadata">
                                    <div class="metadata-header">
                                        <div class="metadata-icon">
                                            <i class="ri-star-line"></i>
                                        </div>
                                        <h5 class="metadata-title">Group Data</h5>
                                    </div>

                                    <div class="metadata-info">
                                        <div class="metadata-info-item">
                                            <span class="metadata-info-label">Group ID</span>
                                            <span class="metadata-info-value">${group.id}</span>
                                        </div>
                                        <div class="metadata-info-item">
                                            <span class="metadata-info-label">Group Name</span>
                                            <span class="metadata-info-value">${group.name}</span>
                                        </div>
                                        <div class="metadata-info-item">
                                            <span class="metadata-info-label">Color</span>
                                            <span class="metadata-info-value" style="display: flex; align-items: center; gap: 8px;">
                                                <span class="group-color-indicator" style="background-color: ${mapColorToChromeColor(group.color)};"></span>
                                                ${group.color}
                                            </span>
                                        </div>
                                        <div class="metadata-info-item">
                                            <span class="metadata-info-label">Number of Tabs</span>
                                            <span class="metadata-info-value highlight">0</span>
                                        </div>
                                    </div>

                                    <div class="metadata-actions">
                                        <button class="metadata-btn btn-edit edit-group-button" data-group-id="${group.id}">
                                            <i class="ri-edit-line"></i>
                                        </button>
                                        <button class="metadata-btn btn-delete delete-group-button" data-group-id="${group.id}">
                                            <i class="ri-delete-bin-line"></i>
                                        </button>
                                    </div>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                `;

                // Add event listeners for the buttons even when no tabs
                const editButton = metadataTable.querySelector('.edit-group-button');
                if (editButton) {
                    editButton.addEventListener('click', () => {
                        const groupsInput = document.getElementById('groups-input');
                        const groupsInputLabel = document.getElementById('groups-input-label');
                        const saveButton = document.getElementById('save-groups-create-button');

                        if (groupsInput) {
                            groupsInput.value = group.name;
                        }
                        if (groupsInputLabel) {
                            groupsInputLabel.innerHTML = 'Edit Group';
                        }
                        if (saveButton) {
                            saveButton.setAttribute('data-group-id-to-edit', group.id);
                        }

                        const tabGroupsColorButtons = document.querySelectorAll(".groups-color-select");
                        tabGroupsColorButtons.forEach(el => {
                            if (el.getAttribute('data-tabs-group-color') === group.color) {
                                el.classList.add("custom-border-gray");
                            } else {
                                el.classList.remove("custom-border-gray");
                            }
                        });

                        const modal = new bootstrap.Modal(document.getElementById('groups-modal-create'));
                        modal.show();
                    });
                }

                const deleteButton = metadataTable.querySelector('.delete-group-button');
                if (deleteButton) {
                    deleteButton.addEventListener('click', async () => {
                        const groupIdToDelete = deleteButton.getAttribute('data-group-id');
                        await removeGroup(groupIdToDelete);

                        const groupsNavItem = document.getElementById('groups-navigation-item');
                        if (groupsNavItem) {
                            groupsNavItem.click();
                        }
                    });
                }
            }

            return; // Exit early if no tabs to show
        }

        tableHeaderRow.innerHTML = `
            <th scope="col">No</th>
            <th scope="col">Title</th>
            <th scope="col"></th>
            <th scope="col">Status</th>
            <th scope="col"></th>
            <th class="text-center" scope="col">Actions</th>
        `;

        // Render metadata for sessions
        if (type === 'session' && session) {
            metadataTableWrapper.classList.remove("d-none");
            metadataTableWrapper.style.display = 'block';
            metadataTable.innerHTML = `
                <tbody>
                    <tr>
                        <td colspan="2">
                            <div class="metadata-card session-metadata">
                                <div class="metadata-header">
                                    <div class="metadata-icon">
                                        <i class="ri-folder-2-line"></i>
                                    </div>
                                    <h5 class="metadata-title">Session Data</h5>
                                </div>

                                <div class="metadata-info">
                                    <div class="metadata-info-item">
                                        <span class="metadata-info-label">Session ID</span>
                                        <span class="metadata-info-value">${session.id}</span>
                                    </div>
                                    <div class="metadata-info-item">
                                        <span class="metadata-info-label">Session Name</span>
                                        <span class="metadata-info-value">${session.sessionName}</span>
                                    </div>
                                    <div class="metadata-info-item">
                                        <span class="metadata-info-label">Number of Tabs</span>
                                        <span class="metadata-info-value highlight">${session.tabs?.length || 0}</span>
                                    </div>
                                    <div class="metadata-info-item">
                                        <span class="metadata-info-label">Saved On</span>
                                        <span class="metadata-info-value">${session.dateTime}</span>
                                    </div>
                                </div>

                                <div class="metadata-actions">
                                    <button class="metadata-btn btn-restore restore-session-button" data-session-id="${session.id}">
                                        <i class="ri-refresh-line"></i>
                                    </button>
                                    <button class="metadata-btn btn-delete delete-session-button" data-session-id="${session.id}">
                                        <i class="ri-delete-bin-line"></i>
                                    </button>
                                </div>
                            </div>
                        </td>
                    </tr>
                </tbody>
            `;

            // Add click event for restore session button
            const restoreButton = metadataTable.querySelector('.restore-session-button');
            if (restoreButton) {
                restoreButton.addEventListener('click', async () => {
                    const sessionIdToRestore = restoreButton.getAttribute('data-session-id');
                    await restoreSession(session.tabs);
                });
            }

            // Add click event for delete session button
            const deleteButton = metadataTable.querySelector('.delete-session-button');
            if (deleteButton) {
                deleteButton.addEventListener('click', async () => {
                    const sessionIdToDelete = deleteButton.getAttribute('data-session-id');
                    await removeSession(sessionIdToDelete);

                    // Navigate back to sessions list after deletion
                    const sessionsNavItem = document.getElementById('sessions-navigation-item');
                    if (sessionsNavItem) {
                        sessionsNavItem.click();
                    }
                });
            }
        }

        // Render metadata for groups
        if (type === 'group' && group) {
            metadataTableWrapper.classList.remove("d-none");
            metadataTableWrapper.style.display = 'block';
            metadataTable.innerHTML = `
                <tbody>
                    <tr>
                        <td colspan="2">
                            <div class="metadata-card group-metadata">
                                <div class="metadata-header">
                                    <div class="metadata-icon">
                                        <i class="ri-star-line"></i>
                                    </div>
                                    <h5 class="metadata-title">Group Data</h5>
                                </div>

                                <div class="metadata-info">
                                    <div class="metadata-info-item">
                                        <span class="metadata-info-label">Group ID</span>
                                        <span class="metadata-info-value">${group.id}</span>
                                    </div>
                                    <div class="metadata-info-item">
                                        <span class="metadata-info-label">Group Name</span>
                                        <span class="metadata-info-value">${group.name}</span>
                                    </div>
                                    <div class="metadata-info-item">
                                        <span class="metadata-info-label">Color</span>
                                        <span class="metadata-info-value" style="display: flex; align-items: center; gap: 8px;">
                                            <span class="group-color-indicator" style="background-color: ${mapColorToChromeColor(group.color)};"></span>
                                            ${group.color}
                                        </span>
                                    </div>
                                    <div class="metadata-info-item">
                                        <span class="metadata-info-label">Number of Tabs</span>
                                        <span class="metadata-info-value highlight">${group.tabs?.length || 0}</span>
                                    </div>
                                </div>

                                <div class="metadata-actions">
                                    <button class="metadata-btn btn-edit edit-group-button" data-group-id="${group.id}">
                                        <i class="ri-edit-line"></i>
                                    </button>
                                    <button class="metadata-btn btn-delete delete-group-button" data-group-id="${group.id}">
                                        <i class="ri-delete-bin-line"></i>
                                    </button>
                                </div>
                            </div>
                        </td>
                    </tr>
                </tbody>
            `;

            // Add click event for edit group button
            const editButton = metadataTable.querySelector('.edit-group-button');
            if (editButton) {
                editButton.addEventListener('click', () => {
                    // Setup form for editing
                    const groupsInput = document.getElementById('groups-input');
                    const groupsInputLabel = document.getElementById('groups-input-label');
                    const saveButton = document.getElementById('save-groups-create-button');

                    if (groupsInput) {
                        groupsInput.value = group.name;
                    }
                    if (groupsInputLabel) {
                        groupsInputLabel.innerHTML = 'Edit Group';
                    }
                    if (saveButton) {
                        saveButton.setAttribute('data-group-id-to-edit', group.id);
                    }

                    // Set color selection
                    const tabGroupsColorButtons = document.querySelectorAll(".groups-color-select");
                    tabGroupsColorButtons.forEach(el => {
                        if (el.getAttribute('data-tabs-group-color') === group.color) {
                            el.classList.add("custom-border-gray");
                        } else {
                            el.classList.remove("custom-border-gray");
                        }
                    });

                    // Open the group edit modal
                    const modal = new bootstrap.Modal(document.getElementById('groups-modal-create'));
                    modal.show();
                });
            }

            // Add click event for delete group button
            const deleteButton = metadataTable.querySelector('.delete-group-button');
            if (deleteButton) {
                deleteButton.addEventListener('click', async () => {
                    const groupIdToDelete = deleteButton.getAttribute('data-group-id');
                    await removeGroup(groupIdToDelete);

                    // Navigate back to groups list after deletion
                    const groupsNavItem = document.getElementById('groups-navigation-item');
                    if (groupsNavItem) {
                        groupsNavItem.click();
                    }
                });
            }
        }

        // Apply current view state before rendering
        const currentViewState = getCurrentView();

        // Process tabs and render them
        missionControlTabs.forEach(async (tab, index) => {
            const rowNumber = index + 1; // Start numbering from 1 for each new render
            let isOpen = await isTabOpen(tab.tabId); // Check if the tab is still open

            let saved = await isTabSaved(tab.tabId);
            let pinned = isOpen && await isTabPinned(tab.tabId) || tab.pinned;
            let pawed = await isTabPawed(tab.tabId);
            let audible = await isTabAudible(tab.tabId);
            let muted = await isTabMuted(tab.tabId);

            // Create table row
            const row = document.createElement('tr');
            row.innerHTML = `
            <td>
                ${rowNumber}
            </td>
            <td colspan="2">
                <a href="#" class="tab-link custom-text-break" data-tab-id="${tab.tabId}" data-tab-url="${tab.url}">
                    ${tab.title}
                </a>
            </td>
            <td class="saved-tab-row-status-cell">
                ${isOpen ? 'Active' : 'Inactive'}
            </td>
            <td class="text-center">
                <button type="button" class="btn btn${!saved ? '-ghost' : ''}-success btn-sm save-button-mc">
                    <i class="ri-save-3-fill"></i>
                </button>
                <button type="button" class="btn btn${!pinned ? '-ghost' : ''}-secondary btn-sm pin-button-mc">
                    <i class="las la-thumbtack"></i>
                </button>
                <button type="button" class="btn btn${!pawed ? '-ghost' : ''}-danger btn-sm star-button-mc">
                    <i class="mdi mdi-paw"></i>
                </button>
                <button type="button" class="btn btn${audible ? (muted ? '-outline-danger' : '-primary') : '-ghost-light'} btn-sm volume-button-mc">
                    <i class="bx ${audible ? muted ? 'bx-volume-mute':'bx-volume-full':'bx-volume'} volume-button-icon-mc"></i>
                </button>
            </td>
            <td class="text-center">
                <button type="button" class="open-the-link btn btn-soft-${isOpen ? "primary" : "secondary"} btn-border btn-icon">
                    <i class="${isOpen ? "las la-eye" : "ri-external-link-fill"}"></i>
                </button>
                <button ${!isOpen ? 'disabled="true"' : ''} type="button" class="btn ${isOpen ? 'btn-soft-danger btn-border' : ''} btn-icon close-tab-button-mc" data-tab-id="${tab.tabId}"><i class="ri-close-line"></i></button>
                <button type="button" class="btn btn-soft-danger btn-border btn-icon delete-tab-button-mc" data-tab-id="${tab.tabId}"><i class="ri-delete-bin-line"></i></button>
            </td>
        `;

            // Create grid card
            const gridCol = document.createElement('div');
            gridCol.className = 'col-lg-4 col-md-6';
            gridCol.innerHTML = `
                <div class="tab-card">
                    <div class="tab-card-header">
                        <div class="tab-card-number">${rowNumber}</div>
                        <div class="tab-card-status ${isOpen ? 'active' : 'inactive'}">
                            ${isOpen ? 'Active' : 'Inactive'}
                        </div>
                    </div>
                    <div class="tab-card-title">
                        <a href="#" class="tab-link" data-tab-id="${tab.tabId}" data-tab-url="${tab.url}">
                            ${tab.title}
                        </a>
                    </div>
                    <div class="tab-card-main-actions">
                        <button type="button" class="btn btn${!saved ? '-ghost' : ''}-success btn-sm save-button-mc">
                            <i class="ri-save-3-fill"></i>
                        </button>
                        <button type="button" class="btn btn${!pinned ? '-ghost' : ''}-secondary btn-sm pin-button-mc">
                            <i class="las la-thumbtack"></i>
                        </button>
                        <button type="button" class="btn btn${!pawed ? '-ghost' : ''}-danger btn-sm star-button-mc">
                            <i class="mdi mdi-paw"></i>
                        </button>
                        <button type="button" class="btn btn${audible ? (muted ? '-outline-danger' : '-primary') : '-ghost-light'} btn-sm volume-button-mc">
                            <i class="bx ${audible ? muted ? 'bx-volume-mute':'bx-volume-full':'bx-volume'} volume-button-icon-mc"></i>
                        </button>
                        <button type="button" class="open-the-link btn btn-soft-${isOpen ? "primary" : "secondary"} btn-border btn-sm">
                            <i class="${isOpen ? "las la-eye" : "ri-external-link-fill"}"></i>
                        </button>
                        <button ${!isOpen ? 'disabled="true"' : ''} type="button" class="btn ${isOpen ? 'btn-soft-danger btn-border' : ''} btn-sm close-tab-button-mc" data-tab-id="${tab.tabId}">
                            <i class="ri-close-line"></i>
                        </button>
                        <button type="button" class="btn btn-soft-danger btn-border btn-sm delete-tab-button-mc" data-tab-id="${tab.tabId}">
                            <i class="ri-delete-bin-line"></i>
                        </button>
                    </div>
                </div>
            `;

            tableBody.append(row);
            fileGrid.append(gridCol);

            // Add click event for the link - get elements from both table and grid
            const tableElements = {
                link: row.querySelector('.open-the-link'),
                pinTabButton: row.querySelector('.pin-button-mc'),
                starTabButton: row.querySelector('.star-button-mc'),
                closeTabButton: row.querySelector('.close-tab-button-mc'),
                deleteTabButton: row.querySelector('.delete-tab-button-mc'),
                tabTitleLink: row.querySelector('.tab-link'),
                saveTabButton: row.querySelector('.save-button-mc'),
                volumeButton: row.querySelector('.volume-button-mc'),
                volumeButtonIcon: row.querySelector('.volume-button-icon-mc'),
                statusCell: row.querySelector('.saved-tab-row-status-cell')
            };

            const gridElements = {
                link: gridCol.querySelector('.open-the-link'),
                pinTabButton: gridCol.querySelector('.pin-button-mc'),
                starTabButton: gridCol.querySelector('.star-button-mc'),
                closeTabButton: gridCol.querySelector('.close-tab-button-mc'),
                deleteTabButton: gridCol.querySelector('.delete-tab-button-mc'),
                tabTitleLink: gridCol.querySelector('.tab-link'),
                saveTabButton: gridCol.querySelector('.save-button-mc'),
                volumeButton: gridCol.querySelector('.volume-button-mc'),
                volumeButtonIcon: gridCol.querySelector('.volume-button-icon-mc'),
                statusCell: gridCol.querySelector('.tab-card-status')
            };

            // Combine both sets of elements for unified event handling
            const allElements = [tableElements, gridElements];

            const linkHandleClick = async (event) => {
                event.preventDefault();
                try {
                    if (isOpen) {
                        function getTab(tabId) {
                            return new Promise((resolve, reject) => {
                              chrome.tabs.get(tabId, (tab) => {
                                if (chrome.runtime.lastError) {
                                  return reject(chrome.runtime.lastError);
                                }
                                resolve(tab);
                              });
                            });
                          }

                        const _tab = await getTab(tab.tabId);

                        await focusTabById(tab.tabId, _tab.windowId); // Focus the tab if it's open
                    } else {
                        const currentWindow = await chrome.windows.getCurrent(); // Get current window ID
                        const newTab = await openTabInNewWindow(tab.url, tab.pinned); // Open in a new tab if it's not open
                        if (type === 'session') {
                            const newDataForTab = {
                                ...tab,
                                id: newTab.id,
                                windowId: currentWindow.id
                            };

                            session.tabs = session.tabs.map(t => t.id === tab.id ? newDataForTab : t);

                            await updateSessionData(session.id, {
                                tabs: session.tabs
                            });
                        } else if (type === 'group') {
                            const newDataForTab = {
                                ...tab,
                                tabId: newTab.id,
                                windowId: currentWindow.id
                            };

                            group.tabs = group.tabs.map(t => t.tabId === tab.tabId ? newDataForTab : t);

                            await updateGroupData(group.id, {
                                tabs: group.tabs
                            });
                        }

                        // TODO Always update groups & sessions

                        await updateTab(tab.tabId, newTab.id, { windowId: currentWindow.id }); // Update current tab with new tab id

                        tab.tabId = newTab.id;
                        tab.windowId = currentWindow.id;

                        // Update UI for both table and grid
                        allElements.forEach(elements => {
                            if (elements.link) {
                                elements.link.classList.add("btn-soft-primary");
                                elements.link.classList.remove("btn-soft-secondary");

                                const linkInnerElement = elements.link.children[0];
                                if (linkInnerElement) {
                                    linkInnerElement.className = "las la-eye";
                                }
                            }

                            if (elements.closeTabButton) {
                                elements.closeTabButton.classList.add("btn-soft-danger");
                                elements.closeTabButton.classList.add("btn-border");
                                elements.closeTabButton.disabled = false;
                            }

                            if (elements.statusCell) {
                                elements.statusCell.innerHTML = 'Active';
                                if (elements.statusCell.classList.contains('tab-card-status')) {
                                    elements.statusCell.classList.remove('inactive');
                                    elements.statusCell.classList.add('active');
                                }
                            }
                        });

                        isOpen = true;

                        // Reattach event listeners
                        allElements.forEach(elements => {
                            if (elements.link) {
                                elements.link.removeEventListener('click', linkHandleClick);
                                elements.link.addEventListener('click', linkHandleClick);
                            }
                            if (elements.tabTitleLink) {
                                elements.tabTitleLink.removeEventListener('click', linkHandleClick);
                                elements.tabTitleLink.addEventListener('click', linkHandleClick);
                            }
                        });
                    }
                } catch (error) {
                    console.error('Error handling tab action:', error);
                }
            }

            // Add event listeners to both table and grid elements
            allElements.forEach(elements => {
                if (elements.link) {
                    elements.link.addEventListener('click', linkHandleClick);
                }
                if (elements.tabTitleLink) {
                    elements.tabTitleLink.addEventListener('click', linkHandleClick);
                }
            });

            // Add click event for the close tab button
            allElements.forEach(elements => {
                if (elements.closeTabButton) {
                    elements.closeTabButton.addEventListener('click', async (event) => {
                        event.preventDefault();
                        try {
                            // Update UI and refresh the event listener
                            const updateUIAfterClose = () => {
                                allElements.forEach(elements => {
                                    if (elements.link) {
                                        elements.link.classList.remove("btn-soft-primary");
                                        elements.link.classList.add("btn-soft-secondary");

                                        const linkInnerElement = elements.link.children[0];
                                        if (linkInnerElement) {
                                            linkInnerElement.className = "ri-external-link-fill";
                                        }
                                    }

                                    if (elements.closeTabButton) {
                                        elements.closeTabButton.classList.remove("btn-soft-danger");
                                        elements.closeTabButton.classList.remove("btn-border");
                                        elements.closeTabButton.disabled = true;
                                    }

                                    if (elements.statusCell) {
                                        elements.statusCell.innerHTML = 'Inactive';
                                        if (elements.statusCell.classList.contains('tab-card-status')) {
                                            elements.statusCell.classList.remove('active');
                                            elements.statusCell.classList.add('inactive');
                                        }
                                    }

                                    if (elements.link) {
                                        elements.link.removeEventListener('click', linkHandleClick);
                                        elements.link.addEventListener('click', linkHandleClick);
                                    }
                                    if (elements.tabTitleLink) {
                                        elements.tabTitleLink.removeEventListener('click', linkHandleClick);
                                        elements.tabTitleLink.addEventListener('click', linkHandleClick);
                                    }
                                });

                                isOpen = false;
                            }

                            const { confirmClose } = await getChromeStorage(['confirmClose']);

                            if (!!confirmClose) {
                                const res = await Swal.fire({
                                    title: 'Are you sure?',
                                    text: "Do you want to close this tab?",
                                    icon: 'warning',
                                    showCancelButton: true,
                                    confirmButtonColor: '#3085d6',
                                    cancelButtonColor: '#d33',
                                    confirmButtonText: 'Yes, close it!'
                                });

                                if (res.isConfirmed) {
                                    await closeTab(tab.tabId);
                                    updateUIAfterClose();
                                    await updateTab(tab.tabId, tab.tabId);
                                }
                            } else {
                                await closeTab(tab.tabId);
                                updateUIAfterClose();
                                await updateTab(tab.tabId, tab.tabId);
                            }
                        } catch (error) {
                            console.error('Error handling tab action:', error);
                        }
                    });
                }
            });

            // Add click event for the delete tab button (same as unsave button)
            const handleRemoveTab = async () => {

                if (type === 'session') {
                    session.tabs = session.tabs.filter(t => t.id !== tab.tabId);
                    await updateSessionData(session.id, { tabs: session.tabs });
                    const restoreButton = metadataTable.querySelector('.restore-session-button');
                    restoreButton.disabled = !session.tabs.length;
                } else if (type === 'group') {
                    group.tabs = group.tabs.filter(t => t.tabId !== tab.tabId);
                    await updateGroupData(group.id, { tabs: group.tabs });
                } else {
                    removeTabFromStrorage(tab.tabId);
                }

                row.remove();
                gridCol.remove();

                // Update numbering for table rows
                const rows = document.querySelectorAll(`#${tableBodyId} tr`);
                rows.forEach((row, index) => {
                    const firstChild = row.children[0];
                    if (firstChild) firstChild.innerHTML = index + 1;
                });

                // Update numbering for grid cards
                const gridCards = document.querySelectorAll('#file-grid .tab-card-number');
                gridCards.forEach((numberElement, index) => {
                    numberElement.innerHTML = index + 1;
                });

                if (!tableBody.children.length && !fileGrid.children.length) {
                    noDataMessage.classList.remove("d-none");
                    mainTableWrapper?.classList.add("d-none");
                    document.getElementById('main-grid-wrapper')?.classList.add("d-none");
                }
            }

            allElements.forEach(elements => {
                if (elements.deleteTabButton) {
                    elements.deleteTabButton.addEventListener('click', () => {
                        handleRemoveTab();
                    });
                }
            });


            // Save tab button handlers
            allElements.forEach(elements => {
                if (elements.saveTabButton) {
                    elements.saveTabButton.addEventListener('click', async () => {

                if (type === 'session') {
                    const newDataForTab = {
                        ...tab,
                        saved: !saved,
                        ...(saved && { starred: false })
                    };

                    session.tabs = session.tabs.map(t => t.id === tab.tabId ? newDataForTab : t);

                    await updateSessionData(session.id, { tabs: session.tabs });
                    saved = !saved;

                    if (saved) {
                            // Formatting session tab to match saved tab
                            const dataToSave = { ...tab, tabId: tab.id, date: new Date().toLocaleString() };
                            delete dataToSave.discarded;
                            delete dataToSave.lastAccessed;
                            delete dataToSave.id;

                            await saveTab(dataToSave);

                            // Update all save buttons
                            allElements.forEach(elements => {
                                if (elements.saveTabButton) {
                                    elements.saveTabButton.classList.add('btn-success');
                                    elements.saveTabButton.classList.remove('btn-ghost-success');
                                }
                            });
                        } else {
                            removeTabFromStrorage(tab.tabId);
                            allElements.forEach(elements => {
                                if (elements.saveTabButton) {
                                    elements.saveTabButton.classList.remove('btn-success');
                                    elements.saveTabButton.classList.add('btn-ghost-success');
                                }
                                if (elements.starTabButton) {
                                    elements.starTabButton.classList.remove('btn-danger');
                                    elements.starTabButton.classList.add('btn-ghost-danger');
                                }
                            });
                            pawed = false;
                        }

                    } else if (type === 'group') {
                        const newDataForTab = {
                            ...tab,
                            saved: !saved,
                            ...(saved && { starred: false })
                        };

                        group.tabs = group.tabs.map(t => t.tabId === tab.tabId ? newDataForTab : t);

                        await updateGroupData(group.id, { tabs: group.tabs });
                        saved = !saved;

                        if (saved) {
                            // Formatting group tab to match saved tab
                            const dataToSave = { ...tab, date: new Date().toLocaleString() };
                            delete dataToSave.discarded;
                            delete dataToSave.lastAccessed;

                            await saveTab(dataToSave);
                            allElements.forEach(elements => {
                                if (elements.saveTabButton) {
                                    elements.saveTabButton.classList.add('btn-success');
                                    elements.saveTabButton.classList.remove('btn-ghost-success');
                                }
                            });
                        } else {
                            removeTabFromStrorage(tab.tabId);
                            allElements.forEach(elements => {
                                if (elements.saveTabButton) {
                                    elements.saveTabButton.classList.remove('btn-success');
                                    elements.saveTabButton.classList.add('btn-ghost-success');
                                }
                                if (elements.starTabButton) {
                                    elements.starTabButton.classList.remove('btn-danger');
                                    elements.starTabButton.classList.add('btn-ghost-danger');
                                }
                            });
                            pawed = false;
                        }

                    } else {
                        handleRemoveTab();
                    }
                    });
                }
            });

            // Add click event for pin button
            allElements.forEach(elements => {
                if (elements.pinTabButton) {
                    elements.pinTabButton.addEventListener('click', async () => {
                        togglePin(tab);

                        if (type === 'session') {
                            const newDataForTab = {
                                ...tab,
                                pinned: !tab.pinned
                            };

                            session.tabs = session.tabs.map(t => t.id === tab.tabId ? newDataForTab : t);

                            await updateSessionData(session.id, { tabs: session.tabs });
                        } else if (type === 'group') {
                            const newDataForTab = {
                                ...tab,
                                pinned: !tab.pinned
                            };

                            group.tabs = group.tabs.map(t => t.tabId === tab.tabId ? newDataForTab : t);

                            await updateGroupData(group.id, { tabs: group.tabs });
                        }

                        tab.pinned = !tab.pinned;
                        pinned = !pinned;

                        // Update all pin buttons
                        allElements.forEach(elements => {
                            if (elements.pinTabButton) {
                                if (pinned) {
                                    elements.pinTabButton.classList.remove('btn-ghost-secondary');
                                    elements.pinTabButton.classList.add('btn-secondary');
                                } else {
                                    elements.pinTabButton.classList.remove('btn-secondary');
                                    elements.pinTabButton.classList.add('btn-ghost-secondary');
                                }
                            }
                        });

                        // Remove the row from pinned list if active
                        if (type === 'pinned') {
                            row.remove();
                            gridCol.remove();
                        }
                    });
                }
            });

             // Add click event for volume button
             allElements.forEach(elements => {
                if (elements.volumeButton) {
                    elements.volumeButton.addEventListener('click', async () => {
                        toggleVolume(tab);

                        if (type === 'session') {
                            const newDataForTab = {
                                ...tab,
                                muted: !muted
                            };

                            session.tabs = session.tabs.map(t => t.id === tab.tabId ? newDataForTab : t);

                            await updateSessionData(session.id, { tabs: session.tabs });
                        } else if (type === 'group') {
                            const newDataForTab = {
                                ...tab,
                                muted: !muted
                            };

                            group.tabs = group.tabs.map(t => t.tabId === tab.tabId ? newDataForTab : t);

                            await updateGroupData(group.id, { tabs: group.tabs });
                        }

                        tab.muted = !tab.muted;
                        muted = !muted;

                        // Update all volume buttons
                        allElements.forEach(elements => {
                            if (elements.volumeButton && elements.volumeButtonIcon) {
                                elements.volumeButton.classList.remove('btn-ghost-light');

                                if (muted) {
                                    elements.volumeButton.classList.remove('btn-ghost-light');
                                    elements.volumeButton.classList.add('btn-outline-danger');
                                    elements.volumeButton.classList.remove('btn-primary');

                                    elements.volumeButtonIcon.classList.remove("bx-volume");
                                    elements.volumeButtonIcon.classList.add("bx-volume-mute");
                                } else {
                                    elements.volumeButton.classList.add('btn-primary');
                                    elements.volumeButton.classList.remove('btn-outline-danger');

                                    elements.volumeButtonIcon.classList.remove("bx-volume");
                                    elements.volumeButtonIcon.classList.remove("bx-volume-mute");
                                    elements.volumeButtonIcon.classList.add("bx-volume-full");
                                }
                            }
                        });
                    });
                }
            });

            // Add click event for paw/start button
            allElements.forEach(elements => {
                if (elements.starTabButton) {
                    elements.starTabButton.addEventListener('click', async () => {
                        toggleStar(tab);

                        if (type === 'session') {
                            const newDataForTab = {
                                ...tab,
                                ...(!pawed && { saved: true }),
                                starred: !pawed
                            };

                            session.tabs = session.tabs.map(t => t.id === tab.tabId ? newDataForTab : t);

                            await updateSessionData(session.id, { tabs: session.tabs });
                        } else if (type === 'group') {
                            const newDataForTab = {
                                ...tab,
                                ...(!pawed && { saved: true }),
                                starred: !pawed
                            };

                            group.tabs = group.tabs.map(t => t.tabId === tab.tabId ? newDataForTab : t);

                            await updateGroupData(group.id, { tabs: group.tabs });
                        }

                        pawed = !pawed;

                        if (pawed) {
                            // Update all star buttons
                            allElements.forEach(elements => {
                                if (elements.starTabButton) {
                                    elements.starTabButton.classList.remove('btn-ghost-danger');
                                    elements.starTabButton.classList.add('btn-danger');
                                }
                                if (elements.saveTabButton) {
                                    elements.saveTabButton.classList.add('btn-success');
                                    elements.saveTabButton.classList.remove('btn-ghost-success');
                                }
                            });

                            // Formatting session tab to match saved tab
                            const dataToSave = { ...tab, tabId: tab.tabId, date: new Date().toLocaleString(), starred: true };
                            delete dataToSave.discarded;
                            delete dataToSave.lastAccessed;
                            delete dataToSave.id;

                            await saveTab(dataToSave);
                            saved = true;
                        } else {
                            allElements.forEach(elements => {
                                if (elements.starTabButton) {
                                    elements.starTabButton.classList.remove('btn-danger');
                                    elements.starTabButton.classList.add('btn-ghost-danger');
                                }
                            });
                        }

                        // Remove the row from pawed list if active
                        if (type === 'pawed') {
                            row.remove();
                            gridCol.remove();
                        }
                    });
                }
            });
        });

        // Apply the current view state after rendering all tabs
        setTimeout(() => {
            switchView(currentViewState);
        }, 0);
    } catch (error) {
        console.error('Error rendering windows:', error);
    }
};

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