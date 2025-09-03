// Sporter - Activity Detail Component

class ActivityDetail extends Component {
    constructor() {
        super('activityDetail');
        this.currentActivity = null;
        this.activeComponent = 'overview';
        this.userProfile = null;
        this.hrChart = null;
        this.loadingStates = {
            map: false,
            heartRate: false,
            elevation: false
        };
        
        // Load user profile
        this.loadUserProfile();
    }

    async loadUserProfile() {
        try {
            this.userProfile = await api.getDefaultUser();
        } catch (error) {
            console.warn('Could not load user profile:', error.message);
            this.userProfile = null;
        }
    }

    setupEventListeners() {
        // Listen for activity selection events
        this.subscribe(Events.ACTIVITY_SELECTED, (data) => {
            this.loadActivity(data.activityId);
        });

        // Listen for user profile updates
        this.subscribe(Events.USER_PROFILE_UPDATED, (data) => {
            this.userProfile = data.user;
            
            // Update HR chart if it exists
            if (this.hrChart) {
                this.hrChart.updateUserProfile(this.userProfile);
            }
        });
    }

    async loadActivity(activityId) {
        try {
            this.showLoading('Loading activity details...');
            this.currentActivity = await api.getActivity(activityId);
            this.render();
        } catch (error) {
            this.handleError(error, ' while loading activity details');
            this.renderError('Failed to load activity details. Please try again.');
        } finally {
            this.hideLoading();
        }
    }

    render() {
        if (!this.currentActivity || !this.element) return;
        
        const activity = this.currentActivity;
        const pace = calculatePace(activity.duration_seconds, activity.distance_km);
        
        this.setContent(`
            <div class="activity-detail">
                <div class="activity-header">
                    <div class="activity-title">
                        <h3>${getActivityIcon(activity.activity_type)} ${getActivityTypeLabel(activity.activity_type)}</h3>
                        <p><strong>Date:</strong> ${formatDate(activity.start_time)} at ${formatTime(activity.start_time)}</p>
                    </div>
                    <button class="btn btn-danger" data-action="delete-activity" data-activity-id="${activity.id}">🗑️ Delete</button>
                </div>
                
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
                    <div class="component-tab ${this.activeComponent === 'overview' ? 'active' : ''}" data-component="overview">
                        📊 Overview
                    </div>
                    <div class="component-tab ${this.activeComponent === 'map' ? 'active' : ''}" data-component="map">
                        📍 Map
                    </div>
                    <div class="component-tab ${this.activeComponent === 'heart-rate' ? 'active' : ''}" data-component="heart-rate">
                        💓 Heart Rate
                    </div>
                    <div class="component-tab ${this.activeComponent === 'elevation' ? 'active' : ''}" data-component="elevation">
                        ⛰️ Elevation
                    </div>
                </div>
                
                <!-- Component Contents -->
                <div id="content-overview" class="component-content ${this.activeComponent === 'overview' ? 'active' : ''}">
                    <div class="detail-placeholder">
                        <p>📈 Activity Overview</p>
                        <p>Basic stats and summary information displayed above.</p>
                        <p>Select other tabs to view detailed visualizations.</p>
                    </div>
                </div>
                
                <div id="content-map" class="component-content ${this.activeComponent === 'map' ? 'active' : ''}">
                    <div id="map-container" class="map-container">
                        <div class="detail-placeholder">
                            <p>📍 GPS Route Map</p>
                            <p>Interactive map will be displayed here</p>
                            <button class="btn" data-action="load-map">Load Map</button>
                        </div>
                    </div>
                </div>
                
                <div id="content-heart-rate" class="component-content ${this.activeComponent === 'heart-rate' ? 'active' : ''}">
                    <div id="heart-rate-container" class="chart-container">
                        <div class="detail-placeholder">
                            <p>💓 Heart Rate Chart</p>
                            <p>HR over time with exclusion visualization</p>
                            <button class="btn" data-action="load-heart-rate">Load HR Chart</button>
                        </div>
                    </div>
                    <div id="hr-exclusion-controls" class="hr-exclusion-controls" style="display: none;">
                        <h5>🔴 Exclusion Ranges</h5>
                        <div id="exclusion-ranges-list">
                            <!-- Exclusion ranges will be displayed here -->
                        </div>
                        <button class="btn btn-small" data-action="add-exclusion-range">+ Add exclusion range</button>
                    </div>
                    <div id="hr-stats-container" class="hr-stats" style="display: none;">
                        <!-- HR statistics will be displayed here -->
                    </div>
                </div>
                
                <div id="content-elevation" class="component-content ${this.activeComponent === 'elevation' ? 'active' : ''}">
                    <div id="elevation-container" class="chart-container">
                        <div class="detail-placeholder">
                            <p>⛰️ Elevation Profile</p>
                            <p>Elevation changes over distance</p>
                            <button class="btn" data-action="load-elevation">Load Elevation</button>
                        </div>
                    </div>
                </div>
            </div>
        `);

        // Add event listeners after rendering
        this.setupTabListeners();
        this.setupActionListeners();
    }

    setupTabListeners() {
        const tabs = this.element.querySelectorAll('.component-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const component = tab.dataset.component;
                this.showComponent(component);
            });
        });
    }

    setupActionListeners() {
        const buttons = this.element.querySelectorAll('[data-action]');
        buttons.forEach(button => {
            button.addEventListener('click', () => {
                const action = button.dataset.action;
                switch (action) {
                    case 'load-map':
                        this.loadMap();
                        break;
                    case 'load-heart-rate':
                        this.loadHeartRate();
                        break;
                    case 'load-elevation':
                        this.loadElevation();
                        break;
                    case 'add-exclusion-range':
                        this.addExclusionRange();
                        break;
                    case 'delete-activity':
                        this.handleDeleteActivity(button);
                        break;
                }
            });
        });
    }

    renderError(message) {
        this.setContent(`
            <div class="error-state">
                <p class="error-message">❌ ${message}</p>
                <p>Please try selecting the activity again.</p>
            </div>
        `);
    }

    showComponent(componentName) {
        if (this.activeComponent === componentName) return; // Already active
        
        // Update active tab and content
        this.element.querySelectorAll('.component-tab').forEach(tab => 
            tab.classList.remove('active')
        );
        this.element.querySelectorAll('.component-content').forEach(content => 
            content.classList.remove('active')
        );
        
        const tab = this.element.querySelector(`[data-component="${componentName}"]`);
        const content = this.element.querySelector(`#content-${componentName}`);
        
        if (tab) tab.classList.add('active');
        if (content) content.classList.add('active');
        
        this.activeComponent = componentName;
        
        // Emit event for analytics/tracking
        this.emit(Events.COMPONENT_TAB_CHANGED, { 
            component: componentName,
            activity: this.currentActivity?.id 
        });
    }

    async loadMap() {
        if (!this.currentActivity || this.loadingStates.map) return;
        
        const container = this.element.querySelector('#map-container');
        if (!container) return;
        
        try {
            this.loadingStates.map = true;
            container.innerHTML = '<div class="loading-placeholder">📍 Loading GPS trackpoints...</div>';
            
            const trackpoints = await api.getTrackpoints(this.currentActivity.id);
            
            // TODO: Initialize actual map component
            container.innerHTML = `
                <div class="visualization-placeholder">
                    <div class="viz-header">
                        <h4>📍 GPS Route Map</h4>
                        <div class="viz-stats">
                            <span class="stat">${trackpoints.length} GPS points</span>
                        </div>
                    </div>
                    <div class="viz-content">
                        <p>Interactive map will be implemented here</p>
                        <p>Ready for Leaflet/Mapbox integration</p>
                    </div>
                </div>
            `;
        } catch (error) {
            this.handleError(error, ' while loading map data');
            container.innerHTML = `
                <div class="error-placeholder">
                    <p>❌ Failed to load GPS data</p>
                    <button class="btn btn-small" onclick="activityDetail.loadMap()">Try Again</button>
                </div>
            `;
        } finally {
            this.loadingStates.map = false;
        }
    }

    async loadHeartRate() {
        if (!this.currentActivity || this.loadingStates.heartRate) return;
        
        const container = this.element.querySelector('#heart-rate-container');
        const statsContainer = this.element.querySelector('#hr-stats-container');
        if (!container) return;
        
        try {
            this.loadingStates.heartRate = true;
            container.innerHTML = '<div class="loading-placeholder">💓 Loading heart rate data...</div>';
            
            const hrData = await api.getHeartRateData(this.currentActivity.id);
            
            // Get exclusion ranges for chart visualization
            const rangesResponse = await api.getExclusionRanges(this.currentActivity.id);
            const userExclusionRanges = rangesResponse.ranges || [];
            
            // Create chart canvas
            container.innerHTML = `
                <div class="chart-header">
                    <h4>💓 Heart Rate Analysis</h4>
                    <div class="chart-controls">
                        ${this.userProfile?.hr_max ? '<span class="hr-zones-indicator">🎯 HR Zones Enabled</span>' : '<span class="no-zones">ℹ️ Set HR Max for zones</span>'}
                    </div>
                </div>
                <div class="chart-canvas-container">
                    <canvas id="hr-chart-canvas" width="800" height="400"></canvas>
                </div>
            `;
            
            // Initialize HR Chart
            if (this.hrChart) {
                this.hrChart.destroy();
            }
            
            this.hrChart = new HRChart('hr-chart-canvas', this.userProfile);
            await this.hrChart.render(hrData, userExclusionRanges);
            
            // Show statistics and exclusion controls
            this.displayHRStats(hrData, statsContainer);
            this.displayExclusionControls(hrData);
            
        } catch (error) {
            this.handleError(error, ' while loading heart rate data');
            container.innerHTML = `
                <div class="error-placeholder">
                    <p>❌ Failed to load heart rate data</p>
                    <button class="btn btn-small" data-action="load-heart-rate">Try Again</button>
                </div>
            `;
            this.setupActionListeners(); // Re-bind event listeners
        } finally {
            this.loadingStates.heartRate = false;
        }
    }

    displayHRStats(hrData, container) {
        if (!container || !this.hrChart) return;
        
        const stats = this.hrChart.getStats(hrData);
        if (!stats) return;
        
        let zoneStatsHtml = '';
        if (stats.zoneDistribution) {
            zoneStatsHtml = `
                <div class="hr-zone-distribution">
                    <h5>Time in HR Zones</h5>
                    <div class="zone-bars">
                        ${Object.entries(stats.zoneDistribution).map(([zone, percentage]) => `
                            <div class="zone-bar">
                                <div class="zone-label">${zone}</div>
                                <div class="zone-progress">
                                    <div class="zone-fill" style="width: ${percentage}%"></div>
                                    <span class="zone-percentage">${percentage}%</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        
        container.innerHTML = `
            <div class="hr-statistics">
                <div class="stat-grid">
                    <div class="stat-item">
                        <div class="stat-value">${stats.avgHR}</div>
                        <div class="stat-label">Avg HR</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${stats.maxHR}</div>
                        <div class="stat-label">Max HR</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${stats.minHR}</div>
                        <div class="stat-label">Min HR</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${stats.exclusionRate}%</div>
                        <div class="stat-label">Excluded</div>
                    </div>
                </div>
                
                <div class="exclusion-details">
                    <h5>Data Quality</h5>
                    <p>📊 Total points: <strong>${stats.totalPoints}</strong></p>
                    <p>✅ Valid points: <strong>${stats.includedPoints}</strong></p>
                    <p>❌ Excluded points: <strong>${stats.excludedPoints}</strong></p>
                </div>
                
                ${zoneStatsHtml}
            </div>
        `;
        
        container.style.display = 'block';
    }

    async loadElevation() {
        if (!this.currentActivity || this.loadingStates.elevation) return;
        
        const container = this.element.querySelector('#elevation-container');
        if (!container) return;
        
        try {
            this.loadingStates.elevation = true;
            container.innerHTML = '<div class="loading-placeholder">⛰️ Loading elevation data...</div>';
            
            const elevData = await api.getElevationData(this.currentActivity.id);
            
            // TODO: Initialize actual elevation chart component
            container.innerHTML = `
                <div class="visualization-placeholder">
                    <div class="viz-header">
                        <h4>⛰️ Elevation Profile</h4>
                        <div class="viz-stats">
                            <span class="stat">${elevData.total_points} elevation points</span>
                            <span class="stat">${elevData.stats.total_distance_km}km distance</span>
                        </div>
                    </div>
                    <div class="viz-content">
                        <p>Elevation chart ready for Chart.js/D3 integration</p>
                        <p>Shows elevation changes over distance</p>
                    </div>
                </div>
            `;
        } catch (error) {
            this.handleError(error, ' while loading elevation data');
            container.innerHTML = `
                <div class="error-placeholder">
                    <p>❌ Failed to load elevation data</p>
                    <button class="btn btn-small" onclick="activityDetail.loadElevation()">Try Again</button>
                </div>
            `;
        } finally {
            this.loadingStates.elevation = false;
        }
    }

    async displayExclusionControls(hrData) {
        const container = this.element.querySelector('#hr-exclusion-controls');
        if (!container || !hrData?.data) return;

        try {
            // Get exclusion ranges from backend
            const rangesResponse = await api.getExclusionRanges(this.currentActivity.id);
            const userExclusionRanges = rangesResponse.ranges || [];
            
            // Get system exclusion ranges based on current data (automatic exclusions summary)
            const systemExclusionRanges = this.getSystemExclusionRanges(hrData);
            
            this.renderExclusionRangesList(userExclusionRanges, systemExclusionRanges);
            container.style.display = 'block';
        } catch (error) {
            console.error('Failed to load exclusion ranges:', error);
            // Show controls anyway with empty ranges
            this.renderExclusionRangesList([], []);
            container.style.display = 'block';
        }
    }


    getSystemExclusionRanges(hrData) {
        const ranges = [];
        const excludedPoints = hrData.data.filter(point => point.excluded);
        
        if (excludedPoints.length === 0) return ranges;
        
        // Group consecutive excluded points into ranges
        let currentRange = null;
        
        excludedPoints.forEach(point => {
            const timeMinutes = point.time_seconds / 60;
            
            if (!currentRange) {
                currentRange = {
                    startTime: timeMinutes,
                    endTime: timeMinutes,
                    reason: point.exclusion_reason,
                    isSystem: true
                };
            } else if (Math.abs(timeMinutes - currentRange.endTime) < 0.5) { // Within 30 seconds
                currentRange.endTime = timeMinutes;
            } else {
                ranges.push(currentRange);
                currentRange = {
                    startTime: timeMinutes,
                    endTime: timeMinutes,
                    reason: point.exclusion_reason,
                    isSystem: true
                };
            }
        });
        
        if (currentRange) {
            ranges.push(currentRange);
        }
        
        return ranges;
    }

    renderExclusionRangesList(userRanges, systemRanges) {
        const listContainer = this.element.querySelector('#exclusion-ranges-list');
        if (!listContainer) return;

        // Render automatic exclusions summary
        const autoExclusionsHtml = systemRanges.length > 0 ? `
            <div class="auto-exclusions-summary">
                <h6>🤖 Automatic Exclusions</h6>
                <div class="exclusion-summary">${systemRanges.map(range => 
                    `<span class="exclusion-count">${range.count} ${range.reason}</span>`
                ).join(', ')}</div>
                <div class="auto-actions">
                    <button class="btn btn-small" data-action="clear-auto-exclusions">Clear All Auto</button>
                    <button class="btn btn-small" data-action="reapply-auto-exclusions">Re-run Auto</button>
                </div>
            </div>
        ` : '';

        // Render user ranges
        const userRangesHtml = userRanges.length > 0 ? `
            <div class="user-ranges-section">
                <h6>👤 User Ranges</h6>
                ${userRanges.map(range => {
                    const startMin = Math.floor(range.start_time_seconds / 60);
                    const startSec = range.start_time_seconds % 60;
                    const endMin = Math.floor(range.end_time_seconds / 60);
                    const endSec = range.end_time_seconds % 60;
                    
                    const startTimeStr = `${startMin}:${startSec.toString().padStart(2, '0')}`;
                    const endTimeStr = `${endMin}:${endSec.toString().padStart(2, '0')}`;
                    
                    return `
                        <div class="exclusion-range user-range" data-range-id="${range.id}">
                            <div class="range-info">
                                <span class="range-time">${startTimeStr} - ${endTimeStr}</span>
                                <span class="range-reason">${range.reason || 'User exclusion'}</span>
                                <span class="points-count">${range.points_affected} points</span>
                            </div>
                            <div class="range-actions">
                                <button class="btn-icon" data-action="delete-range" data-range-id="${range.id}" title="Delete range">❌</button>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        ` : '';

        const noRangesHtml = userRanges.length === 0 && systemRanges.length === 0 ? 
            '<p class="no-ranges">No exclusion ranges defined</p>' : '';

        listContainer.innerHTML = autoExclusionsHtml + userRangesHtml + noRangesHtml;
        
        // Add event listeners for range actions
        this.setupRangeActionListeners();
    }

    setupRangeActionListeners() {
        const rangeActions = this.element.querySelectorAll('#exclusion-ranges-list [data-action]');
        rangeActions.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const action = e.target.dataset.action;
                const rangeId = e.target.dataset.rangeId;
                
                switch (action) {
                    case 'delete-range':
                        this.deleteExclusionRange(rangeId);
                        break;
                    case 'clear-auto-exclusions':
                        this.clearAutoExclusions();
                        break;
                    case 'reapply-auto-exclusions':
                        this.reapplyAutoExclusions();
                        break;
                }
            });
        });
    }

    addExclusionRange() {
        this.showExclusionRangeDialog();
    }


    async deleteExclusionRange(rangeId) {
        if (confirm('Are you sure you want to delete this exclusion range?')) {
            try {
                this.showLoading('Deleting exclusion range...');
                await api.deleteExclusionRange(this.currentActivity.id, rangeId);
                this.emit(Events.SUCCESS_MESSAGE, { message: 'Exclusion range deleted successfully!' });
                await this.refreshExclusionControls();
            } catch (error) {
                this.handleError(error, ' while deleting exclusion range');
            } finally {
                this.hideLoading();
            }
        }
    }

    async clearAutoExclusions() {
        if (confirm('Clear all automatic exclusions? This will remove startup and outlier detection.')) {
            try {
                this.showLoading('Clearing automatic exclusions...');
                await api.clearHRExclusions(this.currentActivity.id);
                this.emit(Events.SUCCESS_MESSAGE, { message: 'Automatic exclusions cleared!' });
                await this.refreshExclusionControls();
            } catch (error) {
                this.handleError(error, ' while clearing automatic exclusions');
            } finally {
                this.hideLoading();
            }
        }
    }

    async reapplyAutoExclusions() {
        if (confirm('Re-run automatic exclusion detection? This will clear existing auto-exclusions and re-analyze.')) {
            try {
                this.showLoading('Re-running automatic detection...');
                await api.reapplyHRExclusions(this.currentActivity.id);
                this.emit(Events.SUCCESS_MESSAGE, { message: 'Automatic exclusions updated!' });
                await this.refreshExclusionControls();
            } catch (error) {
                this.handleError(error, ' while re-applying automatic exclusions');
            } finally {
                this.hideLoading();
            }
        }
    }

    showExclusionRangeDialog(rangeIndex = null, isOverride = false) {
        // For now, use simple prompts - will enhance with proper modal later
        const startTimeStr = prompt('Enter start time (MM:SS format):', '0:00');
        const endTimeStr = prompt('Enter end time (MM:SS format):', '1:00');
        const reason = prompt('Enter reason (optional):', '');
        
        if (!startTimeStr || !endTimeStr) return;
        
        try {
            const startTime = this.parseTimeString(startTimeStr);
            const endTime = this.parseTimeString(endTimeStr);
            
            if (startTime >= endTime) {
                alert('End time must be after start time');
                return;
            }
            
            // Save to backend
            this.createExclusionRange(startTime, endTime, reason);
            
        } catch (error) {
            alert('Invalid time format. Use MM:SS (e.g., 2:30)');
        }
    }

    async createExclusionRange(startTimeSeconds, endTimeSeconds, reason) {
        try {
            this.showLoading('Creating exclusion range...');
            
            const rangeData = {
                start_time_seconds: startTimeSeconds,
                end_time_seconds: endTimeSeconds,
                reason: reason || 'User exclusion'
            };
            
            
            await api.createExclusionRange(this.currentActivity.id, rangeData);
            this.emit(Events.SUCCESS_MESSAGE, { message: 'Exclusion range created successfully!' });
            await this.refreshExclusionControls();
            
        } catch (error) {
            this.handleError(error, ' while creating exclusion range');
        } finally {
            this.hideLoading();
        }
    }

    parseTimeString(timeStr) {
        const parts = timeStr.split(':');
        if (parts.length !== 2) throw new Error('Invalid format');
        
        const minutes = parseInt(parts[0]);
        const seconds = parseInt(parts[1]);
        
        if (isNaN(minutes) || isNaN(seconds) || seconds >= 60) {
            throw new Error('Invalid time values');
        }
        
        return (minutes * 60) + seconds; // Return total seconds
    }

    refreshExclusionControls() {
        // TODO: Reload HR data and re-render chart with new exclusions
        // For now just reload the chart
        if (this.hrChart && this.currentActivity) {
            this.loadHeartRate();
        }
    }

    async handleDeleteActivity(button) {
        const activityId = parseInt(button.dataset.activityId);
        const activityName = this.currentActivity?.name || 'this activity';
        
        // Confirm deletion
        const confirmed = confirm(`Are you sure you want to delete "${activityName}"? This action cannot be undone.`);
        if (!confirmed) return;
        
        try {
            this.showLoading('Deleting activity...');
            
            const result = await api.deleteActivity(activityId);
            
            // Emit success message
            this.emit(Events.SUCCESS_MESSAGE, { message: result.message });
            
            // Clear current activity and show placeholder
            this.currentActivity = null;
            this.setContent(`
                <div class="detail-placeholder">
                    Select an activity to view details
                </div>
            `);
            
            // Refresh the activity feed
            this.emit(Events.ACTIVITY_DELETED, { activityId });
            
        } catch (error) {
            this.handleError(error, ' while deleting activity');
        } finally {
            this.hideLoading();
        }
    }
}

// Global instance - will be created from index.html
let activityDetail;