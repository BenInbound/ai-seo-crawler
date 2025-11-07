/**
 * OrgContext - Organization and Project State Management
 *
 * Manages current organization and project selection across the application.
 * Handles organization switching and project context.
 *
 * Based on plan.md frontend architecture for User Story 1
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';

// Create the context
const OrgContext = createContext(null);

/**
 * OrgProvider Component
 * Wraps the application to provide organization/project state
 */
export function OrgProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const [currentOrg, setCurrentOrg] = useState(null);
  const [currentProject, setCurrentProject] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [loading] = useState(false); // Reserved for future async operations
  const [error, setError] = useState(null);

  // Initialize org state from localStorage and user data
  useEffect(() => {
    if (isAuthenticated && user) {
      try {
        // Load organizations from user data
        if (user.organizations && user.organizations.length > 0) {
          setOrganizations(user.organizations);

          // Try to restore previously selected org from localStorage
          const storedOrgId = localStorage.getItem('current_org_id');
          const storedOrg = user.organizations.find(org => org.id === storedOrgId);

          if (storedOrg) {
            setCurrentOrg(storedOrg);
          } else {
            // Default to first organization if no stored selection
            setCurrentOrg(user.organizations[0]);
          }
        }

        // Try to restore current project from localStorage
        const storedProjectId = localStorage.getItem('current_project_id');
        if (storedProjectId) {
          // Note: We'll need to fetch project details from API
          // For now, just store the ID
          setCurrentProject({ id: storedProjectId });
        }
      } catch (err) {
        console.error('Failed to initialize org context:', err);
        setError('Failed to initialize organization context');
      }
    } else {
      // Clear org state when user logs out
      setCurrentOrg(null);
      setCurrentProject(null);
      setOrganizations([]);
    }
  }, [isAuthenticated, user]);

  /**
   * Switch to a different organization
   */
  const switchOrganization = useCallback(
    orgId => {
      const org = organizations.find(o => o.id === orgId);

      if (!org) {
        setError('Organization not found');
        return false;
      }

      try {
        setCurrentOrg(org);
        localStorage.setItem('current_org_id', org.id);

        // Clear current project when switching organizations
        setCurrentProject(null);
        localStorage.removeItem('current_project_id');

        setError(null);
        return true;
      } catch (err) {
        console.error('Failed to switch organization:', err);
        setError('Failed to switch organization');
        return false;
      }
    },
    [organizations]
  );

  /**
   * Set current project
   */
  const selectProject = useCallback(project => {
    try {
      setCurrentProject(project);
      if (project) {
        localStorage.setItem('current_project_id', project.id);
      } else {
        localStorage.removeItem('current_project_id');
      }
      setError(null);
    } catch (err) {
      console.error('Failed to select project:', err);
      setError('Failed to select project');
    }
  }, []);

  /**
   * Clear current project selection
   */
  const clearProject = useCallback(() => {
    setCurrentProject(null);
    localStorage.removeItem('current_project_id');
  }, []);

  /**
   * Refresh organizations list
   * Useful after creating a new organization
   */
  const refreshOrganizations = useCallback(
    newOrgList => {
      if (newOrgList && Array.isArray(newOrgList)) {
        setOrganizations(newOrgList);

        // If current org is not in the new list, switch to first org
        if (currentOrg && !newOrgList.find(org => org.id === currentOrg.id)) {
          if (newOrgList.length > 0) {
            switchOrganization(newOrgList[0].id);
          } else {
            setCurrentOrg(null);
          }
        }
      }
    },
    [currentOrg, switchOrganization]
  );

  /**
   * Get user's role in current organization
   */
  const getCurrentRole = useCallback(() => {
    return currentOrg?.role || null;
  }, [currentOrg]);

  /**
   * Check if user has a specific role or higher
   * Role hierarchy: admin > editor > viewer
   */
  const hasRole = useCallback(
    requiredRole => {
      const role = getCurrentRole();
      if (!role) return false;

      const roleHierarchy = {
        admin: 3,
        editor: 2,
        viewer: 1
      };

      return roleHierarchy[role] >= roleHierarchy[requiredRole];
    },
    [getCurrentRole]
  );

  /**
   * Check if user can perform editor actions
   */
  const canEdit = useCallback(() => {
    return hasRole('editor');
  }, [hasRole]);

  /**
   * Check if user is admin
   */
  const isAdmin = useCallback(() => {
    return hasRole('admin');
  }, [hasRole]);

  const value = {
    currentOrg,
    currentProject,
    organizations,
    loading,
    error,
    switchOrganization,
    selectProject,
    clearProject,
    refreshOrganizations,
    getCurrentRole,
    hasRole,
    canEdit,
    isAdmin
  };

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}

/**
 * useOrg Hook
 * Access organization context in any component
 */
export function useOrg() {
  const context = useContext(OrgContext);

  if (!context) {
    throw new Error('useOrg must be used within an OrgProvider');
  }

  return context;
}

export default OrgContext;
