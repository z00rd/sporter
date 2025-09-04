// Sporter - User Settings Component

class UserSettings extends Component {
    constructor() {
        super('user-settings-modal');
        this.currentUser = null;
        this.isVisible = false;
        this.validationErrors = {};
        this.backdropListenerAdded = false;
    }

    init() {
        // Override parent init since we create the modal dynamically
        // Just setup event listeners, don't look for existing element
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Listen for settings requests
        this.subscribe(Events.SHOW_USER_SETTINGS, () => {
            this.show();
        });

        // Listen for user profile changes from main app
        this.subscribe(Events.USER_PROFILE_LOADED, (data) => {
            this.currentUser = data.user;
        });

        this.subscribe(Events.USER_PROFILE_UPDATED, (data) => {
            this.currentUser = data.user;
        });

        // Close modal on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isVisible) {
                this.hide();
            }
        });
    }


    render() {
        if (!this.element) {
            this.createModal();
        }

        const user = this.currentUser || {};
        
        this.setContent(`
            <div class="modal-header">
                <h3>⚙️ Settings for ${user.name || 'User'}</h3>
                <button class="modal-close" data-action="close-settings">×</button>
            </div>
            
            <div class="modal-body">
                <!-- User Profile Form -->
                <div class="settings-section">
                    <h4>Profile Settings</h4>
                    <form id="userProfileForm" data-action="save-profile">
                        <div class="form-row">
                            <div class="form-group">
                                <label for="userName">Name: <span class="required">*</span></label>
                                <input type="text" id="userName" name="name" value="${user.name || ''}" required autocomplete="name">
                                ${this.renderFieldError('name')}
                            </div>
                            <div class="form-group">
                                <label for="userEmail">Email:</label>
                                <input type="email" id="userEmail" name="email" value="${user.email || ''}" autocomplete="email">
                                ${this.renderFieldError('email')}
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="userBirthYear">Birth Year:</label>
                                <input type="number" id="userBirthYear" name="birth_year" min="1900" max="2020" value="${user.birth_year || ''}" autocomplete="off">
                                <small class="form-hint">Used to calculate age and estimate HR Max if not provided</small>
                                ${this.renderFieldError('birth_year')}
                            </div>
                            <div class="form-group">
                                <label for="defaultActivityType">Default Activity:</label>
                                <select id="defaultActivityType" name="default_activity_type" autocomplete="off">
                                    ${this.renderActivityTypeOptions(user.default_activity_type)}
                                </select>
                            </div>
                        </div>
                        
                        <div class="hr-settings">
                            <h5>💓 Heart Rate Settings</h5>
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="hrMax">HR Max: <span class="units">(bpm)</span></label>
                                    <input type="number" id="hrMax" name="hr_max" min="120" max="220" value="${user.hr_max || ''}" autocomplete="off">
                                    <small class="form-hint">Maximum heart rate during exercise</small>
                                    ${this.renderFieldError('hr_max')}
                                </div>
                                <div class="form-group">
                                    <label for="hrResting">HR Resting: <span class="units">(bpm)</span></label>
                                    <input type="number" id="hrResting" name="hr_resting" min="30" max="100" value="${user.hr_resting || ''}" autocomplete="off">
                                    <small class="form-hint">Heart rate at rest</small>
                                    ${this.renderFieldError('hr_resting')}
                                </div>
                            </div>
                            
                            ${this.renderHRZonesPreview()}
                        </div>
                        
                        <div class="form-group">
                            <label class="checkbox-label">
                                <input type="checkbox" name="use_metric_units" ${user.use_metric_units !== false ? 'checked' : ''} autocomplete="off">
                                Use metric units (km, kg)
                            </label>
                        </div>
                    </form>
                </div>
            </div>
            
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-action="close-settings">Cancel</button>
                <button type="submit" form="userProfileForm" class="btn btn-primary">Save Settings</button>
            </div>
        `);

        this.setupFormListeners();
        this.updateHRZonesPreview();
    }

    createModal() {
        // Create modal backdrop and container if it doesn't exist
        let backdrop = document.getElementById('modal-backdrop');
        if (!backdrop) {
            backdrop = document.createElement('div');
            backdrop.id = 'modal-backdrop';
            backdrop.className = 'modal-backdrop';
            document.body.appendChild(backdrop);
        }

        // Create modal container
        const modal = document.createElement('div');
        modal.id = 'user-settings-modal';
        modal.className = 'modal';
        modal.style.backgroundColor = 'white'; // Ensure white background
        backdrop.appendChild(modal);

        this.element = modal;
        this.backdrop = backdrop;
    }

    renderUserOptions() {
        if (!this.users || this.users.length === 0) {
            return '<option value="">No users available</option>';
        }

        return this.users.map(user => 
            `<option value="${user.id}" ${this.currentUser?.id === user.id ? 'selected' : ''}>
                ${user.name} ${user.email ? `(${user.email})` : ''}
            </option>`
        ).join('');
    }

    renderActivityTypeOptions(selected = 'running') {
        return Config.ACTIVITY_TYPES.map(type => 
            `<option value="${type.value}" ${selected === type.value ? 'selected' : ''}>
                ${type.label}
            </option>`
        ).join('');
    }

    renderFieldError(fieldName) {
        const error = this.validationErrors[fieldName];
        return error ? `<div class="field-error">${error}</div>` : '';
    }

    renderHRZonesPreview() {
        const user = this.currentUser || {};
        if (!user.hr_max && !user.age) {
            return `
                <div class="hr-zones-preview">
                    <p class="zones-hint">💡 Set your HR Max or Age to see personalized training zones</p>
                </div>
            `;
        }

        return `
            <div class="hr-zones-preview">
                <h6>Training Zones Preview:</h6>
                <div id="zones-preview-content">
                    <!-- Will be populated by updateHRZonesPreview() -->
                </div>
            </div>
        `;
    }

    setupFormListeners() {
        const form = this.element.querySelector('#userProfileForm');
        const inputs = this.element.querySelectorAll('input[name="hr_max"], input[name="hr_resting"], input[name="age"]');
        
        // Update zones preview when HR values change
        inputs.forEach(input => {
            input.addEventListener('input', () => {
                this.updateHRZonesPreview();
                this.clearFieldError(input.name);
            });
        });

        // Form submission
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSaveProfile(e);
        });

        // Action handlers for buttons
        this.element.querySelectorAll('[data-action]:not(select)').forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const action = e.target.dataset.action;
                switch (action) {
                    case 'close-settings':
                        this.hide();
                        break;
                }
            });
        });


        // Close modal when clicking backdrop (add only once)
        if (!this.backdropListenerAdded && this.backdrop) {
            this.backdrop.addEventListener('click', (e) => {
                if (e.target === this.backdrop) {
                    this.hide();
                }
            });
            this.backdropListenerAdded = true;
        }
    }

    updateHRZonesPreview() {
        const previewContainer = this.element.querySelector('#zones-preview-content');
        if (!previewContainer) return;

        const hrMaxInput = this.element.querySelector('#hrMax');
        const hrRestingInput = this.element.querySelector('#hrResting');
        const ageInput = this.element.querySelector('#userAge');

        let hrMax = parseInt(hrMaxInput?.value);
        const hrResting = parseInt(hrRestingInput?.value) || 60;
        const age = parseInt(ageInput?.value);

        // Calculate estimated HR Max if not provided
        if (!hrMax && age) {
            hrMax = 220 - age;
        }

        if (!hrMax) {
            previewContainer.innerHTML = '<p class="zones-hint">Enter HR Max or Age to see zones</p>';
            return;
        }

        const zones = Config.calculateHRZones(hrMax, hrResting);

        previewContainer.innerHTML = `
            <div class="zones-preview-grid">
                ${Object.values(zones).map(zone => `
                    <div class="zone-preview" style="border-left: 4px solid ${zone.color}">
                        <div class="zone-name">${zone.name}</div>
                        <div class="zone-range">${zone.min}-${zone.max} bpm</div>
                    </div>
                `).join('')}
            </div>
            <div class="zones-summary">
                <small>Based on HR Max: ${hrMax} bpm, HR Resting: ${hrResting} bpm</small>
            </div>
        `;
    }

    async handleSaveProfile(e) {
        const formData = new FormData(e.target);
        const userData = {};
        
        // Convert form data to object
        for (const [key, value] of formData.entries()) {
            if (key === 'use_metric_units') {
                userData[key] = true; // Checkbox is checked
            } else if (value.trim()) {
                // Convert numeric fields
                if (['age', 'hr_max', 'hr_resting'].includes(key)) {
                    userData[key] = parseInt(value);
                } else {
                    userData[key] = value.trim();
                }
            }
        }

        // Add unchecked checkbox as false
        if (!formData.has('use_metric_units')) {
            userData.use_metric_units = false;
        }

        try {
            this.clearAllErrors();
            this.showLoading('Saving profile...');

            let savedUser;
            if (this.currentUser?.id) {
                // Update existing user
                savedUser = await api.updateUser(this.currentUser.id, userData);
            } else {
                // Create new user
                savedUser = await api.createUser(userData);
            }

            this.currentUser = savedUser;
            this.emit(Events.USER_PROFILE_UPDATED, { user: savedUser });
            this.emit(Events.SUCCESS_MESSAGE, { message: 'Profile saved successfully!' });
            
            this.hide();

        } catch (error) {
            this.handleError(error, ' while saving profile');
            
            if (error instanceof ApiError && error.status === 400 && error.data) {
                this.handleValidationErrors(error.data);
            }
        } finally {
            this.hideLoading();
        }
    }

    async handleCreateUser() {
        try {
            const name = prompt('Enter name for new user:');
            if (!name) return;

            const newUser = await api.createUser({ name: name.trim() });
            
            // Reload users list
            await this.loadUsers();
            this.currentUser = newUser;
            
            // Re-render to show new user
            this.render();
            
            this.emit(Events.USER_PROFILE_UPDATED, { user: newUser });
            this.emit(Events.SUCCESS_MESSAGE, { message: `Created user: ${newUser.name}` });

        } catch (error) {
            this.handleError(error, ' while creating user');
        }
    }

    async handleUserChange(userId) {
        if (!userId) return;

        try {
            this.showLoading('Switching user...');
            
            const user = await api.getUser(userId);
            this.currentUser = user;
            
            // Re-render with new user data
            this.render();
            
            this.emit(Events.USER_PROFILE_UPDATED, { user });
            this.emit(Events.SUCCESS_MESSAGE, { message: `Switched to: ${user.name}` });

        } catch (error) {
            this.handleError(error, ' while switching user');
        } finally {
            this.hideLoading();
        }
    }

    handleValidationErrors(errorData) {
        // Handle FastAPI validation errors
        if (errorData.detail && Array.isArray(errorData.detail)) {
            errorData.detail.forEach(err => {
                const fieldName = err.loc[err.loc.length - 1]; // Get last part of location path
                this.validationErrors[fieldName] = err.msg;
            });
        } else if (typeof errorData.detail === 'string') {
            this.validationErrors.general = errorData.detail;
        }
        
        // Re-render to show errors
        this.render();
    }

    clearFieldError(fieldName) {
        if (this.validationErrors[fieldName]) {
            delete this.validationErrors[fieldName];
            // Re-render the specific field error
            const errorEl = this.element.querySelector(`[name="${fieldName}"]`)?.parentNode?.querySelector('.field-error');
            if (errorEl) {
                errorEl.remove();
            }
        }
    }

    clearAllErrors() {
        this.validationErrors = {};
    }

    show() {
        // Always render to ensure current user data is shown
        this.render();
        
        if (this.backdrop) {
            this.backdrop.style.display = 'flex';
        }
        this.isVisible = true;
        
        // Focus first input
        setTimeout(() => {
            const firstInput = this.element.querySelector('input');
            if (firstInput) firstInput.focus();
        }, 100);
    }

    hide() {
        if (this.backdrop) {
            this.backdrop.style.display = 'none';
        }
        this.isVisible = false;
        this.clearAllErrors();
    }

    getCurrentUser() {
        return this.currentUser;
    }

    destroy() {
        this.hide();
        if (this.backdrop) {
            this.backdrop.remove();
        }
        super.destroy();
    }
}

// Global instance - will be created from index.html
let userSettings;