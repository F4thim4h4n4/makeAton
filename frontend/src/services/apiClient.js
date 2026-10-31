import axios from 'axios';

/**
 * Pre-configured Axios instance.
 *
 * The base URL falls back to '/api' so the Vite dev-server proxy transparently
 * forwards all /api/* requests to the backend (http://localhost:5000).
 * In production, set VITE_API_BASE_URL in the frontend .env file.
 */
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// ── Request interceptor ───────────────────────────────────────────────────────
// Attach the JWT access token from localStorage once auth is implemented.
apiClient.interceptors.request.use(
  (config) => {
    // TODO (Member 2): const token = localStorage.getItem('accessToken');
    // if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor ──────────────────────────────────────────────────────
// Global error handling – add token refresh logic here when auth is ready.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message || error.message || 'An unexpected error occurred.';
    console.error('[API Error]', message);
    return Promise.reject(error);
  }
);

export default apiClient;
