import {ButtonClasses} from "../config/config.js";

export function resetButtonClasses(button, classes, type) {
    button.classList.remove(classes.ACTIVE, classes.INACTIVE);
    if (type === 'VOLUME') button.classList.remove(classes.NOT_AUDIBLE, classes.AUDIBLE_MUTED, classes.AUDIBLE_NOT_MUTED);
}

export function isValidButton(button) {
    if (!button || !button.classList) {
        console.error('Invalid button element passed:', button);
        return false;
    }
    return true;
}

export function handleVolumeButtonClass(button, classes, isAudible, isMuted) {
    button.classList.remove(classes.NOT_AUDIBLE, classes.AUDIBLE_MUTED, classes.AUDIBLE_NOT_MUTED);
    updateButtonClass(button, isAudible ? (isMuted ? classes.AUDIBLE_MUTED : classes.AUDIBLE_NOT_MUTED) : classes.NOT_AUDIBLE, isAudible ? (isMuted ? classes.AUDIBLE_MUTED_ICON : classes.AUDIBLE_NOT_MUTED_ICON) : classes.NOT_AUDIBLE_ICON);
}

function updateButtonClass(button, buttonClass, iconClass) {
    button.classList.add(buttonClass);
    const icon = button.querySelector('i');
    if (icon) icon.className = iconClass;
}

export function setButtonClass(button, type, isActive, isSmall = true, isAudible = false, isMuted = true) {
    if (!isValidButton(button)) return;

    if (!type || typeof type !== 'string') {
        return;
    }

    const classes = ButtonClasses[type.toUpperCase()];
    if (!classes) return;

    resetButtonClasses(button, classes, type);
    if (type === 'volume') handleVolumeButtonClass(button, classes, isAudible, isMuted);
    else button.classList.add(isActive ? classes.ACTIVE : classes.INACTIVE);
    button.classList.toggle(ButtonClasses.SMALL, isSmall);
}
