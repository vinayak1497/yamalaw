import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api.js';
import { useAuth } from '../components/AuthContext.jsx';

function ReadinessBar({ value }) {
  return <div className="progress" role="progressbar" aria-valuenow={value} aria-valuemin="0" aria-valuemax="100"><span style={{ width: `${value}%` }} /></div>;
}

export function CitizenDashboard() {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [readiness, setReadiness] = useState({});
  useEffect(() => {
    api('/dashboard').then(async (d) => {
      setData(d);
      const map = {};
      for (const c of d.cases || []) { try { map[c.id] = (await api(`/cases/${c.id}/readiness`)).overall; } catch { map[c.id] = null; } }
      setReadiness(map);
    }).catch(() => {});
  }, []);
  if (!data) return <p>{t('common.loading')}</p>;
  return (
    <div>
      <h2>{t('dashboard.active')}</h2>
      {(!data.cases || !data.cases.length) && <div className="card"><p>No active matters yet. Describe your problem to start a guided legal journey.</p><Link className="btn" to="/issues">Start a legal issue</Link></div>}
      <div className="grid two">
        {(data.cases || []).map((c) => (
          <div className="card" key={c.id}>
            <div className="row"><strong><Link to={`/cases/${c.id}`}>{c.title}</Link></strong><span className="badge info">{c.stage}</span><span className="badge">{c.case_number}</span></div>
            <p className="small muted">{t('dashboard.readiness')}: {readiness[c.id] ?? '…'}%</p>
            <ReadinessBar value={readiness[c.id] || 0} />
            <p className="small">{t('dashboard.lawyer')}: {c.lawyer_id ? 'Assigned' : 'Not yet assigned'}</p>
            <Link className="btn secondary" to={`/cases/${c.id}`}>Open case workspace</Link>
          </div>
        ))}
      </div>
      <div className="grid two" style={{ marginTop: 16 }}>
        <div className="card"><h3>Upcoming tasks</h3>{(data.tasks || []).map((x) => <div key={x.id} className="small">• {x.title} — {x.due_date || 'no due date'}</div>) || <p className="muted">Nothing due.</p>}</div>
        <div className="card"><h3>{t('nav.hearings')}</h3>{(data.hearings || []).map((h) => <div key={h.id} className="small">• {h.title} — {h.scheduled_at}</div>) || <p className="muted">No hearings scheduled.</p>}</div>
      </div>
    </div>
  );
}

export function Issues() {
  const [list, setList] = useState([]);
  const [cats, setCats] = useState([]);
  const [form, setForm] = useState({ title: '', description: '', category_slug: '' });
  const [msg, setMsg] = useState('');
  const load = () => { api('/issues').then(setList).catch(() => {}); api('/categories').then(setCats).catch(() => {}); };
  useEffect(load, []);
  const submit = async (e) => {
    e.preventDefault(); setMsg('');
    try { const r = await api('/issues', { method: 'POST', body: form }); setMsg(`Journey created for ${(r.category || {}).name_en || 'your matter'}.`); setForm({ title: '', description: '', category_slug: '' }); load(); }
    catch (e2) { setMsg(e2.message); }
  };
  return (
    <div className="grid two">
      <div className="card">
        <h2>Describe your problem</h2>
        <p className="muted small">Write in your own words. YamaLaw classifies it, builds a stored legal journey and tells you the next step.</p>
        <form onSubmit={submit}>
          <label>Short title</label><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Landlord kept my deposit" />
          <label>What happened? *</label><textarea rows="5" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required placeholder="e.g. My landlord has not returned my ₹50,000 security deposit…" />
          <label>Category (optional — auto-detected)</label>
          <select value={form.category_slug} onChange={(e) => setForm({ ...form, category_slug: e.target.value })}><option value="">Auto-detect</option>{cats.map((c) => <option key={c.id} value={c.slug}>{c.name_en}</option>)}</select>
          <div className="row" style={{ marginTop: 10 }}><button className="btn" type="submit">Create legal journey</button></div>
        </form>
        {msg && <p className="notice">{msg}</p>}
      </div>
      <div>
        <h2>My Legal Issues</h2>
        {list.map((i) => <div className="card" key={i.id} style={{ marginBottom: 10 }}><strong>{i.title}</strong><p className="small muted">{i.description}</p>
          <div className="row"><Link className="btn secondary" to={`/cases/new?issue=${i.id}`}>Open a case from this</Link></div></div>)}
      </div>
    </div>
  );
}

export function CasesList() {
  const { user } = useAuth();
  const [list, setList] = useState([]);
  useEffect(() => { api('/cases').then(setList).catch(() => {}); }, []);
  return (
    <div>
      <div className="row"><h2>My Cases</h2><span className="spacer" />{user?.role === 'CITIZEN' && <Link className="btn" to="/issues">+ New legal issue</Link>}</div>
      <table className="tbl"><thead><tr><th>Case</th><th>Stage</th><th>Status</th><th>Jurisdiction</th></tr></thead>
        <tbody>{list.map((c) => <tr key={c.id}><td><Link to={`/cases/${c.id}`}>{c.title}</Link><div className="small muted">{c.case_number}</div></td><td>{c.stage}</td><td><span className="badge info">{c.status}</span></td><td className="small">{c.jurisdiction}</td></tr>)}</tbody></table>
    </div>
  );
}

export function NewCase() {
  const [form, setForm] = useState({ title: '', facts: '', jurisdiction: '' });
  const [msg, setMsg] = useState('');
  const params = new URLSearchParams(window.location.search);
  const issueId = params.get('issue') || '';
  const submit = async (e) => {
    e.preventDefault();
    try { const r = await api('/cases', { method: 'POST', body: { ...form, issue_id: issueId || undefined } }); window.location.href = `/cases/${r.kase.id}`; }
    catch (e2) { setMsg(e2.message); }
  };
  return (
    <div className="card" style={{ maxWidth: 640 }}>
      <h2>Open a case</h2>
      <form onSubmit={submit}>
        <label>Case title</label><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        <label>Basic facts</label><textarea rows="4" value={form.facts} onChange={(e) => setForm({ ...form, facts: e.target.value })} />
        <label>Jurisdiction <span className="muted">(which court or authority is allowed to handle your matter)</span></label><input value={form.jurisdiction} onChange={(e) => setForm({ ...form, jurisdiction: e.target.value })} />
        {msg && <p className="notice">{msg}</p>}
        <button className="btn" type="submit">Create case</button>
      </form>
    </div>
  );
}
