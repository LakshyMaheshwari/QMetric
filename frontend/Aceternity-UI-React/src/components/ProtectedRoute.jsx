import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * ProtectedRoute Component
 * Guards routes based on authentication and role
 * 
 * Props:
 *   - requiredRole: string | string[] | null (e.g., 'teacher', 'reviewer', 'admin', 'super_admin')
 *   - children: ReactNode
 * 
 * Behavior:
 *   - Not authenticated → redirect to home ('/')
 *   - Authenticated but wrong role (and not super_admin) → redirect to '/dashboard'
 *   - super_admin can access ALL routes
 *   - Otherwise render children
 */
export default function ProtectedRoute({ requiredRole = null, children }) {
  const { user, isAuthenticated } = useAuth();

  // Not authenticated → go to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If role is required, check it
  if (requiredRole) {
    // Handle both single role (string) and multiple roles (array)
    const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];

    // Super admin bypasses all checks
    if (user?.role === 'super_admin') {
      return children;
    }

    // Check if user's role is in allowed roles
    const hasRole = allowedRoles.includes(user?.role);
    if (!hasRole) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return children;
}
