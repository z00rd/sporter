// Sporter - Activities Page Component

class ActivitiesPage extends Page {
    constructor() {
        super('activities');
        
        // Initialize properties after calling super()
        this.fileUpload = null;
        this.activityFeed = null;
        this.activityDetail = null;
        
        // Now manually call init with properties set up
        this.init();
    }

    init() {
        this.render();
        
        // Initialize child components
        this.fileUpload = new FileUpload();
        this.activityFeed = new ActivityFeed();
        this.activityDetail = new ActivityDetail();
        
        this.fileUpload.init();
        this.activityFeed.init();
        this.activityDetail.init();
    }

    renderContent() {
        this.setContent(`
            <div class="activities-page">
                <!-- GPX Upload Section -->
                <div class="upload-section">
                    <h2>Upload GPX File</h2>
                    <div id="uploadForm">
                        <!-- File upload component will be rendered here -->
                    </div>
                </div>
                
                <!-- Main Content Area -->
                <div class="main-content">
                    <div class="left-panel">
                        <h2>Recent Activities</h2>
                        <div id="activitiesFeed">
                            <!-- Activity feed component will be rendered here -->
                        </div>
                    </div>
                    <div class="right-panel">
                        <div id="activityDetail" class="detail-placeholder">
                            Select an activity to view details
                        </div>
                    </div>
                </div>
            </div>
        `);
    }

    onShow() {
        // Refresh activities when page becomes visible
        console.log('Activities page shown');
        console.log('Activities page element content:', this.element ? this.element.innerHTML.substring(0, 100) : 'NO ELEMENT');
        
        if (this.activityFeed && this.activityFeed.loadActivities) {
            this.activityFeed.loadActivities();
        }
    }

    onHide() {
        // Clean up or pause any ongoing operations
    }
}

// Global instance - will be created from page router
let activitiesPage;