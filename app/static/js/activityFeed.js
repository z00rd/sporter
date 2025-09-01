// Sporter - Activity Feed Component

class ActivityFeed {
    constructor() {
        this.currentActivityId = null;
        this.activities = [];
    }

    async loadActivities() {
        try {
            this.activities = await apiGet('/api/v1/activities/');
            this.render();
        } catch (error) {
            this.renderError(`Failed to load activities: ${error.message}`);
        }
    }

    render() {
        const feed = document.getElementById('activitiesFeed');
        
        if (!this.activities || this.activities.length === 0) {
            feed.innerHTML = '<p>No activities yet. Upload your first GPX file!</p>';
            return;
        }
        
        feed.innerHTML = this.activities.map(activity => `
            <div class="activity" onclick="activityFeed.selectActivity(${activity.id})" data-activity-id="${activity.id}">
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
        `).join('');
    }

    renderError(message) {
        const feed = document.getElementById('activitiesFeed');
        feed.innerHTML = `<p style="color: red;">${message}</p>`;
    }

    selectActivity(activityId) {
        // Update UI selection
        document.querySelectorAll('.activity').forEach(el => 
            el.classList.remove('selected')
        );
        
        const selectedActivity = document.querySelector(`[data-activity-id="${activityId}"]`);
        if (selectedActivity) {
            selectedActivity.classList.add('selected');
        }
        
        this.currentActivityId = activityId;
        
        // Notify other components
        if (window.activityDetail) {
            window.activityDetail.loadActivity(activityId);
        }
    }

    getCurrentActivityId() {
        return this.currentActivityId;
    }

    refreshAfterUpload() {
        this.loadActivities();
    }
}

// Global instance
const activityFeed = new ActivityFeed();