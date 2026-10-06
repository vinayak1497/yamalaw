/* Centralized YamaLaw API client */
const base = import.meta.env.VITE_API_URL || '/api';

function token() { return localStorage.getItem('yamalaw-token') || ''; }

export async function api(path, { method = 'GET', body, form, auth = true } = {}) {
  const headers = {};
  if (!(body instanceof FormData) && body !== undefined && !form) headers['Content-Type'] = 'application/json';
  if (auth && token()) headers.Authorization = `Bearer ${token()}`;
  const res = await fetch(base + path, {
    method,
    headers,
    body: form || (body !== undefined ? (body instanceof FormData ? body : JSON.stringify(body)) : undefined),
  });
  const text = await res.text();
  let json = {};
  try { json = text ? JSON.parse(text) : {}; } catch { json = { success: false, error: { message: text } }; }
  if (!res.ok) throw Object.assign(new Error(json?.error?.message || `Request failed (${res.status})`), { status: res.status, code: json?.error?.code });
  return json.data;
}

export const Auth = {
  async login(email, password) {
    const data = await api('/auth/login', { method: 'POST', body: { email, password }, auth: false });
    localStorage.setItem('yamalaw-token', data.token);
    localStorage.setItem('yamalaw-user', JSON.stringify(data.user));
    return data;
  },
  async signup(payload) {
    const data = await api('/auth/signup', { method: 'POST', body: payload, auth: false });
    localStorage.setItem('yamalaw-token', data.token);
    localStorage.setItem('yamalaw-user', JSON.stringify(data.user));
    return data;
  },
  logout() { localStorage.removeItem('yamalaw-token'); localStorage.removeItem('yamalaw-user'); },
  user() { try { return JSON.parse(localStorage.getItem('yamalaw-user') || 'null'); } catch { return null; } },
};
