// Sporter - Analytics Page (Placeholder)

class AnalyticsPage extends Page {
    constructor() {
        super('analytics');
        
        // No additional properties needed for this page
        // Now manually call init
        this.init();
    }

    init() {
        this.render();
    }

    renderContent() {
        this.setContent(`
            <div class="analytics-page">
                <!-- Hero Section -->
                <div class="page-hero">
                    <div class="hero-content">
                        <h1>📈 Analytics Dashboard</h1>
                        <p class="hero-subtitle">Advanced training analysis and insights</p>
                        <div class="coming-soon-badge">Coming Soon</div>
                    </div>
                </div>

                <!-- Feature Preview Cards -->
                <div class="feature-grid">
                    <div class="feature-card">
                        <div class="feature-icon">📊</div>
                        <h3>Training Load Analysis</h3>
                        <p>Comprehensive analysis of your training load patterns, recovery, and performance trends over time.</p>
                        <ul class="feature-list">
                            <li>Weekly/monthly training load</li>
                            <li>TSS (Training Stress Score)</li>
                            <li>Recovery metrics</li>
                        </ul>
                    </div>

                    <div class="feature-card">
                        <div class="feature-icon">📅</div>
                        <h3>Progress Tracking</h3>
                        <p>Track your progress across different activities and training zones with detailed historical data.</p>
                        <ul class="feature-list">
                            <li>Performance progression</li>
                            <li>Personal records tracking</li>
                            <li>Seasonal comparisons</li>
                        </ul>
                    </div>

                    <div class="feature-card">
                        <div class="feature-icon">🎯</div>
                        <h3>Goal Setting & Planning</h3>
                        <p>Set training goals and get personalized recommendations based on your current fitness level.</p>
                        <ul class="feature-list">
                            <li>Smart goal recommendations</li>
                            <li>Training plan suggestions</li>
                            <li>Progress towards goals</li>
                        </ul>
                    </div>

                    <div class="feature-card">
                        <div class="feature-icon">📈</div>
                        <h3>Performance Trends</h3>
                        <p>Advanced statistical analysis of your performance metrics and training adaptations.</p>
                        <ul class="feature-list">
                            <li>Fitness trends analysis</li>
                            <li>Heart rate zones evolution</li>
                            <li>Power/pace improvements</li>
                        </ul>
                    </div>

                    <div class="feature-card">
                        <div class="feature-icon">🏆</div>
                        <h3>Activity Comparisons</h3>
                        <p>Compare activities and identify patterns in your best performances.</p>
                        <ul class="feature-list">
                            <li>Side-by-side comparisons</li>
                            <li>Segment analysis</li>
                            <li>Weather impact analysis</li>
                        </ul>
                    </div>

                    <div class="feature-card">
                        <div class="feature-icon">⚡</div>
                        <h3>Real-time Insights</h3>
                        <p>Get intelligent insights and recommendations based on your training data.</p>
                        <ul class="feature-list">
                            <li>Recovery recommendations</li>
                            <li>Training intensity suggestions</li>
                            <li>Performance predictions</li>
                        </ul>
                    </div>
                </div>

                <!-- Development Roadmap -->
                <div class="roadmap-section">
                    <h2>🚀 Development Roadmap</h2>
                    <div class="roadmap-timeline">
                        <div class="timeline-item">
                            <div class="timeline-marker current"></div>
                            <div class="timeline-content">
                                <h4>Phase 1: Foundation</h4>
                                <p>Basic activity tracking and HR analysis</p>
                                <span class="timeline-status completed">✅ Completed</span>
                            </div>
                        </div>
                        
                        <div class="timeline-item">
                            <div class="timeline-marker upcoming"></div>
                            <div class="timeline-content">
                                <h4>Phase 2: Analytics Engine</h4>
                                <p>Training load calculation and performance metrics</p>
                                <span class="timeline-status">🔄 In Planning</span>
                            </div>
                        </div>
                        
                        <div class="timeline-item">
                            <div class="timeline-marker future"></div>
                            <div class="timeline-content">
                                <h4>Phase 3: Advanced Features</h4>
                                <p>Goal setting, comparisons, and AI insights</p>
                                <span class="timeline-status">📋 Future</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Call to Action -->
                <div class="cta-section">
                    <h3>Want to be notified when Analytics is ready?</h3>
                    <p>Analytics features are being developed based on user feedback and usage patterns.</p>
                    <div class="cta-buttons">
                        <button class="btn btn-primary" onclick="alert('Analytics features coming soon! Keep using the Activities page to build your training data.')">
                            Stay Updated
                        </button>
                        <button class="btn btn-secondary" onclick="navigation.navigateToPage('activities')">
                            Back to Activities
                        </button>
                    </div>
                </div>
            </div>
        `);
    }

    onShow() {
        // Could load some preview data or statistics here
        console.log('Analytics page shown');
        console.log('Analytics page element content:', this.element ? this.element.innerHTML.substring(0, 100) : 'NO ELEMENT');
    }

    onHide() {
        // Cleanup if needed
    }
}

// Global instance - will be created from page router
let analyticsPage;