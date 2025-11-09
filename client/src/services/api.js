/**
 * API Client with Authentication
 *
 * Centralized HTTP client for making API requests with automatic auth header injection.
 * Handles authentication, error handling, and response formatting.
 *
 * Based on plan.md frontend architecture for User Story 1
 */

import axios from 'axios';

// API base URL - defaults to local development
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

/**
 * Create axios instance with default configuration
 */
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 30000 // 30 seconds
});

/**
 * Store auth token retrieval function
 * This will be set by the auth service
 */
let getAuthToken = null;

/**
 * Store auth error handler function
 * This will be set by the auth service
 */
let handleAuthError = null;

/**
 * Configure authentication
 * Called by auth service to provide token getter and error handler
 */
export function configureAuth(tokenGetter, errorHandler) {
  getAuthToken = tokenGetter;
  handleAuthError = errorHandler;
}

/**
 * Request interceptor
 * Automatically adds auth header to all requests
 */
apiClient.interceptors.request.use(
  config => {
    // Add auth token if available
    if (getAuthToken) {
      const token = getAuthToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

/**
 * Response interceptor
 * Handles common errors and authentication failures
 */
apiClient.interceptors.response.use(
  response => {
    // Return response data directly
    return response;
  },
  error => {
    // Handle authentication errors
    if (error.response?.status === 401) {
      if (handleAuthError) {
        handleAuthError();
      }
    }

    // Handle network errors
    if (!error.response) {
      return Promise.reject({
        error: 'Network Error',
        details: 'Unable to connect to the server. Please check your internet connection.',
        isNetworkError: true
      });
    }

    // Format error response
    const formattedError = {
      status: error.response.status,
      error: error.response.data?.error || 'An error occurred',
      details: error.response.data?.details || error.message,
      data: error.response.data
    };

    return Promise.reject(formattedError);
  }
);

/**
 * HTTP Methods
 */

export async function get(url, config = {}) {
  const response = await apiClient.get(url, config);
  return response.data;
}

export async function post(url, data = {}, config = {}) {
  const response = await apiClient.post(url, data, config);
  return response.data;
}

export async function put(url, data = {}, config = {}) {
  const response = await apiClient.put(url, data, config);
  return response.data;
}

export async function patch(url, data = {}, config = {}) {
  const response = await apiClient.patch(url, data, config);
  return response.data;
}

export async function del(url, config = {}) {
  const response = await apiClient.delete(url, config);
  return response.data;
}

/**
 * API Endpoints organized by resource
 */

// Authentication endpoints
export const auth = {
  register: (email, password, name) => post('/auth/register', { email, password, name }),
  login: (email, password) => post('/auth/login', { email, password }),
  me: () => get('/auth/me')
};

// Organization endpoints
export const organizations = {
  list: () => get('/organizations'),
  create: data => post('/organizations', data),
  get: orgId => get(`/organizations/${orgId}`),
  update: (orgId, data) => patch(`/organizations/${orgId}`, data),
  delete: orgId => del(`/organizations/${orgId}`)
};

// Organization member endpoints
export const members = {
  list: orgId => get(`/organizations/${orgId}/members`),
  add: (orgId, email, role) => post(`/organizations/${orgId}/members`, { email, role }),
  updateRole: (orgId, userId, role) => patch(`/organizations/${orgId}/members/${userId}`, { role }),
  remove: (orgId, userId) => del(`/organizations/${orgId}/members/${userId}`)
};

// Project endpoints
export const projects = {
  listAll: (params = {}) => get('/projects', { params }),
  list: (orgId, params = {}) => get(`/organizations/${orgId}/projects`, { params }),
  create: (orgId, data) => post(`/organizations/${orgId}/projects`, data),
  get: projectId => get(`/projects/${projectId}`),
  update: (projectId, data) => patch(`/projects/${projectId}`, data),
  delete: projectId => del(`/projects/${projectId}`)
};

/**
 * Crawl API endpoints
 */
export const crawls = {
  start: (projectId, data) => post(`/projects/${projectId}/crawls`, data),
  list: (projectId, params = {}) => get(`/projects/${projectId}/crawls`, { params }),
  get: crawlId => get(`/crawls/${crawlId}`),
  pause: crawlId => post(`/crawls/${crawlId}/pause`),
  resume: crawlId => post(`/crawls/${crawlId}/resume`)
};

/**
 * Export the configured axios instance for advanced use cases
 */
export default apiClient;
