// Sporter - Activity Detail Component

class ActivityDetail {
    constructor() {
        this.currentActivity = null;
        this.activeComponent = 'overview';
    }

    async loadActivity(activityId) {
        const detailPanel = document.getElementById('activityDetail');
        detailPanel.innerHTML = 'Loading activity details...';
        
        try {
            this.currentActivity = await apiGet(`/api/v1/activities/${activityId}`);
            this.render();
        } catch (error) {
            detailPanel.innerHTML = `<p style="color: red;">Failed to load activity details: ${error.message}</p>`;
        }
    }

    render() {
        if (!this.currentActivity) return;
        
        const activity = this.currentActivity;
        const startTime = new Date(activity.start_time);
        const pace = calculatePace(activity.duration_seconds, activity.distance_km);
        
        const detailPanel = document.getElementById('activityDetail');
        detailPanel.innerHTML = `
            <div class="activity-detail">
                <h3>${getActivityIcon(activity.activity_type)} ${getActivityTypeLabel(activity.activity_type)}</h3>
                <p><strong>Date:</strong> ${formatDate(activity.start_time)} at ${formatTime(activity.start_time)}</p>
                
                <div class="detail-stats">
                    <div class="detail-stat">
                        <div class="detail-stat-value">${activity.distance_km} km</div>
                        <div class="detail-stat-label">Distance</div>
                    </div>
                    <div class="detail-stat">
                        <div class="detail-stat-value">${formatDuration(activity.duration_seconds)}</div>
                        <div class="detail-stat-label">Duration</div>
                    </div>
                    <div class="detail-stat">
                        <div class="detail-stat-value">${pace.toFixed(1)} min/km</div>
                        <div class="detail-stat-label">Average Pace</div>
                    </div>
                    <div class="detail-stat">
                        <div class="detail-stat-value">${activity.avg_heart_rate || 'N/A'}</div>
                        <div class="detail-stat-label">Avg Heart Rate</div>
                    </div>
                    <div class="detail-stat">
                        <div class="detail-stat-value">${activity.max_heart_rate || 'N/A'}</div>
                        <div class="detail-stat-label">Max Heart Rate</div>
                    </div>
                    <div class="detail-stat">
                        <div class="detail-stat-value">${activity.total_trackpoints}</div>
                        <div class="detail-stat-label">GPS Points</div>
                    </div>
                </div>
                
                <!-- Component Tabs -->
                <div class="component-tabs">
                    <div id="tab-overview" class="component-tab active" onclick="activityDetail.showComponent('overview')">
                        📊 Overview
                    </div>
                    <div id="tab-map" class="component-tab" onclick="activityDetail.showComponent('map')">
                        📍 Map
                    </div>
                    <div id="tab-heart-rate" class="component-tab" onclick="activityDetail.showComponent('heart-rate')">
                        💓 Heart Rate
                    </div>
                    <div id="tab-elevation" class="component-tab" onclick="activityDetail.showComponent('elevation')">
                        ⛰️ Elevation
                    </div>
                </div>
                
                <!-- Component Contents -->
                <div id="content-overview" class="component-content active">
                    <div class="detail-placeholder">
                        <p>📈 Activity Overview</p>
                        <p>Basic stats and summary information displayed above.</p>
                        <p>Select other tabs to view detailed visualizations.</p>
                    </div>
                </div>
                
                <div id="content-map" class="component-content">
                    <div id="map-container" class="map-container">
                        <div class="detail-placeholder">
                            <p>📍 GPS Route Map</p>
                            <p>Interactive map will be displayed here</p>
                            <button onclick="activityDetail.loadMap()">Load Map</button>
                        </div>
                    </div>
                </div>
                
                <div id="content-heart-rate" class="component-content">
                    <div id="heart-rate-container" class="chart-container">
                        <div class="detail-placeholder">
                            <p>💓 Heart Rate Chart</p>
                            <p>HR over time with exclusion visualization</p>
                            <button onclick="activityDetail.loadHeartRate()">Load HR Chart</button>
                        </div>
                    </div>
                </div>
                
                <div id="content-elevation" class="component-content">
                    <div id="elevation-container" class="chart-container">
                        <div class="detail-placeholder">
                            <p>⛰️ Elevation Profile</p>
                            <p>Elevation changes over distance</p>
                            <button onclick="activityDetail.loadElevation()">Load Elevation</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    showComponent(componentName) {
        // Update active tab
        document.querySelectorAll('.component-tab').forEach(tab => 
            tab.classList.remove('active')
        );
        document.querySelectorAll('.component-content').forEach(content => 
            content.classList.remove('active')
        );
        
        const tab = document.getElementById(`tab-${componentName}`);
        const content = document.getElementById(`content-${componentName}`);
        
        if (tab) tab.classList.add('active');
        if (content) content.classList.add('active');
        
        this.activeComponent = componentName;
    }

    async loadMap() {
        if (!this.currentActivity) return;
        
        const container = document.getElementById('map-container');
        container.innerHTML = '<p>Loading GPS trackpoints...</p>';
        
        try {
            const trackpoints = await apiGet(`/api/v1/activities/${this.currentActivity.id}/trackpoints`);
            // TODO: Initialize map with trackpoints
            container.innerHTML = `
                <div class="detail-placeholder">
                    <p>📍 Map with ${trackpoints.length} GPS points</p>
                    <p>Map component will be implemented next</p>
                </div>
            `;
        } catch (error) {
            container.innerHTML = `<p style="color: red;">Failed to load trackpoints: ${error.message}</p>`;
        }
    }

    async loadHeartRate() {
        if (!this.currentActivity) return;
        
        const container = document.getElementById('heart-rate-container');
        container.innerHTML = '<p>Loading heart rate data...</p>';
        
        try {
            const hrData = await apiGet(`/api/v1/activities/${this.currentActivity.id}/heart-rate`);
            // TODO: Initialize HR chart
            container.innerHTML = `
                <div class="detail-placeholder">
                    <p>💓 HR Chart with ${hrData.stats.total_hr_points} points</p>
                    <p>Excluded: ${hrData.stats.excluded_points} points</p>
                    <p>Startup: ${hrData.stats.exclusion_breakdown.hr_startup}</p>
                    <p>Outliers: ${hrData.stats.exclusion_breakdown.hr_statistical_outlier}</p>
                    <p>Chart component will be implemented next</p>
                </div>
            `;
        } catch (error) {
            container.innerHTML = `<p style="color: red;">Failed to load heart rate: ${error.message}</p>`;
        }
    }

    async loadElevation() {
        if (!this.currentActivity) return;
        
        const container = document.getElementById('elevation-container');
        container.innerHTML = '<p>Loading elevation data...</p>';
        
        try {
            const elevData = await apiGet(`/api/v1/activities/${this.currentActivity.id}/elevation`);
            // TODO: Initialize elevation chart
            container.innerHTML = `
                <div class="detail-placeholder">
                    <p>⛰️ Elevation with ${elevData.total_points} points</p>
                    <p>Distance: ${elevData.stats.total_distance_km}km</p>
                    <p>Chart component will be implemented next</p>
                </div>
            `;
        } catch (error) {
            container.innerHTML = `<p style="color: red;">Failed to load elevation: ${error.message}</p>`;
        }
    }
}

// Global instance
const activityDetail = new ActivityDetail();
window.activityDetail = activityDetail;