'use strict';
/* Case Readiness — transparent, computed from structured data. Never faked. */
const config = require('../config');
const { all, row } = require('../db');

async function computeReadiness(caseId) {
  const c = await row('SELECT * FROM cases WHERE id=?', caseId);
  if (!c) return null;
  const weights = config.READINESS_WEIGHTS;

  const docs = await all('SELECT * FROM documents WHERE case_id=?', caseId);
  const evs = await all('SELECT * FROM evidence WHERE case_id=?', caseId);
  const journey = await row('SELECT * FROM legal_journeys WHERE case_id=?', caseId);
  let reqs = [];
  let tasks = [];
  if (journey) {
    reqs = await all('SELECT * FROM journey_requirements WHERE journey_id=?', journey.id);
    const stageIds = (await all('SELECT id FROM journey_stages WHERE journey_id=?', journey.id)).map((s) => s.id);
    if (stageIds.length) {
      const ph = stageIds.map(() => '?').join(',');
      tasks = await all(`SELECT * FROM journey_tasks WHERE stage_id IN (${ph})`, ...stageIds);
    }
  }
  const caseTasks = await all('SELECT * FROM case_tasks WHERE case_id=?', caseId);

  // Documents: fraction of required doc requirements satisfied
  const docReqs = reqs.filter((r) => r.kind === 'document');
  const docKeys = new Set(docs.map((d) => (d.document_key || '').toLowerCase()));
  let docScore = 0; const docMissing = [];
  if (!docReqs.length) docScore = docs.length ? 100 : 40;
  else {
    let hit = 0;
    for (const r of docReqs) {
      const k = (r.document_key || '').toLowerCase();
      const ok = (k && docKeys.has(k)) || docs.length > 0 && !k;
      if (ok) { hit++; r.status = 'DONE'; } else docMissing.push(r.label);
    }
    docScore = Math.round((hit / docReqs.length) * 100);
  }

  // Evidence: present + verified
  let evScore = 0;
  if (!evs.length) evScore = 0;
  else {
    const verified = evs.filter((e) => e.status === 'VERIFIED').length;
    evScore = Math.round(60 + (40 * verified) / evs.length);
  }
  const evMissing = evs.length ? [] : ['Upload at least one evidence item'];

  // Information: facts + parties + tasks completion
  const infoDone = (c.facts && c.facts.length > 20 ? 1 : 0) + (tasks.filter((t) => t.kind === 'info' && t.status === 'DONE').length > 0 ? 1 : 0);
  const infoScore = Math.round((infoDone / 2) * 100);

  // Prerequisites: legal notice / filing tasks
  const preTasks = tasks.filter((t) => ['draft', 'filing', 'review'].includes(t.kind));
  const preScore = !preTasks.length ? 30 : Math.round((preTasks.filter((t) => t.status === 'DONE').length / preTasks.length) * 100);
  const preMissing = preTasks.filter((t) => t.status !== 'DONE').map((t) => t.title);

  // Jurisdiction
  const jurScore = c.jurisdiction ? 100 : 20;
  // Procedural: hearings scheduled + case tasks done
  const procItems = [...caseTasks];
  const procScore = !procItems.length ? 30 : Math.round((procItems.filter((t) => t.status === 'DONE').length / procItems.length) * 100);

  const total = weights.documents + weights.evidence + weights.information + weights.prerequisites + weights.jurisdiction + weights.procedural;
  const overall = Math.round(
    (docScore * weights.documents + evScore * weights.evidence + infoScore * weights.information +
      preScore * weights.prerequisites + jurScore * weights.jurisdiction + procScore * weights.procedural) / total
  );

  const next = [...docMissing.map((m) => `Upload: ${m}`), ...evMissing, ...preMissing.map((m) => `Complete: ${m}`)];
  if (!c.jurisdiction) next.push('Confirm jurisdiction / authority');
  if (!c.lawyer_id) next.push('Request lawyer assignment');

  return {
    overall,
    weights,
    breakdown: [
      { key: 'documents', label: 'Required documents', score: docScore, weight: weights.documents, missing: docMissing },
      { key: 'evidence', label: 'Evidence', score: evScore, weight: weights.evidence, missing: evMissing },
      { key: 'information', label: 'Basic information', score: infoScore, weight: weights.information, missing: c.facts ? [] : ['Add basic facts of the matter'] },
      { key: 'prerequisites', label: 'Legal prerequisites', score: preScore, weight: weights.prerequisites, missing: preMissing },
      { key: 'jurisdiction', label: 'Jurisdiction information', score: jurScore, weight: weights.jurisdiction, missing: c.jurisdiction ? [] : ['Confirm jurisdiction'] },
      { key: 'procedural', label: 'Procedural preparation', score: procScore, weight: weights.procedural, missing: [] },
    ],
    nextRequiredActions: next.slice(0, 5),
  };
}

module.exports = { computeReadiness };
