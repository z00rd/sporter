// Sporter - Authentication System

class AuthManager {
    constructor() {
        this.token = null;
        this.user = null;
        this.isAuthenticated = false;
        this.isApproved = false;
        
        this.init();
    }

    init() {
        // Check for token in URL (from OAuth redirect)
        this.handleOAuthCallback();
        
        // Check for existing token in localStorage
        this.loadTokenFromStorage();
        
        // Verify token if exists
        if (this.token) {
            this.verifyToken();
        }
        
        this.setupEventListeners();
    }

    handleOAuthCallback() {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        const status = urlParams.get('status');
        const error = urlParams.get('error');
        
        if (error) {
            this.handleAuthError(error, urlParams.get('message'));
            // Clean URL
            window.history.replaceState({}, document.title, window.location.pathname);
            return;
        }
        
        if (token) {
            this.setToken(token);
            
            if (status === 'pending_approval') {
                this.showPendingApprovalMessage();
            } else if (status === 'success') {
                this.showSuccessMessage('Successfully logged in!');
            }
            
            // Clean URL
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }

    loadTokenFromStorage() {
        this.token = localStorage.getItem('sporter_auth_token');
    }

    setToken(token) {
        this.token = token;
        localStorage.setItem('sporter_auth_token', token);
    }

    removeToken() {
        this.token = null;
        this.user = null;
        this.isAuthenticated = false;
        this.isApproved = false;
        localStorage.removeItem('sporter_auth_token');
    }

    async verifyToken() {
        if (!this.token) return false;

        try {
            const response = await fetch('/api/v1/auth/me', {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (response.ok) {
                const userData = await response.json();
                this.user = userData;
                this.isAuthenticated = true;
                this.isApproved = userData.is_approved;
                
                eventBus.emit('auth:user-loaded', { user: userData });
                return true;
            } else {
                this.removeToken();
                return false;
            }
        } catch (error) {
            console.error('Token verification failed:', error);
            this.removeToken();
            return false;
        }
    }

    setupEventListeners() {
        // Listen for login button clicks
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-action="google-login"]')) {
                e.preventDefault();
                this.loginWithGoogle();
            }
            
            if (e.target.matches('[data-action="logout"]')) {
                e.preventDefault();
                this.logout();
            }
        });
    }

    loginWithGoogle() {
        window.location.href = '/api/v1/auth/google';
    }

    async logout() {
        try {
            if (this.token) {
                await fetch('/api/v1/auth/logout', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.token}`
                    }
                });
            }
        } catch (error) {
            console.error('Logout request failed:', error);
        }

        this.removeToken();
        eventBus.emit('auth:logged-out');
        this.showLoginScreen();
    }

    showLoginScreen() {
        document.body.innerHTML = `
            <div class="login-screen">
                <div class="login-container">
                    <div class="login-header">
                        <h1>🏃‍♂️ Sporter</h1>
                        <p>GPX Training Analysis Platform</p>
                    </div>
                    
                    <div class="login-content">
                        <h2>Welcome!</h2>
                        <p>Please sign in with your Google account to continue.</p>
                        
                        <button class="btn btn-google" data-action="google-login">
                            <svg width="18" height="18" viewBox="0 0 18 18">
                                <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
                                <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2.04a4.8 4.8 0 0 1-2.7.75 4.8 4.8 0 0 1-4.52-3.26H1.83v2.07A8 8 0 0 0 8.98 17z"/>
                                <path fill="#FBBC05" d="M4.46 10.51a4.8 4.8 0 0 1-.25-1.51c0-.52.09-1.03.25-1.51V5.42H1.83a8 8 0 0 0 0 7.16l2.63-2.07z"/>
                                <path fill="#EA4335" d="M8.98 4.24c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 8.98 1 8 8 0 0 0 1.83 5.42L4.46 7.5a4.77 4.77 0 0 1 4.52-3.26z"/>
                            </svg>
                            Sign in with Google
                        </button>
                    </div>
                    
                    <div class="login-footer">
                        <div class="repo-link">
                            <a href="https://github.com/z00rd/sporter" target="_blank" rel="noopener noreferrer">
                                📂 GitHub Repository
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    showPendingApprovalMessage() {
        document.body.innerHTML = `
            <div class="approval-screen">
                <div class="approval-container">
                    <div class="approval-header">
                        <h1>🏃‍♂️ Sporter</h1>
                        <p>GPX Training Analysis Platform</p>
                    </div>
                    
                    <div class="approval-content">
                        <div class="approval-icon">⏳</div>
                        <h2>Account Pending Approval</h2>
                        <p>Hello <strong>${this.user?.name || 'User'}</strong>!</p>
                        <p>Your account has been created successfully, but it requires administrator approval before you can access the platform.</p>
                        <p>Please wait for approval. You will be able to log in once your account is approved.</p>
                        
                        <button class="btn btn-secondary" data-action="logout">
                            Sign out
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    showSuccessMessage(message) {
        eventBus.emit('success-message', { message });
    }

    handleAuthError(error, message) {
        console.error('Auth error:', error, message);
        eventBus.emit('error-message', { 
            message: message || 'Authentication failed. Please try again.' 
        });
    }

    // API helper method
    async authenticatedFetch(url, options = {}) {
        if (!this.token) {
            throw new Error('Not authenticated');
        }

        const headers = {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json',
            ...options.headers
        };

        const response = await fetch(url, {
            ...options,
            headers
        });

        if (response.status === 401) {
            this.removeToken();
            this.showLoginScreen();
            throw new Error('Authentication expired');
        }

        return response;
    }

    requireApproval() {
        if (!this.isApproved) {
            throw new Error('Account not approved');
        }
    }

    getAuthHeaders() {
        if (!this.token) return {};
        return {
            'Authorization': `Bearer ${this.token}`
        };
    }
}

// Global auth manager instance
const authManager = new AuthManager();