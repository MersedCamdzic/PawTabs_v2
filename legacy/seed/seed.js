

// Helper function to generate a random integer between min and max
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Function to clear all notes from saved tabs
function clearAllNotes() {
    chrome.storage.local.get(['savedPages'], (result) => {
        let savedPages = result.savedPages || {};

        // Clear notes for each tab
        Object.keys(savedPages).forEach(tabId => {
            if (savedPages[tabId].notes) {
                savedPages[tabId].notes = [];
            }
        });

        // Save the updated data back to Chrome storage
        chrome.storage.local.set({ savedPages }, () => {
            console.log('All notes have been cleared from saved tabs.');
        });
    });
}

// Function to clear all tags from saved tabs
function clearAllTags() {
    chrome.storage.local.get(['savedPages'], (result) => {
        let savedPages = result.savedPages || {};

        // Clear tags for each tab
        Object.keys(savedPages).forEach(tabId => {
            if (savedPages[tabId].tags) {
                savedPages[tabId].tags = [];
            }
        });

        // Save the updated data back to Chrome storage
        chrome.storage.local.set({ savedPages }, () => {
            console.log('All tags have been cleared from saved tabs.');
        });
    });
}

// Function to add random notes to all saved tabs
function addNotesToTabs() {
    const sampleNotes = [
        'Check this later.', 'Needs immediate attention.', 'Important for the meeting.',
        'To be shared with the team.', 'Research further.', 'Look for updates next week.',
        'Cross-check with other sources.', 'Contact support about this issue.',
        'Plan for next sprint.', 'Discuss in the next review meeting.', 'Send this to John for review.',
        'Revisit this document.', 'Save for future reference.', 'Evaluate this as part of the next project.',
        'Set a reminder to follow up on this.', 'Look into alternatives.', 'Add this to the presentation.',
        'Might be useful for the training session.', 'Schedule a call with the team.',
        'Test this before implementation.', 'Gather more data on this.', 'Prepare a summary report.',
        'Note any discrepancies found.', 'Keep track of the updates.', 'Analyze further.'
    ];

    chrome.tabs.query({}, (tabs) => {
        chrome.storage.local.get(['savedPages'], (result) => {
            let savedPages = result.savedPages || {};

            tabs.forEach(tab => {
                if (!savedPages[tab.id]) savedPages[tab.id] = { notes: [], tags: [] };

                // Ensure notes is initialized as an array
                if (!Array.isArray(savedPages[tab.id].notes)) {
                    savedPages[tab.id].notes = [];
                }

                // Generate random number of notes (between 2 and 5)
                const notesToAdd = Array.from({ length: getRandomInt(2, 5) }, () => ({
                    note: sampleNotes[getRandomInt(0, sampleNotes.length - 1)],
                    date: new Date().toISOString(),
                }));

                // Add the generated notes to the tab
                savedPages[tab.id].notes.push(...notesToAdd);
            });

            // Save the updated data back to Chrome storage
            chrome.storage.local.set({ savedPages }, () => {
                console.log('Random notes have been added to all open tabs.');
            });
        });
    });
}


// Function to add random tags to all saved tabs
function addTagsToTabs() {
    const sampleTags = [
        'Work', 'Personal', 'Urgent', 'Review', 'Later', 'Important', 'Meeting',
        'Reference', 'Follow-up', 'Quick Task', 'To Do', 'In Progress', 'Completed',
        'Reading', 'Research', 'To Share', 'Archive', 'Shopping', 'Wishlist', 'Priority',
        'Low Priority', 'Medium Priority', 'High Priority', 'Documentation', 'Favorite'
    ];

    chrome.tabs.query({}, (tabs) => {
        chrome.storage.local.get(['savedPages'], (result) => {
            let savedPages = result.savedPages || {};

            tabs.forEach(tab => {
                if (!savedPages[tab.id]) savedPages[tab.id] = { tags: [] };

                // Generate random number of tags (between 5 and 10)
                const tagsToAdd = Array.from(
                    { length: getRandomInt(5, 10) },
                    () => sampleTags[getRandomInt(0, sampleTags.length - 1)]
                );

                savedPages[tab.id].tags = Array.from(new Set([...savedPages[tab.id].tags, ...tagsToAdd])); // Ensure no duplicates
            });

            // Save the updated data back to Chrome storage
            chrome.storage.local.set({ savedPages }, () => {
                console.log('Random tags have been added to all open tabs.');
            });
        });
    });
}

// Function to clear all window sessions
function clearAllWindowSessions() {
    chrome.storage.local.remove('savedSessions', () => {
        if (chrome.runtime.lastError) {
            console.error('Error removing saved sessions:', chrome.runtime.lastError);
        } else {
            console.log('All saved sessions have been successfully deleted.');
        }
    });
}

// Function to add auto-saved window sessions with tabs
function addWindowSessionsWithTabs() {
    const sampleData = generateSampleData(); // Generates sample data sessions with random windows and tabs

    chrome.storage.local.get(['savedSessions'], (result) => {
        let savedSessions = result.savedSessions || [];
        savedSessions = [...sampleData, ...savedSessions].slice(0, 10); // Keep only the latest 10 items

        chrome.storage.local.set({ savedSessions }, () => {
            console.log('New window sessions have been added successfully.');
        });
    });
}

// Main function to generate sample data
function generateSampleData() {
    // Sample real links from popular websites
    const sampleUrls = [
        "https://www.google.com",
        "https://www.youtube.com",
        "https://www.reddit.com",
        "https://www.wikipedia.org",
        "https://www.amazon.com",
        "https://www.twitter.com",
        "https://www.linkedin.com",
        "https://www.facebook.com",
        "https://www.github.com",
        "https://www.medium.com",
        "https://www.netflix.com",
        "https://www.spotify.com",
        "https://www.nytimes.com",
        "https://www.cnn.com",
        "https://www.bbc.com",
        "https://www.theverge.com",
        "https://www.stackoverflow.com",
        "https://www.quora.com",
        "https://www.instagram.com",
        "https://www.twitch.tv"
    ];

    const getRandomUrl = () => sampleUrls[Math.floor(Math.random() * sampleUrls.length)];
    const getRandomBoolean = () => Math.random() < 0.5;
    const getRandomTabsCount = () => getRandomInt(4, 15); // Between 4 and 15 tabs
    const getRandomWindowsCount = () => getRandomInt(5, 7); // Between 5 and 7 windows

    // Function to generate random date within the last 30 days
    const getRandomDate = () => {
        const daysAgo = getRandomInt(0, 30); // Random number between 0 and 30
        const date = new Date();
        date.setDate(date.getDate() - daysAgo);
        return date;
    };

    const sampleData = [];


    // Generate 5 sessions
    for (let i = 0; i < 5; i++) {
        const windows = [];
        const windowsCount = getRandomWindowsCount();

        // Generate each window
        for (let j = 0; j < windowsCount; j++) {
            const tabs = [];
            const tabsCount = getRandomTabsCount();

            // Generate each tab
            for (let k = 0; k < tabsCount; k++) {
                const url = getRandomUrl();
                tabs.push({
                    id: i*j*k,
                    url: url,
                    title: `Title for ${url}`,
                    favIconUrl: `${url}/favicon.ico`,
                    pinned: getRandomBoolean(),
                    muted: getRandomBoolean(),
                    starred: getRandomBoolean(),
                    saved: getRandomBoolean(),
                    windowId: `${i}${j}`,
                    discarded: getRandomBoolean(),
                    index: k, // Position in the window
                    date: new Date().toISOString()
                });
            }

            windows.push({
                id: i*j,
                tabs: tabs,
                windowIndex: j // Index of the window
            });
        }

        const sessionDate = getRandomDate();

        sampleData.push({
            id: i,
            windows: windows,
            date: sessionDate.toISOString(), // Randomly generated date for the session
            totalTabs: windows.reduce((acc, win) => acc + win.tabs.length, 0),
            totalWindows: windowsCount,
            discardedTabs: windows.reduce((acc, win) => acc + win.tabs.filter(tab => tab.discarded).length, 0)
        });
    }

    return sampleData;
}



// Function to generate all seed data
export function generateSeedData() {
    //clearAllNotes(); // Clear all notes from saved tabs
    //clearAllTags(); // Clear all tags from saved tabs
    //clearAllWindowSessions(); // Clear all window sessions

    // Adding random data to all open tabs
    //addNotesToTabs(); // Add random notes to tabs
    //addTagsToTabs(); // Add random tags to tabs

    // Adding sample sessions and auto-saving them
    //addWindowSessionsWithTabs(); // Add new window sessions with random tabs
}
