// Sporter - Utility Functions

// Activity type utilities
function getActivityIcon(activityType) {
    return Config.getActivityIcon(activityType);
}

function getActivityTypeLabel(activityType) {
    return Config.getActivityLabel(activityType);
}

// Date formatting
function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString(Config.DATE_FORMAT);
}

function formatTime(dateString) {
    return new Date(dateString).toLocaleTimeString();
}

// Time formatting
function formatDuration(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
}

// Pace calculation
function calculatePace(durationSeconds, distanceKm) {
    return durationSeconds / 60 / distanceKm;
}

// Deprecated API utilities - use api.js ApiClient instead
// These are kept for backward compatibility but should be replaced
async function apiGet(endpoint) {
    console.warn('apiGet() is deprecated. Use api.get() instead.');
    return api.get(endpoint.replace('/api/v1', ''));
}

async function apiPost(endpoint, formData) {
    console.warn('apiPost() is deprecated. Use api.post() instead.');
    return api.post(endpoint.replace('/api/v1', ''), formData);
}

// DOM utilities
function showElement(element) {
    if (element) element.style.display = 'block';
}

function hideElement(element) {
    if (element) element.style.display = 'none';
}

function setElementHTML(elementId, html) {
    const element = document.getElementById(elementId);
    if (element) element.innerHTML = html;
}

function setElementText(elementId, text) {
    const element = document.getElementById(elementId);
    if (element) element.textContent = text;
}

// Component management
function showComponent(tabId, contentId) {
    // Hide all tabs and content
    document.querySelectorAll('.component-tab').forEach(tab => 
        tab.classList.remove('active')
    );
    document.querySelectorAll('.component-content').forEach(content => 
        content.classList.remove('active')
    );
    
    // Show selected tab and content
    const tab = document.getElementById(tabId);
    const content = document.getElementById(contentId);
    
    if (tab) tab.classList.add('active');
    if (content) content.classList.add('active');
}