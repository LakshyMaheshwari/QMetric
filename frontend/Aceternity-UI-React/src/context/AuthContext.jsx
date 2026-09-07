/**
 * context/AuthContext.jsx
 * ------------------------
 * Centralised authentication state for the entire app.
 *
 * - Single source of truth: localStorage
 * - All components read/write auth via this context — no direct localStorage access elsewhere
 * - Listens to a custom 'authStateChanged' window event so unrelated components (e.g. Navbar)
 *   can react when other components (e.g. RegisterPage) complete a login.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

// ─── Storage helpers (always localStorage) ─────────────────────────────────────
const STORAGE_KEY_TOKEN = 'accessToken';
const STORAGE_KEY_USER  = 'user';

function readStoredAuth() {
  try {
    const token = localStorage.getItem(STORAGE_KEY_TOKEN);
    const raw   = localStorage.getItem(STORAGE_KEY_USER);
    const user  = raw ? JSON.parse(raw) : null;
    return { token, user };
  } catch {
    return { token: null, user: null };
  }
}

function writeStoredAuth(token, user) {
  localStorage.setItem(STORAGE_KEY_TOKEN, token);
  localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
}

function clearStoredAuth() {
  // Clear from local storage
  localStorage.removeItem(STORAGE_KEY_TOKEN);
  localStorage.removeItem(STORAGE_KEY_USER);
}

// ─── Provider ──────────────────────────────────────────────────────────────────
export function AuthProvider({ children }) {
  const [user,  setUser]  = useState(null);
  const [token, setToken] = useState(null);

  // Initialise from storage on mount
  useEffect(() => {
    const { token: t, user: u } = readStoredAuth();
    if (t && u) {
      setToken(t);
      setUser(u);
    }
  }, []);

  // React to auth changes triggered by other components or the axios interceptor
  useEffect(() => {
    const handleChange = () => {
      const { token: t, user: u } = readStoredAuth();
      setToken(t || null);
      setUser(u || null);
    };
    window.addEventListener('authStateChanged', handleChange);
    return () => window.removeEventListener('authStateChanged', handleChange);
  }, []);

  /** Call this after a successful login / registration */
  const login = useCallback((accessToken, userData) => {
    writeStoredAuth(accessToken, userData);
    setToken(accessToken);
    setUser(userData);
    window.dispatchEvent(new Event('authStateChanged'));
  }, []);

  /** Call this on logout from any component */
  const logout = useCallback(() => {
    clearStoredAuth();
    setToken(null);
    setUser(null);
    window.dispatchEvent(new Event('authStateChanged'));
  }, []);

  const isAuthenticated = Boolean(token && user);

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ──────────────────────────────────────────────────────────────────────
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

export default AuthContext;
