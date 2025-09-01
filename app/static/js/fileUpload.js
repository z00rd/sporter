// Sporter - File Upload Component

class FileUpload {
    constructor() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        const form = document.getElementById('uploadForm');
        if (form) {
            form.addEventListener('submit', (e) => this.handleSubmit(e));
        }
    }

    async handleSubmit(e) {
        e.preventDefault();
        
        const fileInput = document.getElementById('gpxFile');
        const loading = document.getElementById('loading');
        const result = document.getElementById('uploadResult');
        
        if (!fileInput.files[0]) {
            alert('Please select a GPX file');
            return;
        }
        
        // Show loading state
        showElement(loading);
        setElementHTML('uploadResult', '');
        
        const formData = new FormData();
        formData.append('file', fileInput.files[0]);
        
        try {
            const data = await apiPost('/api/v1/activities/upload', formData);
            
            this.showSuccessMessage(data);
            fileInput.value = ''; // Clear file input
            
            // Refresh activity feed
            if (window.activityFeed) {
                activityFeed.refreshAfterUpload();
            }
            
        } catch (error) {
            this.showErrorMessage(error.message);
        } finally {
            hideElement(loading);
        }
    }

    showSuccessMessage(data) {
        const message = `
            <div style="color: green; margin: 10px 0;">
                ✅ ${data.message}<br>
                Distance: ${data.stats.distance_km}km, 
                Duration: ${Math.floor(data.stats.duration_seconds/60)}min, 
                HR: ${data.stats.avg_heart_rate || 'N/A'}
            </div>
        `;
        setElementHTML('uploadResult', message);
    }

    showErrorMessage(errorMessage) {
        const message = `<div style="color: red; margin: 10px 0;">❌ Upload failed: ${errorMessage}</div>`;
        setElementHTML('uploadResult', message);
    }
}

// Global instance
const fileUpload = new FileUpload();