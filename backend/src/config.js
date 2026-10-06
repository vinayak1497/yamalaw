'use strict';
/* YamaLaw configuration — free-first, every optional integration has an OFF switch. */
const path = require('path');

function bool(v, dflt) {
  if (v === undefined || v === null || v === '') return dflt;
  return ['1', 'true', 'yes', 'on'].includes(String(v).toLowerCase());
}
function num(v, dflt) {
  const n = Number(v);
  return Number.isFinite(n) ? n : dflt;
}

const config = {
  APP_NAME: process.env.APP_NAME || 'YamaLaw',
  APP_ENV: process.env.APP_ENV || 'development',
  PORT: num(process.env.PORT, 8080),
  DEMO_MODE: bool(process.env.DEMO_MODE, true),

  JWT_SECRET: process.env.JWT_SECRET || 'yamalaw-dev-secret-change-in-production-min-32-chars!!',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',

  DB_PATH: process.env.DB_PATH || path.join(__dirname, '..', 'data', 'yamalaw.sqlite'),
  DATABASE_URL: process.env.DATABASE_URL || '',

  AI_ENABLED: bool(process.env.AI_ENABLED, false),
  OLLAMA_ENABLED: bool(process.env.OLLAMA_ENABLED, false),
  OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
  OLLAMA_MODEL: process.env.OLLAMA_MODEL || 'qwen2.5:7b',

  EMBEDDINGS_PROVIDER: process.env.EMBEDDINGS_PROVIDER || 'local',

  STORAGE_PROVIDER: process.env.STORAGE_PROVIDER || 'local',
  UPLOAD_DIR: process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads'),
  MINIO_ENABLED: bool(process.env.MINIO_ENABLED, false),
  MINIO_ENDPOINT: process.env.MINIO_ENDPOINT || 'http://minio:9000',
  MINIO_BUCKET: process.env.MINIO_BUCKET || 'yamalaw',

  OCR_ENABLED: bool(process.env.OCR_ENABLED, true),
  TRANSLATION_ENABLED: bool(process.env.TRANSLATION_ENABLED, true),
  TRANSLATION_PROVIDER: process.env.TRANSLATION_PROVIDER || 'local',

  EMAIL_ENABLED: bool(process.env.EMAIL_ENABLED, false),
  NOTIFICATIONS_ENABLED: bool(process.env.NOTIFICATIONS_ENABLED, true),
  WEBRTC_ENABLED: bool(process.env.WEBRTC_ENABLED, true),

  CORS_ALLOWED_ORIGINS: (process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost').split(','),
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',

  MAX_FILE_MB: num(process.env.MAX_FILE_MB, 25),

  READINESS_WEIGHTS: {
    documents: num(process.env.RW_DOCUMENTS, 30),
    evidence: num(process.env.RW_EVIDENCE, 25),
    information: num(process.env.RW_INFORMATION, 15),
    prerequisites: num(process.env.RW_PREREQUISITES, 15),
    jurisdiction: num(process.env.RW_JURISDICTION, 10),
    procedural: num(process.env.RW_PROCEDURAL, 5),
  },
};

module.exports = config;
