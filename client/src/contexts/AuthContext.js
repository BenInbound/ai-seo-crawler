/**
 * AuthContext - User Authentication State Management
 *
 * Provides authentication state and operations throughout the application.
 * Manages user session, JWT tokens, and authentication status.
 *
 * Based on plan.md frontend architecture for User Story 1
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// Create the context
const AuthContext = createContext(null);

/**
 * AuthProvider Component
 * Wraps the application to provide authentication state
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize auth state from localStorage on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedToken = localStorage.getItem('auth_token');
        const storedUser = localStorage.getItem('auth_user');

        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));

          // Fetch fresh user data with organizations from server
          try {
            const API_URL = process.env.REACT_APP_API_URL ||
              (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3001');
            const response = await fetch(`${API_URL}/api/auth/me`, {
              headers: {
                'Authorization': `Bearer ${storedToken}`
              }
            });

            if (response.ok) {
              const userData = await response.json();
              setUser(userData);
              localStorage.setItem('auth_user', JSON.stringify(userData));
            }
          } catch (fetchErr) {
            console.error('Failed to fetch fresh user data:', fetchErr);
            // Continue with cached data if fetch fails
          }
        }
      } catch (err) {
        console.error('Failed to initialize auth:', err);
        // Clear invalid data
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  /**
   * Login function
   * Stores token and user data in state and localStorage
   */
  const login = useCallback((authToken, userData) => {
    try {
      setToken(authToken);
      setUser(userData);
      localStorage.setItem('auth_token', authToken);
      localStorage.setItem('auth_user', JSON.stringify(userData));
      setError(null);
    } catch (err) {
      console.error('Failed to save auth data:', err);
      setError('Failed to save authentication data');
    }
  }, []);

  /**
   * Logout function
   * Clears all authentication data
   */
  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    setError(null);
  }, []);

  /**
   * Update user data
   * Updates user information without changing token
   */
  const updateUser = useCallback(userData => {
    try {
      setUser(userData);
      localStorage.setItem('auth_user', JSON.stringify(userData));
    } catch (err) {
      console.error('Failed to update user data:', err);
      setError('Failed to update user data');
    }
  }, []);

  /**
   * Check if user is authenticated
   */
  const isAuthenticated = Boolean(token && user);

  /**
   * Get authorization header value
   */
  const getAuthHeader = useCallback(() => {
    return token ? `Bearer ${token}` : null;
  }, [token]);

  /**
   * Handle authentication errors (e.g., 401 from API)
   * Clears auth state and redirects to login
   */
  const handleAuthError = useCallback(() => {
    logout();
  }, [logout]);

  const value = {
    user,
    token,
    loading,
    error,
    isAuthenticated,
    login,
    logout,
    updateUser,
    getAuthHeader,
    handleAuthError
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * useAuth Hook
 * Access authentication context in any component
 */
export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}

export default AuthContext;
