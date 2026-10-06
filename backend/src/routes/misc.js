'use strict';
/* Hearings, FIRs, legal-aid, research, notifications, admin, misc */
const express = require('express');
const { v4: uuid } = require('uuid');
const { row, all, run } = require('../db');
const { authRequired } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { evaluate } = require('../services/legalaid');
const { notify, audit } = require('../services/notify');

const router = express.Router();
router.use(authRequired);

/* ---- Hearings ---- */
router.get('/cases/:id/hearings', async (req, res) => {
  const c = await row('SELECT * FROM cases WHERE id=?', req.params.id);
  if (!c) return res.status(404).json({ success: false, error: { code: 'CASE_NOT_FOUND', message: 'Case not found.' } });
  if (req.user.role === 'CITIZEN' && c.citizen_id !== req.user.id) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not your case.' } });
  res.json({ success: true, data: await all('SELECT * FROM hearings WHERE case_id=? ORDER BY scheduled_at', c.id) });
});
router.post('/cases/:id/hearings', async (req, res, next) => {
  try {
    if (!['LAWYER', 'JUDGE', 'ADMIN', 'POLICE'].includes(req.user.role)) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Only staff can schedule hearings.' } });
    const c = await row('SELECT * FROM cases WHERE id=?', req.params.id);
    if (!c) return res.status(404).json({ success: false, error: { code: 'CASE_NOT_FOUND', message: 'Case not found.' } });
    const { title, scheduled_at, venue = '', mode = 'PHYSICAL', notes = '' } = req.body || {};
    if (!title || !scheduled_at) return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Title and scheduled date are required.' } });
    const id = uuid();
    const meetingUrl = mode === 'VIRTUAL' ? `/hearing/${id}` : '';
    await run('INSERT INTO hearings (id,case_id,title,scheduled_at,venue,mode,status,notes,meeting_url) VALUES (?,?,?,?,?,?,?,?,?)',
      id, c.id, title, scheduled_at, venue, mode, 'SCHEDULED', notes, meetingUrl);
    audit({ caseId: c.id, actorId: req.user.id, eventType: 'HEARING_SCHEDULED', detail: `${title} @ ${scheduled_at}` });
    notify(c.citizen_id, 'HEARING_SCHEDULED', 'YamaLaw: hearing scheduled', `${title} on ${scheduled_at}`, c.id);
    if (c.lawyer_id) notify(c.lawyer_id, 'HEARING_SCHEDULED', 'YamaLaw: hearing scheduled', `${title} on ${scheduled_at}`, c.id);
    res.status(201).json({ success: true, data: await row('SELECT * FROM hearings WHERE id=?', id) });
  } catch (e) { next(e); }
});
router.patch('/hearings/:hid', async (req, res, next) => {
  try {
    if (!['LAWYER', 'JUDGE', 'ADMIN'].includes(req.user.role)) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not permitted.' } });
    const h = await row('SELECT * FROM hearings WHERE id=?', req.params.hid);
    if (!h) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Hearing not found.' } });
    const { status, notes } = req.body || {};
    await run('UPDATE hearings SET status=COALESCE(?,status), notes=COALESCE(?,notes) WHERE id=?', status || null, notes ?? null, h.id);
    audit({ caseId: h.case_id, actorId: req.user.id, eventType: 'HEARING_UPDATED', detail: status || '' });
    res.json({ success: true, data: await row('SELECT * FROM hearings WHERE id=?', h.id) });
  } catch (e) { next(e); }
});
router.get('/hearings/upcoming', async (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  let list;
  if (req.user.role === 'CITIZEN') list = await all('SELECT h.*, c.title case_title FROM hearings h JOIN cases c ON c.id=h.case_id WHERE c.citizen_id=? AND h.scheduled_at>=? ORDER BY h.scheduled_at LIMIT 20', req.user.id, today);
  else if (req.user.role === 'LAWYER') list = await all('SELECT h.*, c.title case_title FROM hearings h JOIN cases c ON c.id=h.case_id WHERE c.lawyer_id=? AND h.scheduled_at>=? ORDER BY h.scheduled_at LIMIT 20', req.user.id, today);
  else list = await all('SELECT h.*, c.title case_title FROM hearings h JOIN cases c ON c.id=h.case_id WHERE h.scheduled_at>=? ORDER BY h.scheduled_at LIMIT 50', today);
  res.json({ success: true, data: list });
});

/* ---- FIRs ---- */
router.post('/firs', async (req, res, next) => {
  try {
    if (!['CITIZEN', 'POLICE', 'ADMIN'].includes(req.user.role)) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not permitted.' } });
    const { case_id = null, station_name = '', incident_date = '', place = '', description, sections = '' } = req.body || {};
    if (!description) return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Description is required.' } });
    const id = uuid();
    const num = `FIR/${new Date().getFullYear()}/${String(Math.floor(1000 + Math.random() * 9000))}`;
    await run('INSERT INTO firs (id,fir_number,case_id,complainant_id,station_name,incident_date,place,description,sections,status) VALUES (?,?,?,?,?,?,?,?,?,?)',
      id, num, case_id, req.user.id, station_name, incident_date, place, description, sections, 'FILED');
    audit({ caseId: case_id || '', actorId: req.user.id, eventType: 'FIR_FILED', detail: num });
    res.status(201).json({ success: true, data: await row('SELECT * FROM firs WHERE id=?', id) });
  } catch (e) { next(e); }
});
router.get('/firs', async (req, res) => {
  const u = req.user;
  const list = u.role === 'CITIZEN' ? await all('SELECT * FROM firs WHERE complainant_id=? ORDER BY created_at DESC', u.id)
    : await all('SELECT f.*, u2.full_name complainant FROM firs f LEFT JOIN users u2 ON u2.id=f.complainant_id ORDER BY f.created_at DESC LIMIT 200');
  res.json({ success: true, data: list });
});

/* ---- Legal aid ---- */
router.get('/legal-aid/providers', async (req, res) => {
  res.json({ success: true, data: await all('SELECT * FROM legal_aid_providers ORDER BY name') });
});
router.get('/legal-aid/rules', async (req, res) => {
  res.json({ success: true, data: await all('SELECT * FROM legal_aid_rules ORDER BY name') });
});
router.post('/legal-aid/evaluate', async (req, res) => {
  const { annual_income = 0, category = '', state = '', category_slug = '' } = req.body || {};
  res.json({ success: true, data: await evaluate({ annualIncome: Number(annual_income) || 0, category, state, categorySlug: category_slug }) });
});
router.post('/legal-aid/apply', async (req, res, next) => {
  try {
    const { provider_id, case_id = null, reason = '' } = req.body || {};
    const id = uuid();
    await run('INSERT INTO legal_aid_applications (id,citizen_id,provider_id,case_id,status,reason) VALUES (?,?,?,?,?,?)',
      id, req.user.id, provider_id || null, case_id, 'SUBMITTED', reason);
    audit({ caseId: case_id || '', actorId: req.user.id, eventType: 'LEGALAID_APPLIED', detail: provider_id || '' });
    res.status(201).json({ success: true, data: await row('SELECT * FROM legal_aid_applications WHERE id=?', id) });
  } catch (e) { next(e); }
});

/* ---- Research (source-grounded, never hallucinated) ---- */
router.get('/research/search', async (req, res) => {
  const q = String(req.query.q || '').toLowerCase().trim();
  if (!q) return res.json({ success: true, data: [] });
  const terms = q.split(/\s+/).filter((t) => t.length > 2);
  const docs = await all('SELECT * FROM research_documents');
  const scored = docs.map((d) => {
    const hay = `${d.title} ${d.summary} ${d.content} ${d.tags} ${d.court}`.toLowerCase();
    let hits = 0;
    for (const t of terms) if (hay.includes(t)) hits++;
    return { ...d, relevance: terms.length ? Math.round((hits / terms.length) * 100) : 0, matchedTerms: terms.filter((t) => hay.includes(t)) };
  }).filter((d) => d.relevance > 0).sort((a, b) => b.relevance - a.relevance).slice(0, 20);
  if (!scored.length) return res.json({ success: true, data: [], message: 'Source not found.' });
  res.json({ success: true, data: scored.map(({ content, ...r }) => ({ ...r, excerpt: (content || '').slice(0, 400) })) });
});
router.get('/research/documents/:docId', async (req, res) => {
  const d = await row('SELECT * FROM research_documents WHERE id=?', req.params.docId);
  if (!d) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Source not found.' } });
  res.json({ success: true, data: d });
});
router.post('/research/bookmarks', async (req, res, next) => {
  try {
    const { document_id } = req.body || {};
    const id = uuid();
    await run('INSERT INTO research_bookmarks (id,user_id,document_id) VALUES (?,?,?)', id, req.user.id, document_id);
    res.status(201).json({ success: true, data: { id } });
  } catch (e) { next(e); }
});
router.get('/research/bookmarks', async (req, res) => {
  res.json({ success: true, data: await all('SELECT b.*, d.title FROM research_bookmarks b JOIN research_documents d ON d.id=b.document_id WHERE b.user_id=? ORDER BY b.created_at DESC', req.user.id) });
});
router.post('/research/notes', async (req, res, next) => {
  try {
    const { document_id = null, case_id = null, body } = req.body || {};
    if (!body) return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Note body required.' } });
    const id = uuid();
    await run('INSERT INTO research_notes (id,user_id,document_id,case_id,body) VALUES (?,?,?,?,?)', id, req.user.id, document_id, case_id, body);
    res.status(201).json({ success: true, data: await row('SELECT * FROM research_notes WHERE id=?', id) });
  } catch (e) { next(e); }
});
router.post('/research/link-case', async (req, res, next) => {
  try {
    const { case_id, document_id } = req.body || {};
    const kase = await row('SELECT * FROM cases WHERE id=?', case_id);
    if (!kase) return res.status(404).json({ success: false, error: { code: 'CASE_NOT_FOUND', message: 'Case not found.' } });
    if (req.user.role === 'CITIZEN' && kase.citizen_id !== req.user.id) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not your case.' } });
    const id = uuid();
    await run('INSERT INTO case_research_links (id,case_id,document_id,linked_by) VALUES (?,?,?,?)', id, case_id, document_id, req.user.id);
    audit({ caseId: case_id, actorId: req.user.id, eventType: 'RESEARCH_LINKED', detail: document_id });
    res.status(201).json({ success: true, data: { id } });
  } catch (e) { next(e); }
});
router.get('/research/case/:caseId', async (req, res) => {
  res.json({ success: true, data: await all('SELECT l.*, d.title, d.citation FROM case_research_links l JOIN research_documents d ON d.id=l.document_id WHERE l.case_id=?', req.params.caseId) });
});

/* ---- Notifications ---- */
router.get('/notifications', async (req, res) => {
  res.json({ success: true, data: await all('SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 50', req.user.id) });
});
router.patch('/notifications/:nid/read', async (req, res) => {
  await run("UPDATE notifications SET read_at=datetime('now') WHERE id=? AND user_id=?", req.params.nid, req.user.id);
  res.json({ success: true, data: { ok: true } });
});

/* ---- Admin ---- */
router.get('/admin/users', requireRole('ADMIN'), async (req, res) => {
  res.json({ success: true, data: await all('SELECT id,email,full_name,role,language,created_at,is_demo FROM users ORDER BY created_at DESC LIMIT 200') });
});
router.get('/admin/audit', requireRole('ADMIN'), async (req, res) => {
  res.json({ success: true, data: await all('SELECT * FROM audit_events ORDER BY created_at DESC LIMIT 200') });
});
router.get('/admin/stats', requireRole('ADMIN'), async (req, res) => {
  const q = async (s, ...p) => (await row(s, ...p)).c;
  res.json({ success: true, data: {
    users: await q('SELECT COUNT(*) c FROM users'), cases: await q('SELECT COUNT(*) c FROM cases'),
    issues: await q('SELECT COUNT(*) c FROM legal_issues'), documents: await q('SELECT COUNT(*) c FROM documents'),
    evidence: await q('SELECT COUNT(*) c FROM evidence'), hearings: await q('SELECT COUNT(*) c FROM hearings'),
    openCases: await q("SELECT COUNT(*) c FROM cases WHERE status='OPEN'"),
  }});
});

/* ---- Lawyers directory ---- */
router.get('/lawyers', async (req, res) => {
  res.json({ success: true, data: await all("SELECT u.id,u.full_name,u.email,l.specialization,l.experience_years,l.languages,l.available FROM users u LEFT JOIN lawyer_profiles l ON l.user_id=u.id WHERE u.role='LAWYER' ORDER BY u.full_name") });
});

/* ---- Dashboard summary ---- */
router.get('/dashboard', async (req, res) => {
  const u = req.user;
  if (u.role === 'CITIZEN') {
    const cases = await all('SELECT * FROM cases WHERE citizen_id=? ORDER BY updated_at DESC', u.id);
    const open = cases.filter((c) => c.status === 'OPEN');
    const today = new Date().toISOString().slice(0, 10);
    const tasks = await all('SELECT t.* FROM case_tasks t JOIN cases c ON c.id=t.case_id WHERE c.citizen_id=? AND t.status != \'DONE\' ORDER BY t.due_date LIMIT 5', u.id);
    const hearings = await all('SELECT h.*, c.title case_title FROM hearings h JOIN cases c ON c.id=h.case_id WHERE c.citizen_id=? AND h.scheduled_at>=? ORDER BY h.scheduled_at LIMIT 5', u.id, today);
    const notifs = await all('SELECT * FROM notifications WHERE user_id=? AND read_at=\'\' ORDER BY created_at DESC LIMIT 5', u.id);
    return res.json({ success: true, data: { cases: open, totalCases: cases.length, tasks, hearings, notifications: notifs } });
  }
  if (u.role === 'LAWYER') {
    const cases = await all('SELECT * FROM cases WHERE lawyer_id=? ORDER BY updated_at DESC', u.id);
    const pool = await all("SELECT * FROM cases WHERE lawyer_id IS NULL AND status='OPEN' ORDER BY created_at DESC LIMIT 10");
    const tasks = await all('SELECT * FROM case_tasks WHERE assignee_id=? AND status != \'DONE\' ORDER BY due_date LIMIT 10', u.id);
    return res.json({ success: true, data: { cases, pool, tasks } });
  }
  if (u.role === 'JUDGE') {
    const hearings = await all('SELECT h.*, c.title case_title FROM hearings h JOIN cases c ON c.id=h.case_id ORDER BY h.scheduled_at LIMIT 20');
    const cases = await all('SELECT * FROM cases ORDER BY updated_at DESC LIMIT 20');
    return res.json({ success: true, data: { hearings, cases } });
  }
  if (u.role === 'POLICE') {
    const firs = await all('SELECT * FROM firs ORDER BY created_at DESC LIMIT 20');
    const cases = await all('SELECT * FROM cases ORDER BY updated_at DESC LIMIT 20');
    return res.json({ success: true, data: { firs, cases } });
  }
  return res.json({ success: true, data: { ok: true } });
});

module.exports = router;
