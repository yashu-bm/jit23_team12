import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/';

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  let user = JSON.parse(localStorage.getItem('user'));
  if (!user) {
    user = JSON.parse(sessionStorage.getItem('user'));
  }
  if (user && user.token) {
    config.headers.Authorization = `Bearer ${user.token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('user');
      // Dispatch a custom event so the React Router layer (App.jsx) handles
      // the redirect. This avoids a full-page reload and keeps browser history intact.
      window.dispatchEvent(new Event('auth:unauthorized'));
    }
    return Promise.reject(error);
  }
);

export default api;
