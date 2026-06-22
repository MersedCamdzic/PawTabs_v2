const HTML_ESCAPE_MAP = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
};

export function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') {
        return '';  // Return an empty string if the input is not a string
    }
    return unsafe.replace(/[&<>"']/g, match => HTML_ESCAPE_MAP[match]);
}

export function getPlaceholderIconUrl(domain, size=128) {
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=${size}`;
}

function extractRootDomain(url) {
    try {
        return new URL(url).hostname.replace(/^www\./, '');
    } catch (error) {
        console.error('Invalid URL:', url);
        return '';
    }
}

export function getRootDomain(url) {
    return extractRootDomain(url);
}

// TODO Remove function if not used
export function loadAndApplySetting(settingKey, elementId, callback) {
    const savedValue = localStorage.getItem(settingKey);
    if (savedValue !== null) {
        callback(savedValue, elementId);
    }
}

export function hashStringToColorIndex(str, colorArrayLength) {
    if (typeof str !== 'string' || typeof colorArrayLength !== 'number') {
        console.error('Invalid input to hashStringToColorIndex. Expected a string and a number.');
        return 0;  // Default to 0 or handle as needed
    }
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash) % colorArrayLength;
}


