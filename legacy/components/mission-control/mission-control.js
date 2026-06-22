import { 
    setupSavedNavigationItemClickListener, 
    setupPawedNavigationItemClickListener, 
    setupPinnedNavigationItemClickListener,
    setupSessionsNavigationItemClickListener,
    setupGroupsNavigationItemClickListener,
    setupWindowsNavigationItemClickListener,
    setupBackupsNavigationItemClickListener,
    setupSearchInputListener,
    setupOpenCreateGroupModalClickListener,
    setupSaveGroupsCreateListener,
    applyDarkModeSetting,
    setupDarkModeToggle,
    setupSettingsModal,
    setupViewToggle
} from "./js/mission-control-event.js";

// Function to check if right sidebar is visible and update border radius
function updateContentBorderRadius() {
    const contentArea = document.querySelector('.file-manager-content');
    const rightSidebar = document.querySelector('.w-20');

    if (contentArea && rightSidebar) {
        const isRightSidebarVisible = rightSidebar.style.display !== 'none' && 
                                     !rightSidebar.classList.contains('d-none') &&
                                     getComputedStyle(rightSidebar).display !== 'none';

        if (isRightSidebarVisible) {
            contentArea.classList.add('has-right-sidebar');
        } else {
            contentArea.classList.remove('has-right-sidebar');
        }
    }
}

// Observer to watch for changes in the right sidebar visibility
function setupRightSidebarObserver() {
    const rightSidebar = document.querySelector('.w-20');
    if (rightSidebar) {
        const observer = new MutationObserver(updateContentBorderRadius);
        observer.observe(rightSidebar, { 
            attributes: true, 
            attributeFilter: ['style', 'class'] 
        });

        // Initial check
        updateContentBorderRadius();
    }
}



document.addEventListener("DOMContentLoaded", async () => {
    // Apply dark mode theme
    await applyDarkModeSetting();

    // Setup dark mode toggle
    setupDarkModeToggle();

    // Apply saved dark mode setting
    applyDarkModeSetting();

    // Setup settings modal
    setupSettingsModal();

    // Setup view toggle
    setupViewToggle();

    // Setup sessions navigation item handler
    setupSessionsNavigationItemClickListener("sessions-navigation-item", "session-list");

     // Setup groups navigation item handler
     setupGroupsNavigationItemClickListener("groups-navigation-item", "group-list");

    // Setup windows navigation item handler
    setupWindowsNavigationItemClickListener("windows-navigation-item");

    // Setup windows navigation item handler
    setupBackupsNavigationItemClickListener("backups-navigation-item");

    // Setup saved navigation item handler
    setupSavedNavigationItemClickListener("saved-navigation-item");

    // Setup pawed navigation item handler
    setupPawedNavigationItemClickListener("pawed-navigation-item");

    // Setup pinned navigation item handler
    setupPinnedNavigationItemClickListener("pinned-navigation-item");

    // Setup search input handler
    setupSearchInputListener("sidebar-search-input");

    // Setup open create group modal
    setupOpenCreateGroupModalClickListener('add-new-group');

    // Setup save groups handler
    setupSaveGroupsCreateListener();

    // Setup right sidebar observer for border radius
    setupRightSidebarObserver();

    // Theme toggle functionality
    const themeToggleIcon = document.getElementById('theme-toggle-icon');
    const themeToggleIconDark = document.getElementById('theme-toggle-icon-dark');

    if (themeToggleIcon && themeToggleIconDark) {
        const toggleTheme = () => {
            const currentTheme = document.documentElement.getAttribute('data-bs-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

            document.documentElement.setAttribute('data-bs-theme', newTheme);

            // Save theme preference
            chrome.storage.local.set({ theme: newTheme });

            // Update icon visibility
            if (newTheme === 'dark') {
                themeToggleIcon.classList.add('d-none');
                themeToggleIconDark.classList.remove('d-none');
            } else {
                themeToggleIcon.classList.remove('d-none');
                themeToggleIconDark.classList.add('d-none');
            }
        };

        themeToggleIcon.addEventListener('click', toggleTheme);
        themeToggleIconDark.addEventListener('click', toggleTheme);
    }

    // FAQ toggle functionality
    document.addEventListener('click', function(e) {
        if (e.target.closest('.faq-question')) {
            const faqItem = e.target.closest('.faq-item');
            const isActive = faqItem.classList.contains('active');

            // Close all other FAQ items
            document.querySelectorAll('.faq-item.active').forEach(item => {
                item.classList.remove('active');
            });

            // Toggle current FAQ item
            if (!isActive) {
                faqItem.classList.add('active');
            }
        }
    });

    // Contact support functionality
    document.addEventListener('click', function(e) {
        if (e.target.closest('#contactSupportBtn')) {
            const subject = encodeURIComponent('PawTabs Support Request');
            const body = encodeURIComponent('Hello PawTabs Team,\n\nI need help with:\n\n[Please describe your issue or question here]\n\nThank you!');
            const mailtoLink = `mailto:support@pawtabs.com?subject=${subject}&body=${body}`;

            window.open(mailtoLink, '_blank');
        }
    });
});