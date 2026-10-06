'use strict';
const jwt = require('jsonwebtoken');
const config = require('../config');
const { row } = require('../db');

function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role, email: user.email }, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN,
  });
}

async function authRequired(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ success: false, error: { code: 'UNAUTHENTICATED', message: 'Sign in required.' } });
  try {
    const payload = jwt.verify(token, config.JWT_SECRET);
    const user = await row('SELECT id,email,full_name,role,language FROM users WHERE id=?', payload.sub);
    if (!user) return res.status(401).json({ success: false, error: { code: 'USER_NOT_FOUND', message: 'Account no longer exists.' } });
    req.user = user;
    req.requestId = req.headers['x-request-id'] || undefined;
    next();
  } catch {
    return res.status(401).json({ success: false, error: { code: 'INVALID_TOKEN', message: 'Session expired. Please sign in again.' } });
  }
}

module.exports = { signToken, authRequired };
