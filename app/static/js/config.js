// Sporter - Configuration Management

const Config = {
    // API Configuration
    API_BASE_URL: '/api/v1',
    API_TIMEOUT: 30000, // 30 seconds
    
    // UI Configuration
    DEFAULT_PAGE: 'activities',
    
    // Activity Types
    ACTIVITY_TYPES: [
        { value: 'running', label: '🏃‍♂️ Running', icon: '🏃‍♂️' },
        { value: 'cycling', label: '🚴‍♂️ Cycling', icon: '🚴‍♂️' },
        { value: 'swimming', label: '🏊‍♂️ Swimming', icon: '🏊‍♂️' },
        { value: 'walking', label: '🚶‍♂️ Walking', icon: '🚶‍♂️' },
        { value: 'hiking', label: '🥾 Hiking', icon: '🥾' },
        { value: 'skiing', label: '⛷️ Skiing', icon: '⛷️' },
        { value: 'paddling', label: '🚣‍♂️ Paddling', icon: '🚣‍♂️' }
    ],
    
    // Navigation Pages
    NAVIGATION_PAGES: [
        { id: 'activities', label: 'Activities', icon: '📊' },
        { id: 'analytics', label: 'Analytics', icon: '📈' },
        { id: 'users', label: 'Users', icon: '👥' },
        { id: 'settings', label: 'Settings', icon: '⚙️' }
    ],
    
    // Heart Rate Configuration
    HR_ZONES: {
        RECOVERY: { name: 'Recovery', percentage: 0.6, color: '#6c757d' },
        AEROBIC: { name: 'Aerobic', percentage: 0.7, color: '#28a745' },
        TEMPO: { name: 'Tempo', percentage: 0.8, color: '#ffc107' },
        THRESHOLD: { name: 'Threshold', percentage: 0.9, color: '#fd7e14' },
        VO2MAX: { name: 'VO2 Max', percentage: 1.0, color: '#dc3545' }
    },
    
    // Validation Limits
    VALIDATION: {
        HR_MAX: { min: 120, max: 220 },
        HR_RESTING: { min: 30, max: 100 },
        AGE: { min: 10, max: 120 },
        BIRTH_YEAR: { min: 1900, max: 2020 },
        NAME_LENGTH: { min: 1, max: 100 },
        EMAIL_LENGTH: { max: 255 }
    },
    
    // Date/Time Formatting
    DATE_FORMAT: 'en-GB',
    
    // Development flags
    DEBUG: false
};

// Helper functions for configuration access
Config.getActivityIcon = function(activityType) {
    const activity = this.ACTIVITY_TYPES.find(a => a.value === activityType);
    return activity ? activity.icon : '🏃‍♂️';
};

Config.getActivityLabel = function(activityType) {
    const activity = this.ACTIVITY_TYPES.find(a => a.value === activityType);
    return activity ? activity.label : 'Running';
};

Config.calculateHRZones = function(hrMax, hrResting = 60) {
    const hrReserve = hrMax - hrResting;
    const zones = {};
    
    let previousMax = hrResting;
    for (const [key, config] of Object.entries(this.HR_ZONES)) {
        const max = key === 'VO2MAX' ? hrMax : Math.round(hrResting + (hrReserve * config.percentage));
        zones[key.toLowerCase()] = {
            name: config.name,
            min: previousMax,
            max: max,
            color: config.color
        };
        previousMax = max;
    }
    
    return zones;
};