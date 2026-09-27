// import axios from 'axios';

// const API_BASE_URL = process.env.REACT_APP_API_URL;
// if (!API_BASE_URL) {
//   console.error('🔴 REACT_APP_API_URL is not set');
// }

// const apiClient = axios.create({
//   baseURL: API_BASE_URL || 'http://localhost:5000',
//   withCredentials: true,
//   timeout: 30000,
//   headers: { 'Content-Type': 'application/json' },
// });

// // ─── Read CSRF token from cookie ─────────────────────────
// function getCsrfToken() {
//   const match = document.cookie.match(/(?:^|;\s*)x-csrf-token=([^;]+)/);
//   return match ? decodeURIComponent(match[1]) : null;
// }

// // ─── Attach CSRF token to all state-changing requests ────
// apiClient.interceptors.request.use(
//   (config) => {
//     const method = config.method?.toLowerCase();
//     if (['post', 'put', 'patch', 'delete'].includes(method)) {
//       const token = getCsrfToken();
//       if (token) {
//         config.headers['x-csrf-token'] = token;
//       }
//     }
//     return config;
//   },
//   (error) => Promise.reject(error)
// );

// // ─── Response interceptor: auth + CSRF errors ────────────
// apiClient.interceptors.response.use(
//   (response) => response,
//   (error) => {
//     const status = error.response?.status;
//     const message = error.response?.data?.message || '';

//     if (status === 401) {
//       localStorage.removeItem('user');
//       window.dispatchEvent(new Event('authExpired'));
//     }

//     if (status === 403 && message.toLowerCase().includes('blocked')) {
//       localStorage.removeItem('user');
//       window.dispatchEvent(new Event('authBlocked'));
//     }

//     if (status === 403 && message.toLowerCase().includes('csrf')) {
//       console.warn('CSRF token invalid — refreshing page may help');
//     }

//     return Promise.reject(error);
//   }
// );

// export default apiClient;

import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL;
if (!API_BASE_URL) {
  console.error('REACT_APP_API_URL is not set');
}

const apiClient = axios.create({
  baseURL: API_BASE_URL || 'http://localhost:5000',
  withCredentials: true,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Read CSRF token from cookie ─────────────────────────────
function getCsrfTokenFromCookie() {
  const match = document.cookie.match(/(?:^|;\s*)x-csrf-token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

// ─── Single in-flight CSRF bootstrap ─────────────────────────
// Any mutating request awaits this. Deduplicated so we never fire
// more than one /api/csrf-token call concurrently.
let csrfBootstrapPromise = null;

export function ensureCsrfToken({ force = false } = {}) {
  if (force) csrfBootstrapPromise = null;
  if (csrfBootstrapPromise) return csrfBootstrapPromise;

  csrfBootstrapPromise = apiClient
    .get('/api/csrf-token')
    .then((res) => {
      const token = res.data?.csrfToken || getCsrfTokenFromCookie();
      if (!token) throw new Error('CSRF bootstrap returned no token');
      return token;
    })
    .catch((err) => {
      csrfBootstrapPromise = null; // allow retry on next call
      throw err;
    });

  return csrfBootstrapPromise;
}

// ─── Request interceptor ─────────────────────────────────────
apiClient.interceptors.request.use(
  async (config) => {
    const method = (config.method || 'get').toLowerCase();
    const isMutating = ['post', 'put', 'patch', 'delete'].includes(method);
    const isCsrfEndpoint = (config.url || '').includes('/api/csrf-token');

    if (isMutating && !isCsrfEndpoint) {
      try {
        // Guarantees cookie exists BEFORE the header is attached.
        await ensureCsrfToken();
      } catch (_) {
        // Let the request through; the response interceptor will retry once.
      }
      const token = getCsrfTokenFromCookie();
      if (token) config.headers['x-csrf-token'] = token;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response interceptor ────────────────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    const message = (error.response?.data?.message || '').toLowerCase();
    const original = error.config;

    // Auto-recover from a stale/missing CSRF cookie exactly once.
    if (
      status === 403 &&
      message.includes('csrf') &&
      original &&
      !original._csrfRetry
    ) {
      original._csrfRetry = true;
      try {
        await ensureCsrfToken({ force: true });
        const token = getCsrfTokenFromCookie();
        if (token) original.headers['x-csrf-token'] = token;
        return apiClient(original);
      } catch (_) {
        // fall through to normal error handling
      }
    }

    if (status === 401) {
      localStorage.removeItem('user');
      window.dispatchEvent(new Event('authExpired'));
    }

    if (status === 403 && message.includes('blocked')) {
      localStorage.removeItem('user');
      window.dispatchEvent(new Event('authBlocked'));
    }

    return Promise.reject(error);
  }
);

export default apiClient;
