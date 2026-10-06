'use strict';
/* LLM abstraction — Ollama primary, optional cloud, always safe when disabled. */
const config = require('../config');

async function ollamaChat(messages) {
  const res = await fetch(`${config.OLLAMA_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: config.OLLAMA_MODEL, messages, stream: false }),
  });
  if (!res.ok) throw new Error(`Ollama error ${res.status}`);
  const data = await res.json();
  return data.message?.content || '';
}

async function assist({ prompt, context = '' }) {
  if (!config.AI_ENABLED) {
    return { enabled: false, text: '', note: 'AI is disabled. Rule-based guidance is used instead.' };
  }
  if (config.OLLAMA_ENABLED) {
    try {
      const text = await ollamaChat([
        { role: 'system', content: 'You are YamaLaw, a legal-information assistant. Give general legal information only, never claim to be a lawyer, always cite that the user should consult a qualified lawyer. Never invent case names, citations or statutes.' },
        { role: 'user', content: `${prompt}\n\nContext:\n${context}` },
      ]);
      return { enabled: true, provider: 'ollama', model: config.OLLAMA_MODEL, text };
    } catch (e) {
      return { enabled: true, provider: 'ollama', error: true, text: '', note: `Local AI unavailable: ${e.message}. Rule-based guidance used.` };
    }
  }
  return { enabled: true, provider: 'none', text: '', note: 'No AI provider configured. Rule-based guidance used.' };
}

module.exports = { assist };
