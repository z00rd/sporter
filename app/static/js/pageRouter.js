// Sporter - Page Router System

class PageRouter extends Component {
    constructor() {
        // Skip auto-init to ensure properties are set up first
        super('page-router', true);
        
        // Initialize properties AFTER calling super()
        this.pages = {};
        this.currentPageId = 'activities';
        this.currentPageComponent = null;
        
        // Now manually call init with properties properly set
        this.init();
    }

    init() {
        // Set up element first
        this.element = document.getElementById(this.elementId);
        if (!this.element) {
            console.warn(`PageRouter element not found`);
            return;
        }
        
        this.render();
        
        // Listen for navigation events
        this.subscribe(Events.PAGE_CHANGED, (data) => {
            this.showPage(data.to);
        });
        
        // Don't show initial page yet - wait for pages to be registered
        // This will be called from the main initialization after registerPage calls
    }

    registerPage(pageId, pageComponent) {
        this.pages[pageId] = pageComponent;
    }

    showInitialPage() {
        // Show the default page after all pages are registered
        this.showPage(this.currentPageId);
    }

    showPage(pageId) {
        if (!this.pages[pageId]) {
            console.warn(`Page ${pageId} not registered`);
            return;
        }

        // Hide current page
        if (this.currentPageComponent) {
            this.currentPageComponent.hide();
        }

        // Show new page
        const pageComponent = this.pages[pageId];
        pageComponent.show();
        
        this.currentPageId = pageId;
        this.currentPageComponent = pageComponent;
    }

    updatePageVisibility(activePageId) {
        // Hide all pages
        Object.keys(this.pages).forEach(pageId => {
            const pageElement = document.getElementById(`page-${pageId}`);
            if (pageElement) {
                pageElement.style.display = 'none';
            }
        });
        
        // Show active page
        const activePageElement = document.getElementById(`page-${activePageId}`);
        if (activePageElement) {
            activePageElement.style.display = 'block';
        }
    }

    render() {
        // The router doesn't render its own content,
        // it just manages the visibility of page containers that are appended to it
        // Don't call setContent() as it would destroy any child page elements
        console.log('PageRouter render() called - not replacing content to preserve page elements');
    }

    getCurrentPage() {
        return this.currentPageId;
    }
}

// Abstract Page Component
class Page extends Component {
    constructor(pageId) {
        // Skip auto-init to let subclasses set up properties first
        super(`page-${pageId}`, true);
        this.pageId = pageId;
        this.isVisible = false;
        
        // Don't call init here - let subclasses do it after their setup
    }

    show() {
        this.isVisible = true;
        if (this.element) {
            this.element.style.display = 'block';
        }
        this.onShow();
    }

    hide() {
        this.isVisible = false;
        if (this.element) {
            this.element.style.display = 'none';
        }
        this.onHide();
    }

    // Override these in child classes
    onShow() {}
    onHide() {}

    // Override Component's init to handle dynamic element creation
    init() {
        // Don't try to find existing element - we'll create it in render()
        console.log(`Page ${this.pageId} init() called`);
        this.render();
    }

    render() {
        console.log(`Page ${this.pageId} render() called, element exists:`, !!this.element);
        
        // Create page container if it doesn't exist
        if (!this.element) {
            const container = document.createElement('div');
            container.id = `page-${this.pageId}`;
            container.className = `page page-${this.pageId}`;
            container.style.display = this.isVisible ? 'block' : 'none';
            
            // Find page router container
            const router = document.getElementById('page-router');
            if (router) {
                router.appendChild(container);
                this.element = container;
                console.log(`Page ${this.pageId} appended to router. Router children:`, router.children.length);
                
                // Styling will be handled by CSS
                // container.style.border = '2px solid red';
                // container.style.background = 'yellow';
                // container.style.padding = '10px';
                // container.style.margin = '5px';
            } else {
                console.error('Page router container not found');
                return;
            }
        }

        this.renderContent();
    }

    renderContent() {
        // Override in child classes
        this.setContent(`<div>Page ${this.pageId} content</div>`);
    }
}

// Global instance - will be created from index.html
let pageRouter;