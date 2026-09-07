import axios from 'axios';
import { useAuthStore } from '../stores/authStore';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const client = axios.create({ baseURL: BASE_URL, withCredentials: true });

client.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  const selectedOrganizationId = useAuthStore.getState().selectedOrganizationId;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (selectedOrganizationId) config.headers['X-Organization-Id'] = selectedOrganizationId;
  return config;
});

// Tracks an in-flight refresh to prevent concurrent refresh calls
let refreshPromise: Promise<void> | null = null;

client.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalRequest = err.config;

    if (err.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = useAuthStore.getState().refreshToken;
      if (!refreshToken) {
        useAuthStore.getState().clearAuth();
        window.location.href = '/login';
        return Promise.reject(err);
      }

      if (!refreshPromise) {
        refreshPromise = (async () => {
          try {
            // Use a plain axios instance to avoid triggering this interceptor recursively
            const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
            useAuthStore.getState().setTokens(data.accessToken, data.refreshToken);
          } catch {
            useAuthStore.getState().clearAuth();
            window.location.href = '/login';
          } finally {
            refreshPromise = null;
          }
        })();
      }

      await refreshPromise;

      // If clearAuth was called, the token is gone — bail out
      const newToken = useAuthStore.getState().accessToken;
      if (!newToken) {
        return Promise.reject(err);
      }

      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      return client(originalRequest);
    }

    return Promise.reject(err);
  },
);

export default client;
