// Sporter - Navigation Component

class Navigation extends Component {
    constructor() {
        // Skip auto-init to ensure properties are set up first
        super('navigation', true);
        
        // Initialize properties AFTER calling super()
        this.currentPage = 'activities'; // Default page
        this.pages = [
            { id: 'activities', label: 'Activities', icon: '📊' },
            { id: 'analytics', label: 'Analytics', icon: '📈' },
            { id: 'users', label: 'Users', icon: '👥' },
            { id: 'settings', label: 'Settings', icon: '⚙️' }
        ];
        
        // Now manually call init with properties properly set
        this.init();
    }

    init() {
        // First call parent init to set up this.element
        this.element = document.getElementById(this.elementId);
        if (!this.element) {
            console.warn(`Navigation element not found`);
            return;
        }
        
        console.log('Navigation init called, element:', this.element);
        this.render();
        console.log('Navigation rendered');
        this.setupEventListeners();
        console.log('Navigation event listeners setup');
        
        // Check for hash navigation on page load
        this.handleHashChange();
        
        // Listen for hash changes
        window.addEventListener('hashchange', () => {
            this.handleHashChange();
        });
    }

    setupEventListeners() {
        this.element.querySelectorAll('[data-page]').forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const pageId = e.currentTarget.dataset.page;
                this.navigateToPage(pageId);
            });
        });
    }

    navigateToPage(pageId) {
        if (pageId === this.currentPage) return;

        // Update URL hash
        window.location.hash = pageId;
        
        // Update navigation state
        this.setActivePage(pageId);
        
        // Emit navigation event
        this.emit(Events.PAGE_CHANGED, { 
            from: this.currentPage, 
            to: pageId 
        });
        
        this.currentPage = pageId;
    }

    setActivePage(pageId) {
        // Update active states in navigation
        this.element.querySelectorAll('.nav-button').forEach(button => {
            button.classList.remove('active');
        });
        
        const activeButton = this.element.querySelector(`[data-page="${pageId}"]`);
        if (activeButton) {
            activeButton.classList.add('active');
        }
    }

    handleHashChange() {
        const hash = window.location.hash.slice(1); // Remove #
        const validPageId = this.pages.find(page => page.id === hash)?.id;
        
        if (validPageId && validPageId !== this.currentPage) {
            this.setActivePage(validPageId);
            this.emit(Events.PAGE_CHANGED, { 
                from: this.currentPage, 
                to: validPageId 
            });
            this.currentPage = validPageId;
        }
    }

    render() {
        this.setContent(`
            <nav class="main-navigation">
                <div class="nav-buttons">
                    ${this.pages.map(page => `
                        <button 
                            class="nav-button ${page.id === this.currentPage ? 'active' : ''}" 
                            data-page="${page.id}"
                            title="${page.label}"
                        >
                            <span class="nav-icon">${page.icon}</span>
                            <span class="nav-label">${page.label}</span>
                        </button>
                    `).join('')}
                </div>
            </nav>
        `);
    }

    getCurrentPage() {
        return this.currentPage;
    }
}

// Global instance - will be created from index.html
let navigation;