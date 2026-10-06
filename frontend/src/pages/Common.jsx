import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useTranslation } from 'react-i18next';

export function Research() {
  const { t } = useTranslation();
  const [q, setQ] = useState('');
  const [res, setRes] = useState([]);
  const [note, setNote] = useState('');
  const [cases, setCases] = useState([]);
  useEffect(() => { api('/cases').then(setCases).catch(() => {}); }, []);
  const search = async (e) => {
    e.preventDefault();
    try { const r = await api(`/research/search?q=${encodeURIComponent(q)}`); setRes(r); setNote(r.length ? '' : t('research.noSource')); }
    catch (e2) { setNote(e2.message); }
  };
  const attach = async (docId) => {
    const caseId = prompt('Attach to which case id? Available:\n' + cases.map((c) => `${c.title} — ${c.id}`).join('\n'));
    if (!caseId) return;
    await api('/research/link-case', { method: 'POST', body: { case_id: caseId.trim(), document_id: docId } });
    alert('Attached to case.');
  };
  const bookmark = async (docId) => { await api('/research/bookmarks', { method: 'POST', body: { document_id: docId } }); alert('Bookmarked.'); };
  return (
    <div>
      <h2>{t('research.title')}</h2>
      <p className="muted small">Every explanation is traceable to its source. AI never invents case names or citations here.</p>
      <form className="row" onSubmit={search}><input style={{ flex: 1 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('research.searchPh')} /><button className="btn" type="submit">Search</button></form>
      {note && <p className="notice">{note}</p>}
      {res.map((d) => (
        <div className="card" key={d.id} style={{ marginTop: 10 }}>
          <div className="row"><strong>{d.title}</strong><span className="badge info">relevance {d.relevance}%</span></div>
          <p className="small muted">{d.court} • {d.doc_date} • <code>{d.citation}</code> • Source: {d.source}</p>
          <p>{d.summary}</p>
          <p className="small muted">{d.excerpt}…</p>
          <div className="row"><button className="btn secondary" onClick={() => bookmark(d.id)}>Bookmark</button><button className="btn ghost" onClick={() => attach(d.id)}>{t('research.attach')}</button><Matched terms={d.matchedTerms} /></div>
        </div>
      ))}
    </div>
  );
}
function Matched({ terms }) {
  if (!terms?.length) return null;
  return <span className="small muted">Matched: {terms.join(', ')} — shown so you know why this result was retrieved.</span>;
}

export function LegalAid() {
  const { t } = useTranslation();
  const [providers, setProviders] = useState([]);
  const [form, setForm] = useState({ annual_income: 200000, category_slug: 'tenancy', state: 'Maharashtra' });
  const [out, setOut] = useState(null);
  useEffect(() => { api('/legal-aid/providers').then(setProviders).catch(() => {}); }, []);
  const check = async (e) => { e.preventDefault(); setOut(await api('/legal-aid/evaluate', { method: 'POST', body: form })); };
  const apply = async (pid) => {
    const caseId = prompt('Case id (optional):') || null;
    await api('/legal-aid/apply', { method: 'POST', body: { provider_id: pid, case_id: caseId, reason: 'Requesting assistance via YamaLaw' } });
    alert('Application submitted (demo).');
  };
  return (
    <div>
      <h2>{t('aid.title')}</h2>
      <div className="card">
        <form className="row" onSubmit={check}>
          <label>Annual income (₹)<input type="number" value={form.annual_income} onChange={(e) => setForm({ ...form, annual_income: e.target.value })} /></label>
          <label>Category<input value={form.category_slug} onChange={(e) => setForm({ ...form, category_slug: e.target.value })} /></label>
          <label>State<input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} /></label>
          <button className="btn" type="submit">{t('aid.check')}</button>
        </form>
        {out && (
          <div style={{ marginTop: 10 }}>
            <p><span className={`badge ${out.eligible ? 'ok' : 'warn'}`}>{out.eligible ? 'MAY QUALIFY' : 'NOT MATCHED'}</span> {out.verdict}</p>
            <p className="small">Why: {out.matchedRules.map((r) => r.name).join('; ') || 'no demo rule matched'}</p>
            <p className="small muted">{out.disclaimer}</p>
          </div>
        )}
      </div>
      <h3>Providers</h3>
      {providers.map((p) => <div className="card" key={p.id} style={{ marginTop: 8 }}><strong>{p.name}</strong> <span className="badge">{p.kind}</span><p className="small">{p.address} • {p.contact} • Languages: {p.languages}</p><button className="btn secondary" onClick={() => apply(p.id)}>Request assistance</button></div>)}
      <p className="notice" style={{ marginTop: 10 }}>{t('aid.disclaimer')}</p>
    </div>
  );
}

export function Hearings() {
  const [list, setList] = useState([]);
  useEffect(() => { api('/hearings/upcoming').then(setList).catch(() => {}); }, []);
  return (
    <div><h2>Hearings</h2>
      {list.map((h) => <div className="card" key={h.id} style={{ marginBottom: 8 }}><strong>{h.title}</strong><p className="small">{h.case_title} • {h.scheduled_at} • {h.mode} • {h.venue} <span className="badge info">{h.status}</span></p></div>)}
      {!list.length && <p className="muted">No upcoming hearings.</p>}
    </div>
  );
}

export function Notifications() {
  const [list, setList] = useState([]);
  const load = () => api('/notifications').then(setList).catch(() => {});
  useEffect(load, []);
  return (
    <div><h2>Notifications</h2>
      {list.map((n) => <div className="card" key={n.id} style={{ marginBottom: 8, opacity: n.read_at ? .7 : 1 }}><strong>{n.title}</strong><p className="small">{n.body}</p><div className="small muted">{n.created_at} • {n.kind}</div>{!n.read_at && <button className="btn ghost" onClick={async () => { await api(`/notifications/${n.id}/read`, { method: 'PATCH' }); load(); }}>Mark read</button>}</div>)}
    </div>
  );
}

export function Profile() {
  const [me, setMe] = useState(null);
  const [lang, setLang] = useState('en');
  useEffect(() => { api('/auth/me').then((u) => { setMe(u); setLang(u.language || 'en'); }).catch(() => {}); }, []);
  if (!me) return <p>Loading…</p>;
  return (
    <div className="card" style={{ maxWidth: 560 }}><h2>Profile</h2>
      <p><strong>{me.full_name}</strong> • {me.role} • {me.email}</p>
      <label>Preferred language</label>
      <select value={lang} onChange={(e) => setLang(e.target.value)}><option value="en">English</option><option value="hi">हिन्दी</option><option value="mr">मराठी</option></select>
      <div className="row" style={{ marginTop: 10 }}><button className="btn" onClick={async () => { const u = await api('/auth/me', { method: 'PATCH', body: { language: lang } }); localStorage.setItem('yamalaw-user', JSON.stringify({ ...me, language: u.language })); alert('Saved.'); }}>Save</button></div>
    </div>
  );
}
