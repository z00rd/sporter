// Sporter - Utility Functions

// Activity type utilities
function getActivityIcon(activityType) {
    const icons = {
        'running': '🏃‍♂️',
        'cycling': '🚴‍♂️', 
        'swimming': '🏊‍♂️',
        'walking': '🚶‍♂️',
        'skiing': '⛷️',
        'paddling': '🚣‍♂️',
        'hiking': '🥾'
    };
    return icons[activityType] || '🏃‍♂️';
}

function getActivityTypeLabel(activityType) {
    const labels = {
        'running': 'Running',
        'cycling': 'Cycling', 
        'swimming': 'Swimming',
        'walking': 'Walking',
        'skiing': 'Skiing',
        'paddling': 'Paddling',
        'hiking': 'Hiking'
    };
    return labels[activityType] || 'Running';
}

// Date formatting
function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-GB');
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

// API utilities
async function apiGet(endpoint) {
    try {
        const response = await fetch(endpoint);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`API GET error for ${endpoint}:`, error);
        throw error;
    }
}

async function apiPost(endpoint, formData) {
    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.detail || `HTTP ${response.status}`);
        }
        
        return data;
    } catch (error) {
        console.error(`API POST error for ${endpoint}:`, error);
        throw error;
    }
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