'use strict';
const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuid } = require('uuid');
const { row, all, run } = require('../db');
const { signToken, authRequired } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { audit } = require('../services/notify');

const config = require('../config');
const router = express.Router();
const ROLES = ['CITIZEN', 'LAWYER', 'JUDGE', 'POLICE', 'ADMIN'];

router.post('/signup', async (req, res, next) => {
  try {
    const { email, password, full_name, role = 'CITIZEN', phone = '' } = req.body || {};
    if (!email || !password || !full_name) return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Name, email and password are required.' } });
    if (String(password).length < 6) return res.status(400).json({ success: false, error: { code: 'WEAK_PASSWORD', message: 'Password must be at least 6 characters.' } });
    const r = ROLES.includes(role) ? role : 'CITIZEN';
    if (await row('SELECT id FROM users WHERE email=?', String(email).toLowerCase())) {
      return res.status(409).json({ success: false, error: { code: 'EMAIL_TAKEN', message: 'An account with this email already exists.' } });
    }
    const id = uuid();
    const hash = await bcrypt.hash(String(password), 10);
    await run('INSERT INTO users (id,email,password_hash,full_name,role,phone) VALUES (?,?,?,?,?,?)', id, String(email).toLowerCase(), hash, full_name, r, phone);
    if (r === 'CITIZEN') await run('INSERT INTO citizen_profiles (user_id) VALUES (?)', id);
    if (r === 'LAWYER') await run('INSERT INTO lawyer_profiles (user_id) VALUES (?)', id);
    if (r === 'JUDGE') await run('INSERT INTO judge_profiles (user_id) VALUES (?)', id);
    if (r === 'POLICE') await run('INSERT INTO police_profiles (user_id) VALUES (?)', id);

    // Sync to Supabase Auth if service role key is available
    if (config.SUPABASE_SERVICE_ROLE_KEY && config.SUPABASE_URL) {
      try {
        await fetch(`${config.SUPABASE_URL.replace(/\/+$/, '')}/auth/v1/admin/users`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: config.SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${config.SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({
            id,
            email: String(email).toLowerCase(),
            password: String(password),
            email_confirm: true,
            user_metadata: { full_name, role: r, phone },
          }),
        });
      } catch (sbSyncErr) {
        // Non-fatal if offline
      }
    }

    audit({ actorId: id, eventType: 'USER_SIGNUP', detail: `${full_name} (${r})` });
    const user = await row('SELECT id,email,full_name,role,language FROM users WHERE id=?', id);
    res.status(201).json({ success: true, data: { user, token: signToken(user) } });
  } catch (e) { next(e); }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Email and password are required.' } });
    const u = await row('SELECT * FROM users WHERE email=?', String(email).toLowerCase());
    if (!u) return res.status(401).json({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' } });

    let ok = false;
    if (u.password_hash) {
      ok = await bcrypt.compare(String(password), u.password_hash);
    }
    if (!ok && config.SUPABASE_URL && config.SUPABASE_ANON_KEY) {
      try {
        const sbRes = await fetch(`${config.SUPABASE_URL.replace(/\/+$/, '')}/auth/v1/token?grant_type=password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', apikey: config.SUPABASE_ANON_KEY },
          body: JSON.stringify({ email: String(email).toLowerCase(), password: String(password) }),
        });
        const sbData = await sbRes.json();
        if (sbData && sbData.access_token) {
          ok = true;
        }
      } catch {}
    }

    if (!ok) return res.status(401).json({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' } });
    const user = { id: u.id, email: u.email, full_name: u.full_name, role: u.role, language: u.language };
    res.json({ success: true, data: { user, token: signToken(user) } });
  } catch (e) { next(e); }
});

router.get('/me', authRequired, async (req, res) => res.json({ success: true, data: req.user }));
router.patch('/me', authRequired, async (req, res, next) => {
  try {
    const { full_name, phone, language } = req.body || {};
    if (language && !['en', 'hi', 'mr'].includes(language)) return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Unsupported language.' } });
    await run('UPDATE users SET full_name=COALESCE(?,full_name), phone=COALESCE(?,phone), language=COALESCE(?,language) WHERE id=?',
      full_name || null, phone ?? null, language || null, req.user.id);
    res.json({ success: true, data: await row('SELECT id,email,full_name,role,language FROM users WHERE id=?', req.user.id) });
  } catch (e) { next(e); }
});

/** Demo credentials — deterministic, India-appropriate fictional accounts. */
router.get('/demo-credentials', async (req, res) => {
  res.json({ success: true, data: [
    { role: 'CITIZEN', email: 'meera.citizen@yamalaw.demo', password: 'YamaLaw123', name: 'Meera Deshpande' },
    { role: 'LAWYER', email: 'arjun.lawyer@yamalaw.demo', password: 'YamaLaw123', name: 'Adv. Arjun Nair' },
    { role: 'JUDGE', email: 'kavitha.judge@yamalaw.demo', password: 'YamaLaw123', name: 'Judge Kavitha Rao' },
    { role: 'POLICE', email: 'vikram.police@yamalaw.demo', password: 'YamaLaw123', name: 'PSI Vikram Patil' },
    { role: 'ADMIN', email: 'admin@yamalaw.demo', password: 'YamaLaw123', name: 'YamaLaw Admin' },
  ]});
});

module.exports = router;
