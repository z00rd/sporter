// Sporter - Users Management Page

class UsersPage extends Page {
    constructor() {
        super('users');
        
        // Initialize properties after calling super()
        this.users = [];
        this.currentUser = null;
        this.isLoading = false;
        
        // Now manually call init with properties set up
        this.init();
    }

    init() {
        this.render();
        this.loadUsers();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Listen for user profile updates
        this.subscribe(Events.USER_PROFILE_UPDATED, (data) => {
            this.currentUser = data.user;
            this.loadUsers(); // Refresh the list
        });
    }

    renderContent() {
        this.setContent(`
            <div class="users-page">
                <div class="page-header">
                    <h1>👥 User Management</h1>
                    <p>Manage user profiles and switch between different users</p>
                    
                    <div class="header-actions">
                        <button class="btn btn-primary" data-action="add-user">
                            ➕ Add New User
                        </button>
                    </div>
                </div>

                <div class="users-content">
                    <div class="current-user-section">
                        <h2>Current Active User</h2>
                        <div id="current-user-card" class="user-card current">
                            ${this.renderCurrentUserCard()}
                        </div>
                    </div>

                    <div class="all-users-section">
                        <h2>All Users</h2>
                        <div id="users-list" class="users-grid">
                            ${this.isLoading ? this.renderLoadingState() : this.renderUsersList()}
                        </div>
                    </div>
                </div>

                <!-- Add User Modal -->
                <div id="add-user-modal" class="modal-backdrop" style="display: none;">
                    <div class="modal">
                        <div class="modal-header">
                            <h3>➕ Add New User</h3>
                            <button class="modal-close" data-action="close-add-user">×</button>
                        </div>
                        <div class="modal-body">
                            <form id="add-user-form">
                                <div class="form-group">
                                    <label for="new-user-name">Name: <span class="required">*</span></label>
                                    <input type="text" id="new-user-name" name="name" required autocomplete="name">
                                </div>
                                <div class="form-group">
                                    <label for="new-user-email">Email:</label>
                                    <input type="email" id="new-user-email" name="email" autocomplete="email">
                                </div>
                                <div class="form-group">
                                    <label for="new-user-activity-type">Default Activity:</label>
                                    <select id="new-user-activity-type" name="default_activity_type">
                                        <option value="running">🏃‍♂️ Running</option>
                                        <option value="cycling">🚴‍♂️ Cycling</option>
                                        <option value="swimming">🏊‍♂️ Swimming</option>
                                        <option value="walking">🚶‍♂️ Walking</option>
                                        <option value="hiking">🥾 Hiking</option>
                                        <option value="skiing">⛷️ Skiing</option>
                                        <option value="paddling">🚣‍♂️ Paddling</option>
                                    </select>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-action="close-add-user">Cancel</button>
                            <button type="submit" form="add-user-form" class="btn btn-primary">Create User</button>
                        </div>
                    </div>
                </div>
            </div>
        `);

        this.setupPageEventListeners();
    }

    setupPageEventListeners() {
        // Add user button
        this.element.querySelector('[data-action="add-user"]')?.addEventListener('click', () => {
            this.showAddUserModal();
        });

        // Close modal buttons
        this.element.querySelectorAll('[data-action="close-add-user"]').forEach(btn => {
            btn.addEventListener('click', () => {
                this.hideAddUserModal();
            });
        });

        // Add user form submission
        this.element.querySelector('#add-user-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAddUser(e);
        });

        // User action buttons (switch/delete)
        this.element.addEventListener('click', (e) => {
            if (e.target.dataset.action === 'switch-user') {
                const userId = parseInt(e.target.dataset.userId);
                this.handleSwitchUser(userId);
            } else if (e.target.dataset.action === 'delete-user') {
                const userId = parseInt(e.target.dataset.userId);
                const userName = e.target.dataset.userName;
                this.handleDeleteUser(userId, userName);
            } else if (e.target.dataset.action === 'edit-user') {
                const userId = parseInt(e.target.dataset.userId);
                this.handleEditUser(userId);
            }
        });

        // Close modal when clicking backdrop
        this.element.querySelector('#add-user-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'add-user-modal') {
                this.hideAddUserModal();
            }
        });
    }

    renderCurrentUserCard() {
        if (!this.currentUser) {
            return '<div class="loading">Loading current user...</div>';
        }

        const user = this.currentUser;
        return `
            <div class="user-info">
                <div class="user-avatar">${user.name.charAt(0).toUpperCase()}</div>
                <div class="user-details">
                    <h3>${user.name}</h3>
                    <p class="user-email">${user.email || 'No email set'}</p>
                    <div class="user-meta">
                        <span class="activity-type">📊 ${user.default_activity_type}</span>
                        <span class="hr-info">
                            ${user.hr_max ? `💓 HR Max: ${user.hr_max}` : 'No HR Max set'}
                        </span>
                    </div>
                </div>
                <div class="user-actions">
                    <button class="btn btn-secondary" data-action="edit-user" data-user-id="${user.id}">
                        ✏️ Edit
                    </button>
                </div>
            </div>
        `;
    }

    renderUsersList() {
        if (this.users.length === 0) {
            return `
                <div class="empty-state">
                    <h3>No users found</h3>
                    <p>Create your first user to get started</p>
                    <button class="btn btn-primary" data-action="add-user">➕ Add First User</button>
                </div>
            `;
        }

        return this.users.map(user => this.renderUserCard(user)).join('');
    }

    renderUserCard(user) {
        const isCurrentUser = this.currentUser?.id === user.id;
        
        return `
            <div class="user-card ${isCurrentUser ? 'current' : ''}">
                <div class="user-info">
                    <div class="user-avatar">${user.name.charAt(0).toUpperCase()}</div>
                    <div class="user-details">
                        <h3>${user.name} ${isCurrentUser ? '<span class="current-badge">Current</span>' : ''}</h3>
                        <p class="user-email">${user.email || 'No email'}</p>
                        <div class="user-meta">
                            <span class="activity-type">📊 ${user.default_activity_type}</span>
                            ${user.hr_max ? `<span class="hr-info">💓 ${user.hr_max}</span>` : ''}
                        </div>
                    </div>
                </div>
                <div class="user-actions">
                    ${!isCurrentUser ? `
                        <button class="btn btn-primary btn-sm" data-action="switch-user" data-user-id="${user.id}">
                            🔄 Switch To
                        </button>
                    ` : ''}
                    <button class="btn btn-secondary btn-sm" data-action="edit-user" data-user-id="${user.id}">
                        ✏️ Edit
                    </button>
                    <button class="btn btn-danger btn-sm" data-action="delete-user" data-user-id="${user.id}" data-user-name="${user.name}">
                        🗑️ Delete
                    </button>
                </div>
            </div>
        `;
    }

    renderLoadingState() {
        return `
            <div class="loading-state">
                <div class="loading-spinner"></div>
                <p>Loading users...</p>
            </div>
        `;
    }

    async loadUsers() {
        try {
            this.isLoading = true;
            this.updateUsersListDisplay();

            const [usersData, currentUserData] = await Promise.all([
                api.getUsers(),
                api.getDefaultUser()
            ]);

            this.users = usersData;
            this.currentUser = currentUserData;

        } catch (error) {
            this.handleError(error, ' while loading users');
        } finally {
            this.isLoading = false;
            this.updateUsersListDisplay();
            this.updateCurrentUserDisplay();
        }
    }

    updateUsersListDisplay() {
        const container = this.element.querySelector('#users-list');
        if (container) {
            container.innerHTML = this.isLoading ? this.renderLoadingState() : this.renderUsersList();
        }
    }

    updateCurrentUserDisplay() {
        const container = this.element.querySelector('#current-user-card');
        if (container) {
            container.innerHTML = this.renderCurrentUserCard();
        }
    }

    showAddUserModal() {
        const modal = this.element.querySelector('#add-user-modal');
        if (modal) {
            modal.style.display = 'flex';
            // Focus first input
            setTimeout(() => {
                const firstInput = modal.querySelector('input');
                if (firstInput) firstInput.focus();
            }, 100);
        }
    }

    hideAddUserModal() {
        const modal = this.element.querySelector('#add-user-modal');
        if (modal) {
            modal.style.display = 'none';
            // Reset form
            const form = modal.querySelector('#add-user-form');
            if (form) form.reset();
        }
    }

    async handleAddUser(e) {
        const formData = new FormData(e.target);
        const userData = {
            name: formData.get('name').trim(),
            email: formData.get('email').trim() || null,
            default_activity_type: formData.get('default_activity_type')
        };

        if (!userData.name) {
            alert('Name is required');
            return;
        }

        try {
            this.showLoading('Creating user...');
            const newUser = await api.createUser(userData);
            
            this.hideAddUserModal();
            await this.loadUsers(); // Refresh the list
            
            this.emit(Events.SUCCESS_MESSAGE, { 
                message: `User "${newUser.name}" created successfully!` 
            });

        } catch (error) {
            this.handleError(error, ' while creating user');
        } finally {
            this.hideLoading();
        }
    }

    async handleSwitchUser(userId) {
        try {
            this.showLoading('Switching user...');
            const user = await api.getUser(userId);
            
            this.currentUser = user;
            this.updateCurrentUserDisplay();
            this.updateUsersListDisplay();
            
            // Emit user profile updated event
            this.emit(Events.USER_PROFILE_UPDATED, { user });
            this.emit(Events.SUCCESS_MESSAGE, { 
                message: `Switched to user: ${user.name}` 
            });

        } catch (error) {
            this.handleError(error, ' while switching user');
        } finally {
            this.hideLoading();
        }
    }

    async handleDeleteUser(userId, userName) {
        const confirmed = confirm(`Are you sure you want to delete user "${userName}"?\n\nThis action cannot be undone and will remove all associated data.`);
        
        if (!confirmed) return;

        try {
            this.showLoading('Deleting user...');
            await api.deleteUser(userId);
            
            // If deleted user was current user, switch to another user
            if (this.currentUser?.id === userId) {
                const remainingUsers = this.users.filter(u => u.id !== userId);
                if (remainingUsers.length > 0) {
                    await this.handleSwitchUser(remainingUsers[0].id);
                } else {
                    // No users left, could create a default user or handle appropriately
                    this.currentUser = null;
                }
            }
            
            await this.loadUsers(); // Refresh the list
            
            this.emit(Events.SUCCESS_MESSAGE, { 
                message: `User "${userName}" deleted successfully` 
            });

        } catch (error) {
            this.handleError(error, ' while deleting user');
        } finally {
            this.hideLoading();
        }
    }

    async handleEditUser(userId) {
        // Show user settings modal for this user
        try {
            const user = await api.getUser(userId);
            
            // Set this user as current for the settings modal
            this.emit(Events.USER_PROFILE_LOADED, { user });
            this.emit(Events.SHOW_USER_SETTINGS);
            
        } catch (error) {
            this.handleError(error, ' while loading user for editing');
        }
    }

    onShow() {
        // Refresh users list when page becomes visible
        this.loadUsers();
    }

    onHide() {
        // Hide any open modals
        this.hideAddUserModal();
    }
}

// Global instance - will be created from page router
let usersPage;