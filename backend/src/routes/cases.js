'use strict';
/* Issues + Cases + Journey + Readiness + Tasks + Timeline + Messages */
const express = require('express');
const { v4: uuid } = require('uuid');
const { row, all, run } = require('../db');
const { authRequired } = require('../middleware/auth');
const { loadCaseAndAuthorize, requireRole } = require('../middleware/rbac');
const { classify, stagesFor, requirementsFor } = require('../services/journey');
const { computeReadiness } = require('../services/readiness');
const { notify, audit } = require('../services/notify');
const { assist } = require('../services/llm');

const router = express.Router();
router.use(authRequired);

async function buildJourney({ issueId = null, caseId = null, categorySlug, citizenId }) {
  const cat = await row('SELECT * FROM legal_categories WHERE slug=?', categorySlug);
  const tpl = cat ? await row('SELECT * FROM journey_templates WHERE category_id=? ORDER BY version DESC LIMIT 1', cat.id) : null;
  const jid = uuid();
  await run('INSERT INTO legal_journeys (id,case_id,issue_id,template_id,status) VALUES (?,?,?,?,?)', jid, caseId, issueId, tpl ? tpl.id : null, 'ACTIVE');
  const stages = stagesFor(categorySlug);
  for (const [i, s] of stages.entries()) {
    const sid = uuid();
    await run('INSERT INTO journey_stages (id,journey_id,position,title,explanation,actor,deadline_days,status) VALUES (?,?,?,?,?,?,?,?)',
      sid, jid, i, s.title, s.explanation, s.actor, s.deadline_days, i === 0 ? 'IN_PROGRESS' : 'PENDING');
    for (const [j, t] of s.tasks.entries()) {
      await run('INSERT INTO journey_tasks (id,stage_id,position,title,kind,required,document_key,status) VALUES (?,?,?,?,?,?,?,?)',
        uuid(), sid, j, t.title, t.kind, t.required ? 1 : 0, t.document_key || '', 'PENDING');
    }
  }
  for (const r of requirementsFor(categorySlug)) {
    await run('INSERT INTO journey_requirements (id,journey_id,kind,label,document_key,status) VALUES (?,?,?,?,?,?)', uuid(), jid, r.kind, r.label, r.document_key || '', 'MISSING');
  }
  return jid;
}

/* ---------- Legal issues ---------- */
router.post('/issues', async (req, res, next) => {
  try {
    if (req.user.role !== 'CITIZEN' && req.user.role !== 'ADMIN') return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Only citizens can create legal issues.' } });
    const { title, description, category_slug } = req.body || {};
    if (!description || String(description).length < 10) return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Please describe your problem in at least a few words.' } });
    const slug = category_slug || classify(description);
    const cat = await row('SELECT * FROM legal_categories WHERE slug=?', slug);
    const id = uuid();
    await run('INSERT INTO legal_issues (id,citizen_id,title,description,category_id,status) VALUES (?,?,?,?,?,?)',
      id, req.user.id, title || `Issue — ${cat ? cat.name_en : slug}`, description, cat ? cat.id : null, 'OPEN');
    const jid = await buildJourney({ issueId: id, categorySlug: slug, citizenId: req.user.id });
    audit({ issueId: id, actorId: req.user.id, eventType: 'ISSUE_CREATED', detail: title || slug });
    res.status(201).json({ success: true, data: { issue: await row('SELECT * FROM legal_issues WHERE id=?', id), journeyId: jid, category: cat } });
  } catch (e) { next(e); }
});

router.get('/issues', async (req, res, next) => {
  try {
    const list = req.user.role === 'ADMIN' ? await all('SELECT * FROM legal_issues ORDER BY created_at DESC LIMIT 100')
      : await all('SELECT * FROM legal_issues WHERE citizen_id=? ORDER BY created_at DESC', req.user.id);
    res.json({ success: true, data: list });
  } catch (e) { next(e); }
});

router.get('/issues/:id', async (req, res) => {
  const it = await row('SELECT * FROM legal_issues WHERE id=?', req.params.id);
  if (!it) return res.status(404).json({ success: false, error: { code: 'ISSUE_NOT_FOUND', message: 'Issue not found.' } });
  if (req.user.role !== 'ADMIN' && it.citizen_id !== req.user.id && !['LAWYER', 'JUDGE'].includes(req.user.role)) {
    return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not permitted.' } });
  }
  const journey = await row('SELECT * FROM legal_journeys WHERE issue_id=?', it.id);
  res.json({ success: true, data: { issue: it, journeyId: journey?.id || null } });
});

router.get('/categories', async (req, res) => {
  res.json({ success: true, data: await all('SELECT * FROM legal_categories ORDER BY name_en') });
});

/* ---------- Cases ---------- */
function caseNumber() {
  const y = new Date().getFullYear();
  const n = String(Math.floor(1000 + Math.random() * 9000));
  return `YL-${y}-${n}`;
}

router.post('/cases', async (req, res, next) => {
  try {
    if (!['CITIZEN', 'ADMIN'].includes(req.user.role)) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Only citizens can open cases.' } });
    const { issue_id, title, facts = '', jurisdiction = '' } = req.body || {};
    const issue = issue_id ? await row('SELECT * FROM legal_issues WHERE id=?', issue_id) : null;
    if (issue_id && !issue) return res.status(404).json({ success: false, error: { code: 'ISSUE_NOT_FOUND', message: 'Issue not found.' } });
    if (issue && issue.citizen_id !== req.user.id && req.user.role !== 'ADMIN') return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not your issue.' } });
    const catId = issue?.category_id || null;
    const cat = catId ? await row('SELECT * FROM legal_categories WHERE id=?', catId) : null;
    const id = uuid();
    await run('INSERT INTO cases (id,case_number,issue_id,citizen_id,title,category_id,stage,status,jurisdiction,facts) VALUES (?,?,?,?,?,?,?,?,?,?)',
      id, caseNumber(), issue_id || null, req.user.id, title || issue?.title || 'New matter', catId, 'INTAKE', 'OPEN', jurisdiction || cat?.authority || '', facts || issue?.description || '');
    let journey = issue ? await row('SELECT * FROM legal_journeys WHERE issue_id=?', issue.id) : null;
    let jid = journey?.id || null;
    if (!jid) jid = await buildJourney({ caseId: id, issueId: issue_id || null, categorySlug: cat?.slug || 'civil', citizenId: req.user.id });
    else await run('UPDATE legal_journeys SET case_id=? WHERE id=?', id, jid);
    // default tasks
    await run('INSERT INTO case_tasks (id,case_id,title,description,due_date,priority,status) VALUES (?,?,?,?,?,?,?)',
      uuid(), id, 'Upload required documents', 'Complete the document checklist for your journey.', new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10), 'HIGH', 'PENDING');
    audit({ caseId: id, issueId: issue_id || '', actorId: req.user.id, eventType: 'CASE_CREATED', detail: title || '' });
    notify(req.user.id, 'CASE_CREATED', 'YamaLaw: case created', `Your matter "${title || 'New matter'}" is now tracked.`, id);
    res.status(201).json({ success: true, data: { kase: await row('SELECT * FROM cases WHERE id=?', id), journeyId: jid } });
  } catch (e) { next(e); }
});

router.get('/cases', async (req, res) => {
  const u = req.user;
  let list;
  if (u.role === 'ADMIN') list = await all('SELECT * FROM cases ORDER BY created_at DESC LIMIT 200');
  else if (u.role === 'CITIZEN') list = await all('SELECT * FROM cases WHERE citizen_id=? ORDER BY created_at DESC', u.id);
  else if (u.role === 'LAWYER') list = await all("SELECT * FROM cases WHERE lawyer_id=? OR (lawyer_id IS NULL AND status='OPEN') ORDER BY created_at DESC", u.id);
  else if (u.role === 'JUDGE') list = await all('SELECT * FROM cases ORDER BY created_at DESC LIMIT 200');
  else list = await all('SELECT * FROM cases ORDER BY created_at DESC LIMIT 200');
  res.json({ success: true, data: list });
});

router.get('/cases/unassigned', async (req, res) => {
  if (!['LAWYER', 'ADMIN'].includes(req.user.role)) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not permitted.' } });
  res.json({ success: true, data: await all("SELECT * FROM cases WHERE lawyer_id IS NULL AND status='OPEN' ORDER BY created_at DESC") });
});

router.get('/cases/:id', loadCaseAndAuthorize(), async (req, res) => res.json({ success: true, data: req.yamacase }));

router.patch('/cases/:id', loadCaseAndAuthorize(), async (req, res, next) => {
  try {
    const c = req.yamacase; const u = req.user;
    const { stage, status, jurisdiction, facts, lawyer_id, judge_id } = req.body || {};
    if (u.role === 'CITIZEN' && (lawyer_id || judge_id || status)) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You cannot change assignment or status.' } });
    await run('UPDATE cases SET stage=COALESCE(?,stage), status=COALESCE(?,status), jurisdiction=COALESCE(?,jurisdiction), facts=COALESCE(?,facts), lawyer_id=COALESCE(?,lawyer_id), judge_id=COALESCE(?,judge_id), updated_at=datetime(\'now\') WHERE id=?',
      stage || null, status || null, jurisdiction ?? null, facts ?? null, lawyer_id || null, judge_id || null, c.id);
    // keep lawyer_id when null passed intentionally? handle assignment separately
    if (lawyer_id === null) await run('UPDATE cases SET lawyer_id=NULL WHERE id=?', c.id);
    audit({ caseId: c.id, actorId: u.id, eventType: 'CASE_UPDATED', detail: JSON.stringify({ stage, status }) });
    if (lawyer_id) notify(lawyer_id, 'CASE_ASSIGNED', 'YamaLaw: new case assigned', `Case ${c.case_number} was assigned to you.`, c.id);
    res.json({ success: true, data: await row('SELECT * FROM cases WHERE id=?', c.id) });
  } catch (e) { next(e); }
});

router.post('/cases/:id/assign', async (req, res, next) => {
  try {
    const c = await row('SELECT * FROM cases WHERE id=?', req.params.id);
    if (!c) return res.status(404).json({ success: false, error: { code: 'CASE_NOT_FOUND', message: 'Case not found.' } });
    const { lawyer_id, action } = req.body || {};
    if (req.user.role === 'LAWYER') {
      if (action === 'accept') {
        if (c.lawyer_id && c.lawyer_id !== req.user.id) return res.status(409).json({ success: false, error: { code: 'ALREADY_ASSIGNED', message: 'Case already has a lawyer.' } });
        await run("UPDATE cases SET lawyer_id=?, stage='LAWYER_REVIEW', updated_at=datetime('now') WHERE id=?", req.user.id, c.id);
        audit({ caseId: c.id, actorId: req.user.id, eventType: 'LAWYER_ACCEPTED', detail: '' });
        notify(c.citizen_id, 'LAWYER_ASSIGNED', 'YamaLaw: lawyer assigned', 'A lawyer accepted your matter.', c.id);
        return res.json({ success: true, data: await row('SELECT * FROM cases WHERE id=?', c.id) });
      }
      if (action === 'reject') {
        await run('UPDATE cases SET lawyer_id=NULL WHERE id=?', c.id);
        audit({ caseId: c.id, actorId: req.user.id, eventType: 'LAWYER_REJECTED', detail: '' });
        return res.json({ success: true, data: await row('SELECT * FROM cases WHERE id=?', c.id) });
      }
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Specify action accept/reject.' } });
    }
    if (!['ADMIN', 'CITIZEN'].includes(req.user.role)) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not permitted.' } });
    if (req.user.role === 'CITIZEN' && c.citizen_id !== req.user.id) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not your case.' } });
    await run('UPDATE cases SET lawyer_id=?, updated_at=datetime(\'now\') WHERE id=?', lawyer_id || null, c.id);
    audit({ caseId: c.id, actorId: req.user.id, eventType: 'LAWYER_ASSIGNED', detail: lawyer_id || '' });
    if (lawyer_id) notify(lawyer_id, 'CASE_ASSIGNED', 'YamaLaw: new case assigned', `Case ${c.case_number} was assigned to you.`, c.id);
    res.json({ success: true, data: await row('SELECT * FROM cases WHERE id=?', c.id) });
  } catch (e) { next(e); }
});

/* ---------- Journey ---------- */
router.get('/cases/:id/journey', loadCaseAndAuthorize(), async (req, res) => {
  const j = await row('SELECT * FROM legal_journeys WHERE case_id=?', req.yamacase.id) || await row('SELECT * FROM legal_journeys WHERE issue_id=?', req.yamacase.issue_id || '__none');
  if (!j) return res.status(404).json({ success: false, error: { code: 'JOURNEY_NOT_FOUND', message: 'No journey for this case yet.' } });
  const stageRows = await all('SELECT * FROM journey_stages WHERE journey_id=? ORDER BY position', j.id);
  const stages = [];
  for (const s of stageRows) {
    stages.push({ ...s, tasks: await all('SELECT * FROM journey_tasks WHERE stage_id=? ORDER BY position', s.id) });
  }
  res.json({ success: true, data: { journey: j, stages, requirements: await all('SELECT * FROM journey_requirements WHERE journey_id=?', j.id) } });
});

router.post('/cases/:id/journey/advance', loadCaseAndAuthorize(), async (req, res, next) => {
  try {
    const j = await row('SELECT * FROM legal_journeys WHERE case_id=?', req.yamacase.id);
    if (!j) return res.status(404).json({ success: false, error: { code: 'JOURNEY_NOT_FOUND', message: 'No journey.' } });
    await run('UPDATE legal_journeys SET current_stage_position=current_stage_position+1 WHERE id=?', j.id);
    audit({ caseId: req.yamacase.id, actorId: req.user.id, eventType: 'JOURNEY_ADVANCED', detail: '' });
    res.json({ success: true, data: await row('SELECT * FROM legal_journeys WHERE id=?', j.id) });
  } catch (e) { next(e); }
});

router.patch('/journey/tasks/:taskId', async (req, res, next) => {
  try {
    const t = await row('SELECT * FROM journey_tasks WHERE id=?', req.params.taskId);
    if (!t) return res.status(404).json({ success: false, error: { code: 'TASK_NOT_FOUND', message: 'Task not found.' } });
    const stage = await row('SELECT * FROM journey_stages WHERE id=?', t.stage_id);
    const journey = await row('SELECT * FROM legal_journeys WHERE id=?', stage.journey_id);
    const kase = journey.case_id ? await row('SELECT * FROM cases WHERE id=?', journey.case_id) : null;
    if (kase && req.user.role === 'CITIZEN' && kase.citizen_id !== req.user.id) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not your case.' } });
    const { status } = req.body || {};
    if (!['PENDING', 'IN_PROGRESS', 'DONE'].includes(status)) return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Invalid status.' } });
    await run('UPDATE journey_tasks SET status=?, completed_at=? WHERE id=?', status, status === 'DONE' ? new Date().toISOString() : '', t.id);
    if (status === 'DONE') {
      const remaining = (await row('SELECT COUNT(*) c FROM journey_tasks WHERE stage_id=? AND status != \'DONE\' AND required=1', stage.id)).c;
      if (remaining === 0) await run("UPDATE journey_stages SET status='DONE', completed_at=datetime('now') WHERE id=?", stage.id);
    }
    audit({ caseId: journey.case_id || '', actorId: req.user.id, eventType: 'JOURNEY_TASK_UPDATED', detail: `${t.title} -> ${status}` });
    res.json({ success: true, data: await row('SELECT * FROM journey_tasks WHERE id=?', t.id) });
  } catch (e) { next(e); }
});

/* ---------- Readiness ---------- */
router.get('/cases/:id/readiness', loadCaseAndAuthorize(), async (req, res) => {
  res.json({ success: true, data: await computeReadiness(req.yamacase.id) });
});

/* ---------- Tasks & deadlines ---------- */
router.get('/cases/:id/tasks', loadCaseAndAuthorize(), async (req, res) => {
  res.json({ success: true, data: await all('SELECT * FROM case_tasks WHERE case_id=? ORDER BY due_date', req.yamacase.id) });
});
router.post('/cases/:id/tasks', loadCaseAndAuthorize(), async (req, res, next) => {
  try {
    const { title, description = '', assignee_id = null, due_date = '', priority = 'MEDIUM' } = req.body || {};
    if (!title) return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Title is required.' } });
    const id = uuid();
    await run('INSERT INTO case_tasks (id,case_id,title,description,assignee_id,due_date,priority,status) VALUES (?,?,?,?,?,?,?,?)',
      id, req.yamacase.id, title, description, assignee_id, due_date, priority, 'PENDING');
    audit({ caseId: req.yamacase.id, actorId: req.user.id, eventType: 'TASK_CREATED', detail: title });
    if (assignee_id) notify(assignee_id, 'TASK_ASSIGNED', 'YamaLaw: task assigned', title, req.yamacase.id);
    res.status(201).json({ success: true, data: await row('SELECT * FROM case_tasks WHERE id=?', id) });
  } catch (e) { next(e); }
});
router.patch('/tasks/:taskId', authRequired, async (req, res, next) => {
  try {
    const t = await row('SELECT * FROM case_tasks WHERE id=?', req.params.taskId);
    if (!t) return res.status(404).json({ success: false, error: { code: 'TASK_NOT_FOUND', message: 'Task not found.' } });
    const kase = await row('SELECT * FROM cases WHERE id=?', t.case_id);
    if (req.user.role === 'CITIZEN' && kase.citizen_id !== req.user.id) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not your case.' } });
    const { status, title, due_date, priority } = req.body || {};
    await run('UPDATE case_tasks SET status=COALESCE(?,status), title=COALESCE(?,title), due_date=COALESCE(?,due_date), priority=COALESCE(?,priority) WHERE id=?',
      status || null, title || null, due_date ?? null, priority || null, t.id);
    audit({ caseId: t.case_id, actorId: req.user.id, eventType: 'TASK_UPDATED', detail: `${t.title} -> ${status || 'edited'}` });
    res.json({ success: true, data: await row('SELECT * FROM case_tasks WHERE id=?', t.id) });
  } catch (e) { next(e); }
});
router.get('/tasks/mine', async (req, res) => {
  const u = req.user;
  const tasks = u.role === 'CITIZEN' ? await all('SELECT t.* FROM case_tasks t JOIN cases c ON c.id=t.case_id WHERE c.citizen_id=? ORDER BY t.due_date', u.id)
    : await all('SELECT * FROM case_tasks WHERE assignee_id=? ORDER BY due_date', u.id);
  const today = new Date().toISOString().slice(0, 10);
  const withState = tasks.map((t) => ({ ...t, state: t.status === 'DONE' ? 'COMPLETED' : (!t.due_date ? 'UPCOMING' : t.due_date < today ? 'OVERDUE' : t.due_date === today ? 'DUE_TODAY' : 'UPCOMING') }));
  res.json({ success: true, data: withState });
});

/* ---------- Timeline ---------- */
router.get('/cases/:id/timeline', loadCaseAndAuthorize(), async (req, res) => {
  res.json({ success: true, data: await all('SELECT * FROM audit_events WHERE case_id=? ORDER BY created_at', req.yamacase.id) });
});

/* ---------- Notes & messages ---------- */
router.get('/cases/:id/notes', loadCaseAndAuthorize(), async (req, res) => {
  res.json({ success: true, data: await all('SELECT * FROM case_notes WHERE case_id=? ORDER BY created_at', req.yamacase.id) });
});
router.post('/cases/:id/notes', loadCaseAndAuthorize(), async (req, res, next) => {
  try {
    const { body, visibility = 'TEAM' } = req.body || {};
    if (!body) return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Note body required.' } });
    const id = uuid();
    await run('INSERT INTO case_notes (id,case_id,author_id,body,visibility) VALUES (?,?,?,?,?)', id, req.yamacase.id, req.user.id, body, visibility);
    audit({ caseId: req.yamacase.id, actorId: req.user.id, eventType: 'NOTE_ADDED', detail: body.slice(0, 120) });
    res.status(201).json({ success: true, data: await row('SELECT * FROM case_notes WHERE id=?', id) });
  } catch (e) { next(e); }
});
router.get('/cases/:id/messages', loadCaseAndAuthorize(), async (req, res) => {
  res.json({ success: true, data: await all('SELECT m.*, u.full_name sender_name FROM messages m JOIN users u ON u.id=m.sender_id WHERE m.case_id=? ORDER BY m.created_at', req.yamacase.id) });
});
router.post('/cases/:id/messages', loadCaseAndAuthorize(), async (req, res, next) => {
  try {
    const { body } = req.body || {};
    if (!body) return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Message required.' } });
    const id = uuid();
    await run('INSERT INTO messages (id,case_id,sender_id,body) VALUES (?,?,?,?)', id, req.yamacase.id, req.user.id, body);
    const other = req.user.role === 'CITIZEN' ? req.yamacase.lawyer_id : req.yamacase.citizen_id;
    if (other) notify(other, 'MESSAGE', 'YamaLaw: new message', body.slice(0, 120), req.yamacase.id);
    res.status(201).json({ success: true, data: await row('SELECT * FROM messages WHERE id=?', id) });
  } catch (e) { next(e); }
});

/* ---------- AI assist (optional, never authoritative) ---------- */
router.post('/cases/:id/assist', loadCaseAndAuthorize(), async (req, res, next) => {
  try {
    const { prompt = '' } = req.body || {};
    const out = await assist({ prompt, context: `Case: ${req.yamacase.title}. Stage: ${req.yamacase.stage}. Facts: ${(req.yamacase.facts || '').slice(0, 1000)}` });
    res.json({ success: true, data: { ...out, disclaimer: 'Legal information only — not legal advice. Consult a qualified lawyer.' } });
  } catch (e) { next(e); }
});

module.exports = router;
