'use strict';
/* RBAC + object-level authorization. Backend is authoritative — never trust the frontend. */
const { row } = require('../db');

function requireRole(...roles) {
  return async (req, res, next) => {
    if (!req.user) return res.status(401).json({ success: false, error: { code: 'UNAUTHENTICATED', message: 'Sign in required.' } });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have permission for this action.' } });
    }
    next();
  };
}

/** Load case and enforce ownership / assignment. Citizens see only their cases. */
function loadCaseAndAuthorize({ allowRoles = ['CITIZEN', 'LAWYER', 'JUDGE', 'POLICE', 'ADMIN'] } = {}) {
  return async (req, res, next) => {
    const id = req.params.id || req.params.caseId || req.body.case_id || req.body.caseId;
    if (!id) return res.status(400).json({ success: false, error: { code: 'CASE_ID_REQUIRED', message: 'Case id is required.' } });
    const c = await row('SELECT * FROM cases WHERE id=?', id);
    if (!c) return res.status(404).json({ success: false, error: { code: 'CASE_NOT_FOUND', message: 'The requested case was not found.' } });
    const u = req.user;
    if (!allowRoles.includes(u.role)) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not permitted.' } });
    if (u.role === 'ADMIN') { req.yamacase = c; return next(); }
    if (u.role === 'CITIZEN' && c.citizen_id !== u.id) {
      return res.status(403).json({ success: false, error: { code: 'CASE_FORBIDDEN', message: 'You can only access your own cases.' } });
    }
    if (u.role === 'LAWYER' && c.lawyer_id !== u.id) {
      // Lawyers may view unassigned pool but not private details via this guard; allow list, block detail
      return res.status(403).json({ success: false, error: { code: 'CASE_FORBIDDEN', message: 'This case is not assigned to you.' } });
    }
    if (u.role === 'JUDGE' && c.judge_id && c.judge_id !== u.id) {
      return res.status(403).json({ success: false, error: { code: 'CASE_FORBIDDEN', message: 'This case is not in your docket.' } });
    }
    req.yamacase = c;
    next();
  };
}

module.exports = { requireRole, loadCaseAndAuthorize };
