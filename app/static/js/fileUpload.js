// Sporter - File Upload Component

class FileUpload extends Component {
    constructor() {
        super('uploadForm');
        this.fileInput = null;
        this.resultContainer = null;
        this.loadingElement = null;
        this.allowedFileTypes = ['.gpx'];
        this.maxFileSize = 50 * 1024 * 1024; // 50MB
    }

    init() {
        super.init();
        this.fileInput = document.getElementById('gpxFile');
        this.resultContainer = document.getElementById('uploadResult');
        this.loadingElement = document.getElementById('loading');
    }

    setupEventListeners() {
        if (this.element) {
            this.element.addEventListener('submit', (e) => this.handleSubmit(e));
        }

        if (this.fileInput) {
            this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        }
    }

    handleFileSelect(e) {
        const file = e.target.files[0];
        if (file && !this.validateFile(file)) {
            e.target.value = ''; // Clear invalid file
        }
    }

    validateFile(file) {
        // Check file type
        if (!file.name.toLowerCase().endsWith('.gpx')) {
            this.showErrorMessage('Please select a GPX file (.gpx extension required)');
            return false;
        }

        // Check file size
        if (file.size > this.maxFileSize) {
            this.showErrorMessage(`File size too large. Maximum size is ${this.maxFileSize / (1024*1024)}MB`);
            return false;
        }

        return true;
    }

    async handleSubmit(e) {
        e.preventDefault();
        
        // Fallback: re-fetch file input if not found during init
        if (!this.fileInput) {
            this.fileInput = document.getElementById('gpxFile');
        }
        
        if (!this.fileInput?.files[0]) {
            this.showErrorMessage('Please select a GPX file');
            return;
        }

        const file = this.fileInput.files[0];
        
        if (!this.validateFile(file)) {
            return;
        }
        
        await this.uploadFile(file);
    }

    async uploadFile(file) {
        try {
            this.showLoading(`Uploading ${file.name}...`);
            this.clearResults();
            
            // Get current user ID from dropdown
            const userSelect = document.getElementById('user-select');
            const userId = userSelect?.value;
            
            const formData = new FormData();
            formData.append('file', file);
            if (userId) {
                formData.append('user_id', userId);
            }
            
            const data = await api.uploadActivity(formData);
            
            this.showSuccessMessage(data);
            this.clearFileInput();
            
            // Emit event for other components
            this.emit(Events.ACTIVITY_UPLOADED, { 
                activity: data.activity,
                stats: data.stats 
            });
            
        } catch (error) {
            this.handleError(error, ' during file upload');
            
            let errorMessage = 'Upload failed. Please try again.';
            if (error instanceof ApiError) {
                errorMessage = error.message;
            }
            
            this.showErrorMessage(errorMessage);
        } finally {
            this.hideLoading();
        }
    }

    showSuccessMessage(data) {
        if (!this.resultContainer) return;
        
        const stats = data.stats || {};
        const message = `
            <div class="upload-success">
                <div class="success-header">
                    ✅ ${data.message || 'Upload successful!'}
                </div>
                <div class="success-stats">
                    <span class="stat">📏 ${stats.distance_km || 0}km</span>
                    <span class="stat">⏱️ ${Math.floor((stats.duration_seconds || 0)/60)}min</span>
                    <span class="stat">💓 ${stats.avg_heart_rate || 'N/A'}</span>
                </div>
            </div>
        `;
        this.resultContainer.innerHTML = message;

        // Auto-hide success message after 5 seconds
        setTimeout(() => this.clearResults(), 5000);
    }

    showErrorMessage(errorMessage) {
        if (!this.resultContainer) return;
        
        this.resultContainer.innerHTML = `
            <div class="upload-error">
                <div class="error-header">❌ Upload Failed</div>
                <div class="error-message">${errorMessage}</div>
            </div>
        `;
    }

    clearResults() {
        if (this.resultContainer) {
            this.resultContainer.innerHTML = '';
        }
    }

    clearFileInput() {
        if (this.fileInput) {
            this.fileInput.value = '';
        }
    }

    showLoading(message) {
        if (this.loadingElement) {
            this.loadingElement.textContent = message;
            this.loadingElement.style.display = 'block';
        }
        super.showLoading(message);
    }

    hideLoading() {
        if (this.loadingElement) {
            this.loadingElement.style.display = 'none';
        }
        super.hideLoading();
    }
}

// Global instance - will be created from index.html
let fileUpload;