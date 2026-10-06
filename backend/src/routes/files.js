'use strict';
/* Documents + Evidence chain-of-custody */
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { v4: uuid } = require('uuid');
const config = require('../config');
const { row, all, run } = require('../db');
const { authRequired } = require('../middleware/auth');
const { loadCaseAndAuthorize } = require('../middleware/rbac');
const { sha256File, validateUpload } = require('../services/docintel');
const { notify, audit } = require('../services/notify');

const router = express.Router();
router.use(authRequired);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const d = path.join(config.UPLOAD_DIR, 'incoming');
    fs.mkdirSync(d, { recursive: true });
    cb(null, d);
  },
  filename: (req, file, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}-${path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_')}`),
});
const upload = multer({ storage, limits: { fileSize: config.MAX_FILE_MB * 1024 * 1024 } });

function evidenceCode() {
  const y = new Date().getFullYear();
  const n = String(Math.floor(1000 + Math.random() * 9000));
  return `EV-${y}-${n}`;
}

async function canAccessCase(user, caseId) {
  if (user.role === 'ADMIN') return true;
  const c = await row('SELECT * FROM cases WHERE id=?', caseId);
  if (!c) return false;
  if (user.role === 'CITIZEN') return c.citizen_id === user.id;
  if (user.role === 'LAWYER') return !c.lawyer_id || c.lawyer_id === user.id;
  return true; // judge/police/admin broader read
}

/* ---- Documents ---- */
router.get('/cases/:id/documents', loadCaseAndAuthorize(), async (req, res) => {
  res.json({ success: true, data: await all('SELECT id,case_id,filename,mime,size_bytes,sha256,title,document_key,created_at FROM documents WHERE case_id=? ORDER BY created_at', req.yamacase.id) });
});

router.post('/cases/:id/documents', loadCaseAndAuthorize(), upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: { code: 'FILE_REQUIRED', message: 'Choose a file to upload.' } });
    let mime;
    try { mime = validateUpload(req.file, config.MAX_FILE_MB); }
    catch (e) { fs.unlinkSync(req.file.path); throw e; }
    const hash = sha256File(req.file.path);
    const id = uuid();
    const { title = '', document_key = '' } = req.body || {};
    await run('INSERT INTO documents (id,case_id,uploader_id,filename,stored_path,mime,size_bytes,sha256,title,document_key) VALUES (?,?,?,?,?,?,?,?,?,?)',
      id, req.yamacase.id, req.user.id, req.file.originalname, req.file.path, mime, req.file.size, hash, title || req.file.originalname, document_key);
    // mark matching requirement done
    const j = await row('SELECT * FROM legal_journeys WHERE case_id=?', req.yamacase.id);
    if (j && document_key) await run("UPDATE journey_requirements SET status='DONE' WHERE journey_id=? AND document_key=?", j.id, document_key);
    audit({ caseId: req.yamacase.id, actorId: req.user.id, eventType: 'DOCUMENT_UPLOADED', detail: `${req.file.originalname} sha256:${hash.slice(0, 12)}` });
    notify(req.yamacase.citizen_id, 'DOCUMENT_UPLOADED', 'YamaLaw: document uploaded', req.file.originalname, req.yamacase.id);
    if (req.yamacase.lawyer_id) notify(req.yamacase.lawyer_id, 'DOCUMENT_UPLOADED', 'YamaLaw: client uploaded a document', req.file.originalname, req.yamacase.id);
    const d = await row('SELECT * FROM documents WHERE id=?', id);
    res.status(201).json({ success: true, data: { ...d, integrity: 'RECORDED' } });
  } catch (e) { next(e); }
});

router.get('/documents/:docId/download', async (req, res) => {
  const d = await row('SELECT * FROM documents WHERE id=?', req.params.docId);
  if (!d) return res.status(404).json({ success: false, error: { code: 'DOC_NOT_FOUND', message: 'Document not found.' } });
  if (!(await canAccessCase(req.user, d.case_id))) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not permitted.' } });
  if (!fs.existsSync(d.stored_path)) return res.status(410).json({ success: false, error: { code: 'FILE_MISSING', message: 'Stored file is missing.' } });
  audit({ caseId: d.case_id, actorId: req.user.id, eventType: 'DOCUMENT_DOWNLOADED', detail: d.filename });
  res.download(d.stored_path, d.filename);
});

/* ---- Evidence ---- */
router.get('/cases/:id/evidence', loadCaseAndAuthorize(), async (req, res) => {
  const items = (await all('SELECT * FROM evidence WHERE case_id=? ORDER BY created_at', req.yamacase.id)).map((e) => ({
    ...e, integrity: e.status === 'VERIFIED' ? 'VERIFIED' : 'STORED',
  }));
  res.json({ success: true, data: items });
});

router.post('/cases/:id/evidence', loadCaseAndAuthorize(), upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: { code: 'FILE_REQUIRED', message: 'Choose an evidence file.' } });
    let mime;
    try { mime = validateUpload(req.file, config.MAX_FILE_MB); }
    catch (e) { fs.unlinkSync(req.file.path); throw e; }
    const hash = sha256File(req.file.path);
    const id = uuid();
    const code = evidenceCode();
    const { evidence_type = 'DOCUMENT', description = '' } = req.body || {};
    await run('INSERT INTO evidence (id,evidence_code,case_id,uploader_id,filename,stored_path,mime,size_bytes,sha256,evidence_type,description,status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
      id, code, req.yamacase.id, req.user.id, req.file.originalname, req.file.path, mime, req.file.size, hash, evidence_type, description, 'STORED');
    await run('INSERT INTO evidence_access_log (id,evidence_id,actor_id,action,detail) VALUES (?,?,?,?,?)', uuid(), id, req.user.id, 'UPLOAD', `sha256:${hash.slice(0, 16)}`);
    audit({ caseId: req.yamacase.id, actorId: req.user.id, eventType: 'EVIDENCE_UPLOADED', detail: `${code} ${req.file.originalname}` });
    res.status(201).json({ success: true, data: await row('SELECT * FROM evidence WHERE id=?', id) });
  } catch (e) { next(e); }
});

router.get('/evidence/:evId', async (req, res) => {
  const e = await row('SELECT * FROM evidence WHERE id=?', req.params.evId);
  if (!e) return res.status(404).json({ success: false, error: { code: 'EVIDENCE_NOT_FOUND', message: 'Evidence not found.' } });
  if (!(await canAccessCase(req.user, e.case_id))) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not permitted.' } });
  await run('INSERT INTO evidence_access_log (id,evidence_id,actor_id,action,detail) VALUES (?,?,?,?,?)', uuid(), e.id, req.user.id, 'VIEW', '');
  const log = await all('SELECT l.*, u.full_name actor_name FROM evidence_access_log l JOIN users u ON u.id=l.actor_id WHERE l.evidence_id=? ORDER BY l.created_at', e.id);
  res.json({ success: true, data: { ...e, accessHistory: log } });
});

router.post('/evidence/:evId/verify', async (req, res, next) => {
  try {
    const e = await row('SELECT * FROM evidence WHERE id=?', req.params.evId);
    if (!e) return res.status(404).json({ success: false, error: { code: 'EVIDENCE_NOT_FOUND', message: 'Evidence not found.' } });
    if (!(await canAccessCase(req.user, e.case_id))) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not permitted.' } });
    if (!fs.existsSync(e.stored_path)) return res.status(410).json({ success: false, error: { code: 'FILE_MISSING', message: 'Stored file missing — cannot verify.' } });
    const current = sha256File(e.stored_path);
    const ok = current === e.sha256;
    await run('UPDATE evidence SET status=?, verified_at=datetime(\'now\') WHERE id=?', ok ? 'VERIFIED' : 'MODIFIED', e.id);
    await run('INSERT INTO evidence_access_log (id,evidence_id,actor_id,action,detail) VALUES (?,?,?,?,?)', uuid(), e.id, req.user.id, 'VERIFY', ok ? 'VERIFIED' : 'HASH_MISMATCH');
    audit({ caseId: e.case_id, actorId: req.user.id, eventType: ok ? 'EVIDENCE_VERIFIED' : 'EVIDENCE_TAMPER', detail: e.evidence_code });
    const updated = await row('SELECT * FROM evidence WHERE id=?', e.id);
    if (e.case_id) {
      const kase = await row('SELECT * FROM cases WHERE id=?', e.case_id);
      if (kase) notify(kase.citizen_id, 'EVIDENCE_VERIFIED', `YamaLaw: evidence ${ok ? 'verified' : 'flagged'}`, e.evidence_code, e.case_id);
    }
    res.json({ success: true, data: { ...updated, integrity: ok ? 'VERIFIED' : 'MODIFIED', currentHash: current, storedHash: e.sha256 } });
  } catch (e2) { next(e2); }
});

router.get('/evidence/:evId/download', async (req, res) => {
  const e = await row('SELECT * FROM evidence WHERE id=?', req.params.evId);
  if (!e) return res.status(404).json({ success: false, error: { code: 'EVIDENCE_NOT_FOUND', message: 'Evidence not found.' } });
  if (!(await canAccessCase(req.user, e.case_id))) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not permitted.' } });
  await run('INSERT INTO evidence_access_log (id,evidence_id,actor_id,action,detail) VALUES (?,?,?,?,?)', uuid(), e.id, req.user.id, 'DOWNLOAD', '');
  res.download(e.stored_path, e.filename);
});

module.exports = router;
