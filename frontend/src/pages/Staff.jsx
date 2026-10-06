import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';

export function LawyerDash() {
  const [d, setD] = useState(null);
  useEffect(() => { api('/dashboard').then(setD).catch(() => {}); }, []);
  if (!d) return <p>Loading…</p>;
  const accept = async (id) => { await api(`/cases/${id}/assign`, { method: 'POST', body: { action: 'accept' } }); setD(await api('/dashboard')); };
  return (
    <div>
      <h2>Lawyer workspace — YamaLaw</h2>
      <h3>My cases</h3>
      {(d.cases || []).map((c) => <div className="card" key={c.id} style={{ marginBottom: 8 }}><Link to={`/cases/${c.id}`}><strong>{c.title}</strong></Link> <span className="badge info">{c.stage}</span><div className="small muted">{c.case_number}</div></div>)}
      <h3>Unassigned pool (accept to take up)</h3>
      {(d.pool || []).map((c) => <div className="card" key={c.id} style={{ marginBottom: 8 }}><strong>{c.title}</strong><div className="small muted">{c.case_number} • {c.jurisdiction}</div><button className="btn secondary" onClick={() => accept(c.id)}>Accept case</button> <Link className="btn ghost" to={`/cases/${c.id}`}>Inspect</Link></div>)}
      <h3>My tasks</h3>
      {(d.tasks || []).map((t) => <div key={t.id} className="small">• {t.title} — {t.due_date}</div>)}
    </div>
  );
}

export function JudgeDash() {
  const [d, setD] = useState(null);
  useEffect(() => { api('/dashboard').then(setD).catch(() => {}); }, []);
  if (!d) return <p>Loading…</p>;
  return (
    <div>
      <h2>Judge docket — YamaLaw (demo / simulation)</h2>
      <p className="notice">Demo simulation only — not a real court system. Orders entered here are illustrative.</p>
      <h3>Hearing schedule</h3>
      {(d.hearings || []).map((h) => <div className="card" key={h.id} style={{ marginBottom: 8 }}><strong>{h.title}</strong><div className="small">{h.case_title} • {h.scheduled_at} • {h.mode}</div>{h.mode === 'VIRTUAL' && <Link to={`/hearing/${h.id}`}>Open virtual hearing (demo)</Link>}</div>)}
      <h3>Cases</h3>
      {(d.cases || []).map((c) => <div key={c.id} className="small"><Link to={`/cases/${c.id}`}>{c.title}</Link> — {c.stage} [{c.status}]</div>)}
    </div>
  );
}

export function PoliceDash() {
  const [d, setD] = useState(null);
  const [form, setForm] = useState({ station_name: '', incident_date: '', place: '', description: '', sections: '' });
  useEffect(() => { api('/dashboard').then(setD).catch(() => {}); }, []);
  const file = async (e) => { e.preventDefault(); await api('/firs', { method: 'POST', body: form }); setForm({ station_name: '', incident_date: '', place: '', description: '', sections: '' }); setD(await api('/dashboard')); };
  if (!d) return <p>Loading…</p>;
  return (
    <div className="grid two">
      <div>
        <h2>Police / authority — FIR intake</h2>
        <div className="card"><form onSubmit={file}>
          <label>Station</label><input value={form.station_name} onChange={(e) => setForm({ ...form, station_name: e.target.value })} />
          <label>Incident date</label><input type="date" value={form.incident_date} onChange={(e) => setForm({ ...form, incident_date: e.target.value })} />
          <label>Place</label><input value={form.place} onChange={(e) => setForm({ ...form, place: e.target.value })} />
          <label>Description *</label><textarea rows="4" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
          <label>Sections</label><input value={form.sections} onChange={(e) => setForm({ ...form, sections: e.target.value })} />
          <div className="row" style={{ marginTop: 8 }}><button className="btn" type="submit">File FIR (demo)</button></div>
        </form></div>
      </div>
      <div>
        <h2>Recent FIRs</h2>
        {(d.firs || []).map((f) => <div className="card" key={f.id} style={{ marginBottom: 8 }}><strong>{f.fir_number}</strong> <span className="badge">{f.status}</span><p className="small">{f.description}</p><div className="small muted">{f.station_name} • {f.incident_date}</div></div>)}
      </div>
    </div>
  );
}

export function AdminDash() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [audit, setAudit] = useState([]);
  useEffect(() => {
    api('/admin/stats').then(setStats).catch(() => {});
    api('/admin/users').then(setUsers).catch(() => {});
    api('/admin/audit').then(setAudit).catch(() => {});
  }, []);
  if (!stats) return <p>Loading…</p>;
  return (
    <div>
      <h2>Operations — YamaLaw Admin</h2>
      <div className="row">{Object.entries(stats).map(([k, v]) => <span key={k} className="badge info">{k}: {v}</span>)}</div>
      <h3>Users</h3>
      <table className="tbl"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Demo</th></tr></thead><tbody>
        {users.map((u) => <tr key={u.id}><td>{u.full_name}</td><td className="small">{u.email}</td><td>{u.role}</td><td>{u.is_demo ? 'yes' : 'no'}</td></tr>)}
      </tbody></table>
      <h3>Audit log</h3>
      {audit.slice(0, 30).map((a) => <div key={a.id} className="small">{a.created_at} • <strong>{a.event_type}</strong> • {a.detail}</div>)}
    </div>
  );
}

export function HearingRoom() {
  return (
    <div className="card"><h2>Virtual hearing (demo WebRTC room)</h2>
      <p className="muted">The original platform used WebRTC + signaling. This YamaLaw room is a clearly-labelled demo placeholder that keeps the workflow (scheduled hearing → join → notes) without claiming a production court video system.</p>
      <video controls style={{ width: '100%', background: '#111', borderRadius: 8 }} aria-label="Demo hearing video area" />
      <p className="small muted">Full WebRTC mesh can be enabled via WEBRTC_ENABLED with the existing signaling design.</p>
    </div>
  );
}
