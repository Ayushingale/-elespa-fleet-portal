import axios from 'axios';
import { getToken, clearToken } from '../utils/tokenStore';

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 10000,
});

// Attach JWT to every outgoing request
axiosClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Centralized handling for expired/invalid tokens and timeouts
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const isTimeout = error.code === 'ECONNABORTED' || error.message?.includes('timeout');
    
    if (error.response?.status === 401 || isTimeout) {
      clearToken();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default axiosClient;
