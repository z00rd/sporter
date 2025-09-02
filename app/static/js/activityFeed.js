// Sporter - Activity Feed Component

class ActivityFeed extends Component {
    constructor() {
        super('activitiesFeed');
        this.currentActivityId = null;
        this.activities = [];
        this.currentUserId = null;
    }

    setupEventListeners() {
        
        // Listen for activity uploads to refresh the feed
        this.subscribe(Events.ACTIVITY_UPLOADED, () => {
            this.loadActivities();
        });

        // Listen for activity deletions to refresh the feed
        this.subscribe(Events.ACTIVITY_DELETED, () => {
            this.loadActivities();
        });

        // Listen for user changes to reload activities
        this.subscribe(Events.USER_PROFILE_LOADED, (data) => {
            this.currentUserId = data.user?.id;
            this.loadActivities();
        });

        this.subscribe(Events.USER_PROFILE_UPDATED, (data) => {
            this.currentUserId = data.user?.id;
            this.loadActivities();
        });
    }

    async loadActivities() {
        try {
            this.showLoading('Loading activities...');
            this.activities = await api.getActivities(this.currentUserId);
            this.render();
            this.emit(Events.ACTIVITIES_LOADED, { activities: this.activities });
        } catch (error) {
            this.handleError(error, ' while loading activities');
            this.renderError('Failed to load activities. Please try again.');
        } finally {
            this.hideLoading();
        }
    }

    render() {
        if (!this.element) return;
        
        if (!this.activities || this.activities.length === 0) {
            this.setContent(`
                <div class="empty-state">
                    <p>🏃‍♂️ No activities yet</p>
                    <p>Upload your first GPX file to get started!</p>
                </div>
            `);
            return;
        }
        
        const activitiesHtml = this.activities.map(activity => this.renderActivity(activity)).join('');
        this.setContent(activitiesHtml);
        
        // Add click listeners to activities
        this.element.querySelectorAll('.activity').forEach(activityEl => {
            const activityId = parseInt(activityEl.dataset.activityId);
            activityEl.addEventListener('click', () => this.selectActivity(activityId));
        });
    }

    renderActivity(activity) {
        return `
            <div class="activity" data-activity-id="${activity.id}">
                <div class="activity-header">
                    ${getActivityIcon(activity.activity_type)} ${getActivityTypeLabel(activity.activity_type)} on ${formatDate(activity.start_time)}
                </div>
                <div class="stats">
                    <div class="stat">📏 ${activity.distance_km}km</div>
                    <div class="stat">⏱️ ${Math.floor(activity.duration_seconds/60)}min</div>
                    <div class="stat">💓 ${activity.avg_heart_rate || 'N/A'}</div>
                    <div class="stat">📍 ${activity.total_trackpoints}pts</div>
                </div>
            </div>
        `;
    }

    renderError(message) {
        this.setContent(`
            <div class="error-state">
                <p class="error-message">❌ ${message}</p>
                <button class="btn btn-small" onclick="activityFeed.loadActivities()">Try Again</button>
            </div>
        `);
    }

    selectActivity(activityId) {
        if (this.currentActivityId === activityId) return; // Already selected
        
        // Update UI selection
        this.element.querySelectorAll('.activity').forEach(el => 
            el.classList.remove('selected')
        );
        
        const selectedActivity = this.element.querySelector(`[data-activity-id="${activityId}"]`);
        if (selectedActivity) {
            selectedActivity.classList.add('selected');
        }
        
        this.currentActivityId = activityId;
        
        // Emit event for other components
        this.emit(Events.ACTIVITY_SELECTED, { 
            activityId, 
            activity: this.activities.find(a => a.id === activityId) 
        });
    }

    getCurrentActivityId() {
        return this.currentActivityId;
    }
}

// Global instance - will be created from index.html
let activityFeed;