/**
 * api/client.js
 * -------------
 * Single Axios instance for ALL frontend API calls.
 *
 * Rules:
 *   - Base URL comes from REACT_APP_API_URL env var; falls back to localhost:5000
 *   - The request interceptor automatically injects the JWT from localStorage
 *   - The response interceptor handles 401 (auto-logout + redirect) globally
 *   - No component ever hardcodes a URL or manually reads localStorage for the token
 */

import axios from 'axios';

// ─── Base URL ──────────────────────────────────────────────────────────────────
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 s – generous for file uploads
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Request interceptor — attach JWT automatically ──────────────────────────
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response interceptor — handle 401 globally ──────────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid – clear storage and redirect to home
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      window.dispatchEvent(new Event('authStateChanged'));
      // Only redirect if not already on the home page
      if (window.location.pathname !== '/') {
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
