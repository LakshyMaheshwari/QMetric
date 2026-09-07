import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

/**
 * AuthContext — provides authentication state across the entire app.
 * Reads from sessionStorage to match the pattern in Navbar.jsx.
 *
 * Exposed values:
 *   user     — { userName, email } | null
 *   token    — JWT string | null
 *   loading  — true while initial session check is running
 *   login()  — saves token/user to sessionStorage and updates state
 *   logout() — clears sessionStorage and resets state
 */

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount, restore session from sessionStorage
  useEffect(() => {
    const storedToken = sessionStorage.getItem('accessToken');
    const storedUser = sessionStorage.getItem('user');
    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch {
        // Corrupted data — clear it
        sessionStorage.removeItem('accessToken');
        sessionStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  /**
   * Listen for external auth state changes dispatched by Navbar.jsx
   * (Navbar dispatches a custom 'authStateChanged' event on login/logout)
   */
  useEffect(() => {
    const syncAuth = () => {
      const storedToken = sessionStorage.getItem('accessToken');
      const storedUser = sessionStorage.getItem('user');
      if (storedToken && storedUser) {
        try {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        } catch {
          setToken(null);
          setUser(null);
        }
      } else {
        setToken(null);
        setUser(null);
      }
    };

    window.addEventListener('authStateChanged', syncAuth);
    return () => window.removeEventListener('authStateChanged', syncAuth);
  }, []);

  /**
   * login — call this after a successful API response
   * @param {string} accessToken
   * @param {{ userName: string, email: string }} userData
   */
  const login = useCallback((accessToken, userData) => {
    sessionStorage.setItem('accessToken', accessToken);
    sessionStorage.setItem('user', JSON.stringify(userData));
    setToken(accessToken);
    setUser(userData);
    window.dispatchEvent(new Event('authStateChanged'));
  }, []);

  /** logout — clears session and redirects consumers */
  const logout = useCallback(() => {
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('user');
    setToken(null);
    setUser(null);
    window.dispatchEvent(new Event('authStateChanged'));
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

/** useAuth — hook to consume auth context in any component */
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return ctx;
};

export default AuthContext;
