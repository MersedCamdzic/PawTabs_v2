export const BADGE_COLOR_CLASSES = Object.freeze([
    'bg-primary-subtle text-primary',
    'bg-secondary-subtle text-secondary',
    'bg-success-subtle text-success',
    'bg-info-subtle text-info',
    'bg-warning-subtle text-warning',
    'bg-danger-subtle text-danger',
    'bg-dark-subtle text-body',
    'bg-light-subtle text-body'
]);

export class LocalStorageHelper {
    static getItem(key, defaultValue) {
        const storedValue = localStorage.getItem(key);
        return storedValue !== null ? JSON.parse(storedValue) : defaultValue;
    }

    static setItem(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    }
}

export const ButtonClasses = Object.freeze({
    SAVE: {ACTIVE: 'btn-success', INACTIVE: 'btn-ghost-success'},
    STAR: {ACTIVE: 'btn-danger', INACTIVE: 'btn-ghost-danger'},
    PIN: {ACTIVE: 'btn-secondary', INACTIVE: 'btn-ghost-secondary'},
    VOLUME: {
        NOT_AUDIBLE: 'btn-ghost-light',
        NOT_AUDIBLE_ICON: 'bx bx-volume',
        AUDIBLE_MUTED: 'btn-outline-danger',
        AUDIBLE_MUTED_ICON: 'bx bx-volume-mute',
        AUDIBLE_NOT_MUTED: 'btn-primary',
        AUDIBLE_NOT_MUTED_ICON: 'bx bx-volume-full',
    },
    NOTE: {ACTIVE: 'btn-outline-warning', INACTIVE: 'btn-ghost-warning'},
    TAG: {ACTIVE: 'btn-outline-secondary', INACTIVE: 'btn-ghost-secondary'},
    TABGROUP: {ACTIVE: 'btn-outline-dark', INACTIVE: 'btn-ghost-dark'},
    SETTINGS: {ACTIVE: 'btn-dark', INACTIVE: 'btn-ghost-dark'},
    TAB_SETTINGS: {ACTIVE: 'btn-soft-success'},
    CLOSE: {ACTIVE: 'btn-soft-danger', INACTIVE: 'btn-ghost-soft-danger'},
    SMALL: 'btn-sm',
});

export const DefaultUrls = Object.freeze({
    IMAGES: {NO_IMAGE: '../../assets/images/noimage.png'}
});

export const DarkModeSettings = Object.freeze({
    ENABLED: LocalStorageHelper.getItem('darkModeEnabled', false)
});

export const TopVisitedSettings = Object.freeze({
    SHOW_TOP_VISITED: LocalStorageHelper.getItem('showTopVisited', true),
    NUMBER_OF_TOP_VISITED_SITES: LocalStorageHelper.getItem('numberOfTopVisitedSites', 15)
});

export const StarredAndPinnedSettings = Object.freeze({
    SHOW_STARRED_AND_PINNED: LocalStorageHelper.getItem('showStarredAndPinned', true),
    NUMBER_OF_STARRED_AND_PINNED: LocalStorageHelper.getItem('numberOfStarredAndPinned', 5)
});

export const RecentlyClosedSettings = Object.freeze({
    SHOW_RECENTLY_CLOSED_TABS: LocalStorageHelper.getItem('showRecentlyClosedTabs', true),
    NUMBER_OF_RECENTLY_CLOSED_TABS: LocalStorageHelper.getItem('numberOfRecentlyClosedTabs', 5)
});

export const ConfirmCloseSettings = Object.freeze({
    ENABLED: LocalStorageHelper.getItem('confirmClose', false)
});