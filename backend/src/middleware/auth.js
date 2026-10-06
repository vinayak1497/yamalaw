'use strict';
const jwt = require('jsonwebtoken');
const config = require('../config');
const { row, run } = require('../db');

function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role, email: user.email }, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN,
  });
}

const tokenCache = new Map();
const CACHE_TTL_MS = 60 * 1000;

async function verifySupabaseToken(token) {
  const cached = tokenCache.get(token);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return cached.user;
  }

  const url = `${config.SUPABASE_URL.replace(/\/+$/, '')}/auth/v1/user`;
  try {
    const res = await fetch(url, {
      headers: {
        apikey: config.SUPABASE_ANON_KEY,
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) return null;
    const sbUser = await res.json();
    if (sbUser && sbUser.id) {
      tokenCache.set(token, { user: sbUser, cachedAt: Date.now() });
      return sbUser;
    }
  } catch (e) {
    console.warn('[auth] Supabase token verify error:', e.message);
  }
  return null;
}

async function authRequired(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ success: false, error: { code: 'UNAUTHENTICATED', message: 'Sign in required.' } });

  // 1. Try local/dev JWT
  try {
    const payload = jwt.verify(token, config.JWT_SECRET);
    const user = await row('SELECT id,email,full_name,role,language FROM users WHERE id=?', payload.sub);
    if (user) {
      req.user = user;
      req.requestId = req.headers['x-request-id'] || undefined;
      return next();
    }
  } catch {
    // Not a valid local JWT, fall through to Supabase Auth check
  }

  // 2. Try Supabase Auth verification
  try {
    const sbUser = await verifySupabaseToken(token);
    if (sbUser && sbUser.id) {
      let user = await row(
        'SELECT id,email,full_name,role,language FROM users WHERE id=? OR LOWER(email)=?',
        sbUser.id,
        String(sbUser.email || '').toLowerCase()
      );

      // Auto-provision if user exists in Supabase Auth but not yet in public.users
      if (!user) {
        const meta = sbUser.user_metadata || {};
        const role = ['CITIZEN', 'LAWYER', 'JUDGE', 'POLICE', 'ADMIN'].includes(meta.role) ? meta.role : 'CITIZEN';
        const fullName = meta.full_name || (sbUser.email ? sbUser.email.split('@')[0] : 'User');
        const phone = meta.phone || '';
        try {
          await run(
            'INSERT INTO users (id,email,password_hash,full_name,role,phone) VALUES (?,?,?,?,?,?)',
            sbUser.id,
            String(sbUser.email || '').toLowerCase(),
            '',
            fullName,
            role,
            phone
          );
          if (role === 'CITIZEN') await run('INSERT INTO citizen_profiles (user_id) VALUES (?)', sbUser.id);
          else if (role === 'LAWYER') await run('INSERT INTO lawyer_profiles (user_id) VALUES (?)', sbUser.id);
          else if (role === 'JUDGE') await run('INSERT INTO judge_profiles (user_id) VALUES (?)', sbUser.id);
          else if (role === 'POLICE') await run('INSERT INTO police_profiles (user_id) VALUES (?)', sbUser.id);
        } catch (provErr) {
          console.warn('[auth] Auto-provision note:', provErr.message);
        }
        user = await row('SELECT id,email,full_name,role,language FROM users WHERE id=?', sbUser.id);
      }

      if (user) {
        req.user = user;
        req.requestId = req.headers['x-request-id'] || undefined;
        return next();
      }
    }
  } catch (sbErr) {
    console.warn('[auth] Supabase verify error:', sbErr.message);
  }

  return res.status(401).json({ success: false, error: { code: 'INVALID_TOKEN', message: 'Session expired. Please sign in again.' } });
}

module.exports = { signToken, authRequired, verifySupabaseToken };
