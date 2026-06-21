const API_BASE = window.location.origin + '/api';

const api = {
  // Token management
  getToken() {
    return localStorage.getItem('token');
  },
  
  setToken(token) {
    localStorage.setItem('token', token);
  },
  
  clearToken() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  getCurrentUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  setCurrentUser(user) {
    localStorage.setItem('user', JSON.stringify(user));
  },

  // Headers builder
  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  },

  // HTTP Request Wrappers
  async get(endpoint) {
    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'GET',
        headers: this.getHeaders()
      });
      return await this.handleResponse(response);
    } catch (error) {
      console.error(`GET ${endpoint} failed:`, error);
      throw error;
    }
  },

  async post(endpoint, data) {
    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(data)
      });
      return await this.handleResponse(response);
    } catch (error) {
      console.error(`POST ${endpoint} failed:`, error);
      throw error;
    }
  },

  async put(endpoint, data) {
    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(data)
      });
      return await this.handleResponse(response);
    } catch (error) {
      console.error(`PUT ${endpoint} failed:`, error);
      throw error;
    }
  },

  async delete(endpoint) {
    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'DELETE',
        headers: this.getHeaders()
      });
      return await this.handleResponse(response);
    } catch (error) {
      console.error(`DELETE ${endpoint} failed:`, error);
      throw error;
    }
  },

  // Response Handler
  async handleResponse(response) {
    const isJson = response.headers.get('content-type')?.includes('application/json');
    const data = isJson ? await response.json() : null;

    if (!response.ok) {
      // Handle session expiry
      if (response.status === 401 && this.getToken()) {
        this.clearToken();
        showNotification('Session expired. Redirecting to login...', 'error');
        setTimeout(() => {
          window.location.href = '/auth.html';
        }, 1500);
      }
      
      const errorMsg = (data && data.message) || response.statusText;
      const error = new Error(errorMsg);
      error.status = response.status;
      error.needsVerification = data?.needsVerification || false;
      error.email = data?.email || null;
      throw error;
    }

    return data;
  }
};

// UI Toast Notification helper
function showNotification(message, type = 'success') {
  // Remove existing notifications first
  const existing = document.querySelectorAll('.notification-toast');
  existing.forEach(e => e.remove());

  const toast = document.createElement('div');
  toast.className = `notification-toast ${type}`;
  
  // Set icon based on type
  let icon = '✔';
  if (type === 'error') icon = '❌';
  if (type === 'warning') icon = '⚠';

  toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
  document.body.appendChild(toast);

  // Automatically fade out
  setTimeout(() => {
    toast.style.transition = 'opacity 0.5s ease';
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 500);
  }, 4000);
}

// Format Date Utility
function formatDate(dateString, includeTime = false) {
  if (!dateString) return 'N/A';
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  if (includeTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
  }
  return new Date(dateString).toLocaleDateString(undefined, options);
}

// Check logged in user and routing redirects if unauthorized
function checkAuthRedirect(allowedRoles = []) {
  const user = api.getCurrentUser();
  const token = api.getToken();

  if (!token || !user) {
    api.clearToken();
    window.location.href = '/auth.html';
    return null;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    showNotification('Unauthorized access redirection', 'error');
    if (user.role === 'admin') window.location.href = '/admin_dashboard.html';
    else if (user.role === 'instructor') window.location.href = '/instructor_dashboard.html';
    else window.location.href = '/student_dashboard.html';
    return null;
  }

  return user;
}
