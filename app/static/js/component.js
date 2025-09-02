// Sporter - Base Component Class

class Component {
    constructor(elementId) {
        this.elementId = elementId;
        this.element = null;
        this.isDestroyed = false;
        this.eventUnsubscribers = [];
        
        this.init();
    }

    init() {
        this.element = document.getElementById(this.elementId);
        if (!this.element) {
            console.warn(`Element with id "${this.elementId}" not found`);
            return;
        }
        
        this.setupEventListeners();
        this.render();
    }

    setupEventListeners() {
        // Override in subclasses
    }

    render() {
        // Override in subclasses
    }

    // Safe DOM manipulation methods
    setContent(content) {
        if (this.element && !this.isDestroyed) {
            this.element.innerHTML = content;
        }
    }

    setText(text) {
        if (this.element && !this.isDestroyed) {
            this.element.textContent = text;
        }
    }

    addClass(className) {
        if (this.element && !this.isDestroyed) {
            this.element.classList.add(className);
        }
    }

    removeClass(className) {
        if (this.element && !this.isDestroyed) {
            this.element.classList.remove(className);
        }
    }

    show() {
        if (this.element && !this.isDestroyed) {
            this.element.style.display = 'block';
        }
    }

    hide() {
        if (this.element && !this.isDestroyed) {
            this.element.style.display = 'none';
        }
    }

    // Event system integration
    subscribe(event, callback) {
        const unsubscribe = eventBus.on(event, callback);
        this.eventUnsubscribers.push(unsubscribe);
        return unsubscribe;
    }

    emit(event, data) {
        eventBus.emit(event, data);
    }

    // Error handling
    handleError(error, context = '') {
        console.error(`Error in ${this.constructor.name}${context}:`, error);
        
        let message = 'An unexpected error occurred';
        
        if (error instanceof ApiError) {
            if (error.isNetworkError()) {
                message = 'Network connection failed. Please check your internet connection.';
            } else if (error.isTimeout()) {
                message = 'Request timed out. Please try again.';
            } else if (error.isServerError()) {
                message = 'Server error occurred. Please try again later.';
            } else {
                message = error.message;
            }
        } else {
            message = error.message || message;
        }
        
        this.emit(Events.ERROR_OCCURRED, { message, error, component: this.constructor.name });
    }

    // Loading state management
    showLoading(message = 'Loading...') {
        this.emit(Events.LOADING_START, { component: this.constructor.name, message });
    }

    hideLoading() {
        this.emit(Events.LOADING_END, { component: this.constructor.name });
    }

    // Cleanup
    destroy() {
        this.isDestroyed = true;
        
        // Unsubscribe from all events
        this.eventUnsubscribers.forEach(unsubscribe => unsubscribe());
        this.eventUnsubscribers = [];
        
        // Clear element reference
        this.element = null;
    }

    // Utility methods
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
}