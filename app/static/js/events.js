// Sporter - Event System for Component Communication

class EventEmitter {
    constructor() {
        this.events = {};
    }

    on(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
        
        // Return unsubscribe function
        return () => {
            const index = this.events[event]?.indexOf(callback);
            if (index > -1) {
                this.events[event].splice(index, 1);
            }
        };
    }

    emit(event, data) {
        if (this.events[event]) {
            this.events[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event handler for ${event}:`, error);
                }
            });
        }
    }

    off(event, callback) {
        if (this.events[event]) {
            const index = this.events[event].indexOf(callback);
            if (index > -1) {
                this.events[event].splice(index, 1);
            }
        }
    }

    once(event, callback) {
        const unsubscribe = this.on(event, (data) => {
            callback(data);
            unsubscribe();
        });
        return unsubscribe;
    }
}

// Global event bus for component communication
const eventBus = new EventEmitter();

// Application Events
const Events = {
    // Activity events
    ACTIVITY_SELECTED: 'activity:selected',
    ACTIVITY_UPLOADED: 'activity:uploaded',
    ACTIVITY_DELETED: 'activity:deleted',
    ACTIVITIES_LOADED: 'activities:loaded',
    
    // UI events
    LOADING_START: 'ui:loading:start',
    LOADING_END: 'ui:loading:end',
    ERROR_OCCURRED: 'ui:error:occurred',
    SUCCESS_MESSAGE: 'ui:success:message',
    
    // Component events
    COMPONENT_TAB_CHANGED: 'component:tab:changed',
    
    // User events
    SHOW_USER_SETTINGS: 'user:show:settings',
    USER_PROFILE_LOADED: 'user:profile:loaded',
    USER_PROFILE_UPDATED: 'user:profile:updated'
};