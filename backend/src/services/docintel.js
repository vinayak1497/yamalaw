'use strict';
/* Document intelligence — MIME detection, size limits, hash, text extraction.
   Never sends private documents to external services. OCR via Tesseract is optional. */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ALLOWED_MIME = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword', 'text/plain', 'image/png', 'image/jpeg', 'image/webp',
]);
const EXT_TO_MIME = { '.pdf': 'application/pdf', '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '.txt': 'text/plain', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };
const BLOCKED_EXT = new Set(['.exe', '.bat', '.cmd', '.ps1', '.sh', '.js', '.msi', '.dll', '.scr', '.com', '.jar', '.vbs']);

function sha256File(p) {
  const h = crypto.createHash('sha256');
  h.update(fs.readFileSync(p));
  return h.digest('hex');
}

function validateUpload(file, maxMB) {
  const ext = path.extname(file.originalname || '').toLowerCase();
  if (BLOCKED_EXT.has(ext)) {
    const e = new Error('This file type is not allowed for security reasons.');
    e.code = 'UNSAFE_FILE'; e.status = 400; throw e;
  }
  const mime = file.mimetype || EXT_TO_MIME[ext] || 'application/octet-stream';
  if (!ALLOWED_MIME.has(mime)) {
    const e = new Error(`Unsupported file type (${mime}). Allowed: PDF, DOCX, TXT, PNG, JPG.`);
    e.code = 'UNSUPPORTED_FILE'; e.status = 400; throw e;
  }
  const maxBytes = maxMB * 1024 * 1024;
  if (file.size > maxBytes) {
    const e = new Error(`File too large. Maximum is ${maxMB} MB.`);
    e.code = 'FILE_TOO_LARGE'; e.status = 400; throw e;
  }
  // Basic path-traversal guard on original name
  if ((file.originalname || '').includes('..')) {
    const e = new Error('Invalid file name.');
    e.code = 'INVALID_FILENAME'; e.status = 400; throw e;
  }
  return mime;
}

function extractTextHint(storedPath, mime) {
  try {
    if (mime === 'text/plain') return fs.readFileSync(storedPath, 'utf8').slice(0, 20000);
    if (mime === 'application/pdf') {
      const buf = fs.readFileSync(storedPath);
      const txt = buf.toString('latin1');
      // naive: pull text between BT/ET is unreliable; instead record metadata only
      return `[PDF binary — ${buf.length} bytes. Text extraction available with PyMuPDF/Tesseract in full pipeline.]`;
    }
    return `[${mime} stored. Preview/download available.]`;
  } catch { return ''; }
}

module.exports = { sha256File, validateUpload, ALLOWED_MIME };
