'use strict';
const { v4: uuid } = require('uuid');
const { run } = require('../db');
const config = require('../config');

async function notify(userId, kind, title, body = '', caseId = '') {
  if (!config.NOTIFICATIONS_ENABLED) return null;
  const id = uuid();
  try {
    await run('INSERT INTO notifications (id,user_id,kind,title,body,case_id) VALUES (?,?,?,?,?,?)', id, userId, kind, title, body, caseId);
  } catch { return null; }
  return id;
}

async function audit({ caseId = '', issueId = '', actorId = '', eventType, detail = '' }) {
  const id = uuid();
  try {
    await run('INSERT INTO audit_events (id,case_id,issue_id,actor_id,event_type,detail) VALUES (?,?,?,?,?,?)', id, caseId, issueId, actorId, eventType, detail);
  } catch { /* ignore */ }
  return id;
}

module.exports = { notify, audit };
