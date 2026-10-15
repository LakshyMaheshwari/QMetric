/**
 * context/AuthContext.jsx
 * ------------------------
 * Centralised authentication state for the entire app using HttpOnly cookies.
 *
 * - The JWT is stored in an HttpOnly cookie managed by the browser (not accessible via JS)
 * - User metadata is cached in localStorage ('user') for immediate UI rendering
 * - On initial load, verifies the session with /auth/profile
 * - Listens to custom 'authStateChanged', 'authExpired', and 'authBlocked' events
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import apiClient from '../api/client';

const AuthContext = createContext(null);

// ─── Storage helpers ──────────────────────────────────────────────────
const STORAGE_KEY_USER = 'user';

function readStoredUser() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USER);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeStoredUser(user) {
  localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
}

function clearStoredAuth() {
  localStorage.removeItem(STORAGE_KEY_USER);
}

// ─── Provider ──────────────────────────────────────────────────────────────────
export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => readStoredUser());
  const [blockedMessage, setBlockedMessage] = useState(null);

  const clearBlockedMessage = useCallback(() => {
    setBlockedMessage(null);
  }, []);

  // Verify session with backend on mount
  useEffect(() => {
    const checkSession = async () => {
      const stored = readStoredUser();
      if (!stored) return;

      try {
        const res = await apiClient.get('/auth/profile');
        if (res.data?.user) {
          if (res.data.user.isBlocked) {
            clearStoredAuth();
            setUser(null);
            setBlockedMessage('Your account has been blocked by an administrator. Please contact support.');
            return;
          }
          writeStoredUser(res.data.user);
          setUser(res.data.user);
        }
      } catch (err) {
        if (err.response?.status === 403 && err.response?.data?.message?.toLowerCase().includes('blocked')) {
          clearStoredAuth();
          setUser(null);
          setBlockedMessage(err.response.data.message || 'Your account has been blocked by an administrator. Please contact support.');
        } else if (err.response?.status === 401 || err.response?.status === 403) {
          clearStoredAuth();
          setUser(null);
        }
      }
    };

    checkSession();
  }, []);

  // React to auth changes across tabs or components
useEffect(() => {
  const handleChange = () => {
    setUser(readStoredUser());
  };

  window.addEventListener('authStateChanged', handleChange);

  const handleStorage = (event) => {
    if (event.key === STORAGE_KEY_USER) {
      setUser(readStoredUser());
    }
  };

  window.addEventListener('storage', handleStorage);

  return () => {
    window.removeEventListener('authStateChanged', handleChange);
    window.removeEventListener('storage', handleStorage);
  };
}, []);

  // Handle forced logout from authExpired event (401 response)
  useEffect(() => {
    const handleAuthExpired = () => {
      clearStoredAuth();
      setUser(null);
      if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
        window.history.pushState(null, '', '/login');
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
    };

    const handleAuthBlocked = () => {
      clearStoredAuth();
      setUser(null);
      setBlockedMessage('Your account has been blocked by an administrator. Please contact support.');
    };

    window.addEventListener('authExpired', handleAuthExpired);
    window.addEventListener('authBlocked', handleAuthBlocked);

    return () => {
      window.removeEventListener('authExpired', handleAuthExpired);
      window.removeEventListener('authBlocked', handleAuthBlocked);
    };
  }, []);

  /**
   * Call after successful login / register.
   */
  const login = useCallback((userData) => {
    if (userData) {
      if (userData.isBlocked) {
        clearStoredAuth();
        setUser(null);
        setBlockedMessage('Your account has been blocked by an administrator. Please contact support.');
        return;
      }
      setBlockedMessage(null);
      writeStoredUser(userData);
      setUser(userData);
      window.dispatchEvent(new Event('authStateChanged'));
    }
  }, []);

  /**
   * Call on logout - triggers backend cookie clearance and resets state
   */
  const logout = useCallback(async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (e) {
      // Ignore network errors on logout
    } finally {
      clearStoredAuth();
      setUser(null);
      setBlockedMessage(null);
      window.dispatchEvent(new Event('authStateChanged'));
    }
  }, []);

  const isAuthenticated = Boolean(user);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      blockedMessage,
      setBlockedMessage,
      clearBlockedMessage,
      login,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ──────────────────────────────────────────────────────────────
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

export default AuthContext;
