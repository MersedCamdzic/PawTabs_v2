export function closeModal(modalId) {
    const modalElement = document.getElementById(modalId);

    if (!modalElement) {
        console.error(`Modal with ID "${modalId}" not found.`);
        return;
    }

    // Set aria-hidden to hide it from accessibility tools
    modalElement.setAttribute('aria-hidden', 'true');
    modalElement.style.display = 'none'; // Hide the modal
    modalElement.removeAttribute('aria-modal');
}

export function openModal(modalId, setupCallback = null) {
    const modalElement = document.getElementById(modalId);

    if (!modalElement) {
        console.error(`Modal with ID "${modalId}" not found.`);
        return;
    }

    // Remove aria-hidden to make the modal accessible
    modalElement.removeAttribute('aria-hidden');
    modalElement.style.display = 'block'; // Show the modal
    modalElement.setAttribute('aria-modal', 'true');
    modalElement.focus(); // Focus the modal for accessibility

    // Optionally execute setup logic (e.g., setting context)
    if (setupCallback && typeof setupCallback === 'function') {
        setupCallback(modalElement);
    }
}

