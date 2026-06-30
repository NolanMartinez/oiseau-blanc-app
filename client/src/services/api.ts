import axios from 'axios';

// Base de l'API. Sur Netlify (proxy `_redirects`) ou en dev (proxy Vite), on
// laisse relatif (`/api/v1`). Sur OVH (statique, pas de proxy), on build avec
// VITE_API_URL = l'URL Railway complète, et les appels partent directement dessus.
const API_BASE = `${((import.meta.env.VITE_API_URL as string) || '').replace(/\/$/, '')}/api/v1`;

// Instance pour le panel admin
const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Instance pour les utilisateurs (subscribers)
export const userApi = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

userApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('user_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
