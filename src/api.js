const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const api = async (path, options = {}) => {
  const token = localStorage.getItem('token');
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
};

export const getUser = () => {
  try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
};

export const getToken = () => localStorage.getItem('token');

export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/login';
};
