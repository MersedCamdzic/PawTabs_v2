// mission-control/js/mission-control-state.js

let selectedSession = null;

export function getSelectedSession() {
    return selectedSession;
}

export function setSelectedSession(sessionName) {
    selectedSession = sessionName;
}
