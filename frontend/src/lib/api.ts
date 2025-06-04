import axios from 'axios';

// Create an authenticated axios instance
const createAuthenticatedAxios = () => {
  const instance = axios.create({
    baseURL: '/api',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Add request interceptor to include auth token
  instance.interceptors.request.use(
    (config) => {
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Add response interceptor to handle auth errors
  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        // Token might be invalid, remove it
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth_token');
          window.location.href = '/';
        }
      }
      return Promise.reject(error);
    }
  );

  return instance;
};

export const authApi = createAuthenticatedAxios();
