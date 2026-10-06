'use strict';
/* YamaLaw API — Citizen Legal Access & Case Continuity Platform */
require('express-async-errors'); // forward async route errors to the error handler (Express 4)
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const config = require('./config');
const { ping } = require('./db'); // ensure schema + db pool ready

const { notFound, errorHandler } = require('./middleware/error');

if (config.APP_ENV === 'production' && config.JWT_SECRET.includes('change-me')) {
  console.error('[yamalaw] FATAL: JWT_SECRET is not set for production. Refusing to boot with a dev secret.');
  process.exit(1);
}

const app = express();
app.set('trust proxy', 1); // Render/Vercel sit behind proxies; needed for rate limiting + IPs
app.use(helmet({ crossOriginResourcePolicy: false }));

const allowAll = config.APP_ENV !== 'production';
const allowed = new Set(config.CORS_ALLOWED_ORIGINS.map((o) => o.trim()).filter(Boolean));
app.use(cors({
  origin: (origin, cb) => {
    if (allowAll || !origin) return cb(null, true); // dev, curl, health checks, same-origin
    if (allowed.has(origin)) return cb(null, true);
    return cb(new Error('CORS origin not allowed'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '2mb' }));
app.use(morgan('tiny', { skip: () => process.env.APP_ENV === 'test' }));

app.get('/api/health', async (req, res) => {
  let dbStatus = 'ok';
  try { await ping(); } catch { dbStatus = 'unreachable'; }
  res.json({
    success: true, data: {
      app: config.APP_NAME, env: config.APP_ENV, aiEnabled: config.AI_ENABLED,
      ollama: config.OLLAMA_ENABLED, storage: config.STORAGE_PROVIDER,
      translation: config.TRANSLATION_ENABLED, demoMode: config.DEMO_MODE,
      db: dbStatus, time: new Date().toISOString(),
    },
  });
});
app.get('/api/config', (req, res) => res.json({
  success: true, data: {
    appName: config.APP_NAME, aiEnabled: config.AI_ENABLED,
    translationEnabled: config.TRANSLATION_ENABLED, webrtcEnabled: config.WEBRTC_ENABLED,
    notificationsEnabled: config.NOTIFICATIONS_ENABLED, demoMode: config.DEMO_MODE,
  },
}));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }), require('./routes/auth'));
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, max: 600 }), require('./routes/cases'));
app.use('/api', require('./routes/files'));
app.use('/api', require('./routes/misc'));

app.use('/api', notFound);
app.use(errorHandler);

const PORT = config.PORT;
if (require.main === module) {
  const seed = require('./seed');
  seed().catch((e) => console.error('seed note:', e.message)).finally(() => {
    app.listen(PORT, () => console.log(`YamaLaw API listening on :${PORT} (env=${config.APP_ENV}, ai=${config.AI_ENABLED ? 'on' : 'off'}, demo=${config.DEMO_MODE ? 'on' : 'off'})`));
  });
}
module.exports = app;
