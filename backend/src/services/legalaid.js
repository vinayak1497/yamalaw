'use strict';
/* Legal-aid rule evaluation — configurable demo rules, clearly marked. */
const { all, row } = require('../db');

async function evaluate({ annualIncome = 0, category = '', state = '', categorySlug = '' }) {
  const rules = await all('SELECT * FROM legal_aid_rules');
  const providers = await all('SELECT * FROM legal_aid_providers');
  const matched = [];
  for (const r of rules) {
    const incomeOk = !r.max_income || Number(annualIncome) <= r.max_income;
    const cats = (r.categories || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
    const catOk = !cats.length || cats.includes('all') || cats.includes(String(categorySlug || category).toLowerCase());
    const states = (r.states || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
    const stateOk = !states.length || states.includes('all') || states.includes(String(state).toLowerCase());
    if (incomeOk && catOk && stateOk) matched.push(r);
  }
  const eligible = matched.length > 0;
  const relevantProviders = providers.filter((p) => {
    if (!state) return true;
    return !p.state || p.state.toLowerCase() === String(state).toLowerCase() || p.state.toLowerCase() === 'all';
  }).slice(0, 6);
  return {
    eligible,
    verdict: eligible ? 'You may qualify for free legal assistance.' : 'Based on the demo rules, you may not qualify — a DLSA can still confirm.',
    matchedRules: matched,
    providers: relevantProviders,
    disclaimer: 'Demo eligibility rules. Final eligibility is decided by the District Legal Services Authority (DLSA) / NALSA norms.',
  };
}

module.exports = { evaluate };
