/**
 * Authentication Service
 *
 * Provides authentication operations (login, register, logout)
 * and integrates with AuthContext and API client.
 *
 * Based on plan.md frontend architecture for User Story 1
 */

import { auth as authAPI, configureAuth } from './api';

/**
 * AuthService class
 * Handles all authentication-related operations
 */
class AuthService {
  constructor() {
    this.authContext = null;
  }

  /**
   * Initialize with AuthContext
   * Must be called before using the service
   */
  initialize(authContext) {
    this.authContext = authContext;

    // Configure API client with auth token getter and error handler
    configureAuth(
      () => this.authContext?.token,
      () => this.authContext?.handleAuthError()
    );
  }

  /**
   * Register a new user
   */
  async register(email, password, name) {
    try {
      const response = await authAPI.register(email, password, name);

      return {
        success: true,
        user: response
      };
    } catch (error) {
      return {
        success: false,
        error: error.error || 'Registration failed',
        details: error.details || error.message
      };
    }
  }

  /**
   * Login with email and password
   */
  async login(email, password) {
    try {
      const response = await authAPI.login(email, password);

      // Store token and user in context
      if (this.authContext && response.token && response.user) {
        this.authContext.login(response.token, response.user);

        // Fetch full user data including organizations using the token directly
        try {
          const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
          const userResponse = await fetch(`${API_URL}/api/auth/me`, {
            headers: {
              'Authorization': `Bearer ${response.token}`
            }
          });

          if (userResponse.ok) {
            const userData = await userResponse.json();
            this.authContext.updateUser(userData);
          }
        } catch (fetchErr) {
          console.error('Failed to fetch user organizations:', fetchErr);
          // Continue even if this fails
        }
      }

      return {
        success: true,
        token: response.token,
        user: response.user,
        expiresIn: response.expiresIn
      };
    } catch (error) {
      return {
        success: false,
        error: error.error || 'Login failed',
        details: error.details || error.message
      };
    }
  }

  /**
   * Logout current user
   */
  logout() {
    if (this.authContext) {
      this.authContext.logout();
    }
  }

  /**
   * Get current user info from server
   * Useful for refreshing user data and organizations
   */
  async getCurrentUser() {
    try {
      const response = await authAPI.me();

      // Update user in context with fresh data
      if (this.authContext && response) {
        this.authContext.updateUser(response);
      }

      return {
        success: true,
        user: response
      };
    } catch (error) {
      // If we get a 401, the token is invalid
      if (error.status === 401) {
        this.logout();
      }

      return {
        success: false,
        error: error.error || 'Failed to get user info',
        details: error.details || error.message
      };
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return this.authContext?.isAuthenticated || false;
  }

  /**
   * Get current user
   */
  getUser() {
    return this.authContext?.user || null;
  }

  /**
   * Get current token
   */
  getToken() {
    return this.authContext?.token || null;
  }

  /**
   * Validate email format
   */
  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate password strength
   */
  validatePassword(password) {
    const errors = [];

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate registration data
   */
  validateRegistration(email, password, name) {
    const errors = [];

    if (!name || name.trim().length === 0) {
      errors.push('Name is required');
    }

    if (!email || !this.validateEmail(email)) {
      errors.push('Valid email address is required');
    }

    const passwordValidation = this.validatePassword(password);
    if (!passwordValidation.valid) {
      errors.push(...passwordValidation.errors);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate login data
   */
  validateLogin(email, password) {
    const errors = [];

    if (!email || !this.validateEmail(email)) {
      errors.push('Valid email address is required');
    }

    if (!password || password.length === 0) {
      errors.push('Password is required');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

// Create singleton instance
const authService = new AuthService();

export default authService;
