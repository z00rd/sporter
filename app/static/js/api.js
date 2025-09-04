// Sporter - API Client with proper error handling

class ApiClient {
    constructor() {
        this.baseUrl = Config.API_BASE_URL;
        this.timeout = Config.API_TIMEOUT;
    }

    async _request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);
        
        try {
            // Don't set default headers if they were explicitly deleted (e.g., for FormData)
            const headers = options.headers === undefined 
                ? {} 
                : { 'Content-Type': 'application/json', ...options.headers };
                
            const response = await fetch(url, {
                ...options,
                signal: controller.signal,
                headers
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new ApiError(
                    errorData.detail || `HTTP ${response.status}: ${response.statusText}`,
                    response.status,
                    errorData
                );
            }
            
            return await response.json();
        } catch (error) {
            clearTimeout(timeoutId);
            
            if (error.name === 'AbortError') {
                throw new ApiError('Request timeout', 408);
            }
            
            if (error instanceof ApiError) {
                throw error;
            }
            
            throw new ApiError(`Network error: ${error.message}`, 0);
        }
    }

    async get(endpoint) {
        return this._request(endpoint);
    }

    async post(endpoint, data) {
        const options = {
            method: 'POST'
        };

        if (data instanceof FormData) {
            // Don't set Content-Type for FormData, let browser handle it
            delete options.headers;
            options.body = data;
        } else {
            options.body = JSON.stringify(data);
        }

        return this._request(endpoint, options);
    }

    // Activity endpoints
    async getActivities(userId = null) {
        const params = userId ? `?user_id=${userId}` : '';
        return this.get(`/activities/${params}`);
    }

    async getActivity(id) {
        return this.get(`/activities/${id}`);
    }

    async uploadActivity(formData) {
        return this.post('/activities/upload', formData);
    }

    async getTrackpoints(activityId, limit = null) {
        const params = limit ? `?limit=${limit}` : '';
        return this.get(`/activities/${activityId}/trackpoints${params}`);
    }

    async getHeartRateData(activityId) {
        return this.get(`/activities/${activityId}/heart-rate`);
    }

    async getElevationData(activityId) {
        return this.get(`/activities/${activityId}/elevation`);
    }

    async clearHRExclusions(activityId) {
        return this.post(`/activities/${activityId}/hr-exclusions/clear`);
    }

    async reapplyHRExclusions(activityId) {
        return this.post(`/activities/${activityId}/hr-exclusions/reapply`);
    }

    // Exclusion Range methods
    async getExclusionRanges(activityId) {
        return this.get(`/activities/${activityId}/hr-exclusions/ranges`);
    }

    async createExclusionRange(activityId, rangeData) {
        return this.post(`/activities/${activityId}/hr-exclusions/ranges`, rangeData);
    }

    async deleteExclusionRange(activityId, rangeId) {
        return this.delete(`/activities/${activityId}/hr-exclusions/ranges/${rangeId}`);
    }

    async deleteActivity(activityId) {
        return this.delete(`/activities/${activityId}`);
    }

    // User endpoints
    async getUsers() {
        return this.get('/users/');
    }

    async getUser(userId) {
        return this.get(`/users/${userId}`);
    }

    async createUser(userData) {
        return this.post('/users/', userData);
    }

    async updateUser(userId, userData) {
        return this.put(`/users/${userId}`, userData);
    }

    async deleteUser(userId) {
        return this.delete(`/users/${userId}`);
    }

    async getUserHRZones(userId) {
        return this.get(`/users/${userId}/hr-zones`);
    }

    async getDefaultUser() {
        return this.get('/users/default/profile');
    }

    async put(endpoint, data) {
        return this._request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async delete(endpoint) {
        return this._request(endpoint, {
            method: 'DELETE'
        });
    }
}

class ApiError extends Error {
    constructor(message, status, data = null) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.data = data;
    }

    isNetworkError() {
        return this.status === 0;
    }

    isTimeout() {
        return this.status === 408;
    }

    isServerError() {
        return this.status >= 500;
    }

    isClientError() {
        return this.status >= 400 && this.status < 500;
    }
}

// Export singleton instance
const api = new ApiClient();