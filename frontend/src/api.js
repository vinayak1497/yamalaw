/* Centralized YamaLaw API client & Supabase Auth integration */
import { supabase } from './supabase.js';

export function getApiBase() {
  const raw = (import.meta.env.VITE_API_URL || '').trim();
  if (!raw) return '/api';
  const trimmed = raw.replace(/\/+$/, '');
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
}

export function buildUrl(path) {
  const base = getApiBase();
  const clean = path.replace(/^\/api(\/|$)/, '/');
  const p = clean.startsWith('/') ? clean : `/${clean}`;
  return `${base}${p}`;
}

export function token() {
  return localStorage.getItem('yamalaw-token') || '';
}

export async function api(path, { method = 'GET', body, form, auth = true } = {}) {
  const headers = {};
  if (!(body instanceof FormData) && body !== undefined && !form) {
    headers['Content-Type'] = 'application/json';
  }
  const currentToken = token();
  if (auth && currentToken) {
    headers.Authorization = `Bearer ${currentToken}`;
  }

  const url = buildUrl(path);
  let res;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: form || (body !== undefined ? (body instanceof FormData ? body : JSON.stringify(body)) : undefined),
    });
  } catch (netErr) {
    throw Object.assign(new Error(`Network request failed: ${netErr.message}`), { status: 0 });
  }

  const text = await res.text();
  let json = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { success: false, error: { message: text || `HTTP ${res.status}` } };
  }

  if (!res.ok) {
    throw Object.assign(new Error(json?.error?.message || `Request failed (${res.status})`), {
      status: res.status,
      code: json?.error?.code,
    });
  }
  return json.data;
}

export const Auth = {
  async signup(payload) {
    const email = String(payload.email || '').trim().toLowerCase();
    const role = ['CITIZEN', 'LAWYER', 'JUDGE', 'POLICE', 'ADMIN'].includes(payload.role) ? payload.role : 'CITIZEN';
    const fullName = String(payload.full_name || '').trim();
    const phone = String(payload.phone || '').trim();

    // 1. Sign up with Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password: payload.password,
      options: {
        data: {
          full_name: fullName,
          role,
          phone,
        },
      },
    });

    if (error) {
      throw new Error(error.message);
    }

    if (!data.user) {
      throw new Error('Signup failed to create a user account.');
    }

    const userId = data.user.id;
    const user = {
      id: userId,
      email,
      full_name: fullName,
      role,
      phone,
      language: 'en',
    };

    // If email confirmation is enabled in Supabase there is no session yet — the
    // public.users row is created by the handle_new_user trigger once the link is clicked.
    if (!data.session) {
      return { user: null, token: '', pendingEmailConfirmation: true, email };
    }

    // 2. Dual-save to Supabase database public.users & profile table
    try {
      const { error: usersErr } = await supabase.from('users').upsert({
        id: userId,
        email,
        full_name: fullName,
        role,
        phone,
        language: 'en',
        password_hash: '',
      }, { onConflict: 'id' });
      if (usersErr) console.warn('Note saving public.users:', usersErr.message);

      const profileTable = {
        CITIZEN: 'citizen_profiles',
        LAWYER: 'lawyer_profiles',
        JUDGE: 'judge_profiles',
        POLICE: 'police_profiles',
      }[role];

      if (profileTable) {
        const { error: profileErr } = await supabase
          .from(profileTable)
          .upsert({ user_id: userId }, { onConflict: 'user_id' });
        if (profileErr) console.warn(`Note saving ${profileTable}:`, profileErr.message);
      }
    } catch (saveErr) {
      console.warn('Note saving profile to public.users:', saveErr);
    }

    const accessToken = data.session.access_token;
    localStorage.setItem('yamalaw-token', accessToken);
    localStorage.setItem('yamalaw-user', JSON.stringify(user));

    return { user, token: accessToken };
  },

  async login(email, password) {
    const cleanEmail = String(email || '').trim().toLowerCase();

    // 1. Authenticate with Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (error) {
      // Graceful fallback to backend login if needed (e.g. dev SQLite accounts)
      try {
        const backendData = await api('/auth/login', {
          method: 'POST',
          body: { email: cleanEmail, password },
          auth: false,
        });
        if (backendData?.token && backendData?.user) {
          localStorage.setItem('yamalaw-token', backendData.token);
          localStorage.setItem('yamalaw-user', JSON.stringify(backendData.user));
          return backendData;
        }
      } catch {
        // Fallback also failed; throw original Supabase error
      }
      throw new Error(error.message);
    }

    const sbUser = data.user;
    let dbUser = null;

    // 2. Fetch user details from Supabase public.users
    try {
      const { data: row } = await supabase
        .from('users')
        .select('id, email, full_name, role, phone, language')
        .eq('id', sbUser.id)
        .maybeSingle();
      dbUser = row;
    } catch (e) {
      console.warn('Fetch public.users row note:', e);
    }

    const role = dbUser?.role || sbUser.user_metadata?.role || 'CITIZEN';
    const fullName = dbUser?.full_name || sbUser.user_metadata?.full_name || sbUser.email.split('@')[0];
    const phone = dbUser?.phone || sbUser.user_metadata?.phone || '';
    const language = dbUser?.language || 'en';

    const user = {
      id: sbUser.id,
      email: sbUser.email,
      full_name: fullName,
      role,
      phone,
      language,
    };

    // Ensure public.users row is stored in Supabase
    if (!dbUser) {
      try {
        await supabase.from('users').upsert({
          id: sbUser.id,
          email: sbUser.email,
          full_name: fullName,
          role,
          phone,
          language,
          password_hash: '',
        }, { onConflict: 'id' });
      } catch (upsertErr) {
        console.warn('Upsert public.users note:', upsertErr);
      }
    }

    const accessToken = data.session?.access_token || '';
    localStorage.setItem('yamalaw-token', accessToken);
    localStorage.setItem('yamalaw-user', JSON.stringify(user));

    return { user, token: accessToken };
  },

  async logout() {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Signout note:', e);
    }
    localStorage.removeItem('yamalaw-token');
    localStorage.removeItem('yamalaw-user');
  },

  async syncUser() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !session.user) {
        return this.user();
      }

      localStorage.setItem('yamalaw-token', session.access_token);
      const sbUser = session.user;

      const { data: dbUser } = await supabase
        .from('users')
        .select('id, email, full_name, role, phone, language')
        .eq('id', sbUser.id)
        .maybeSingle();

      const user = {
        id: sbUser.id,
        email: sbUser.email,
        full_name: dbUser?.full_name || sbUser.user_metadata?.full_name || sbUser.email.split('@')[0],
        role: dbUser?.role || sbUser.user_metadata?.role || 'CITIZEN',
        phone: dbUser?.phone || sbUser.user_metadata?.phone || '',
        language: dbUser?.language || 'en',
      };
      localStorage.setItem('yamalaw-user', JSON.stringify(user));
      return user;
    } catch {
      return this.user();
    }
  },

  user() {
    try {
      return JSON.parse(localStorage.getItem('yamalaw-user') || 'null');
    } catch {
      return null;
    }
  },
};
