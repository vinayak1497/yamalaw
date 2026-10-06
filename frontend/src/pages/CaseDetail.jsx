import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../components/AuthContext.jsx';

export default function CaseDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [kase, setKase] = useState(null);
  const [journey, setJourney] = useState(null);
  const [readiness, setReadiness] = useState(null);
  const [docs, setDocs] = useState([]);
  const [evs, setEvs] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [notes, setNotes] = useState([]);
  const [msgs, setMsgs] = useState([]);
  const [hearings, setHearings] = useState([]);
  const [links, setLinks] = useState([]);
  const [msg, setMsg] = useState('');
  const [docKey, setDocKey] = useState('');
  const [noteBody, setNoteBody] = useState('');
  const [msgBody, setMsgBody] = useState('');

  const load = async () => {
    try {
      setKase(await api(`/cases/${id}`));
      try { setJourney(await api(`/cases/${id}/journey`)); } catch { setJourney(null); }
      try { setReadiness(await api(`/cases/${id}/readiness`)); } catch {}
      try { setDocs(await api(`/cases/${id}/documents`)); } catch {}
      try { setEvs(await api(`/cases/${id}/evidence`)); } catch {}
      try { setTasks(await api(`/cases/${id}/tasks`)); } catch {}
      try { setTimeline(await api(`/cases/${id}/timeline`)); } catch {}
      try { setNotes(await api(`/cases/${id}/notes`)); } catch {}
      try { setMsgs(await api(`/cases/${id}/messages`)); } catch {}
      try { setHearings(await api(`/cases/${id}/hearings`)); } catch {}
      try { setLinks(await api(`/research/case/${id}`)); } catch {}
    } catch (e) { setMsg(e.message); }
  };
  useEffect(() => { load(); }, [id]);

  const uploadDoc = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    const fd = new FormData(); fd.append('file', f); fd.append('document_key', docKey);
    await api(`/cases/${id}/documents`, { method: 'POST', form: fd });
    e.target.value = ''; load();
  };
  const uploadEv = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    const fd = new FormData(); fd.append('file', f); fd.append('description', 'Uploaded from YamaLaw case workspace');
    await api(`/cases/${id}/evidence`, { method: 'POST', form: fd });
    e.target.value = ''; load();
  };
  const verify = async (evId) => { const r = await api(`/evidence/${evId}/verify`, { method: 'POST' }); alert(`Integrity: ${r.integrity}\nStored: ${r.storedHash.slice(0, 32)}…`); load(); };
  const toggleTask = async (t) => { await api(`/journey/tasks/${t.id}`, { method: 'PATCH', body: { status: t.status === 'DONE' ? 'PENDING' : 'DONE' } }); load(); };
  const toggleCaseTask = async (t) => { await api(`/tasks/${t.id}`, { method: 'PATCH', body: { status: t.status === 'DONE' ? 'PENDING' : 'DONE' } }); load(); };

  if (!kase) return <p>Loading… {msg}</p>;
  return (
    <div>
      <div className="row"><h2 style={{ margin: 0 }}>{kase.title}</h2><span className="badge">{kase.case_number}</span><span className="badge info">{kase.stage}</span><span className="badge">{kase.status}</span></div>
      <p className="muted small">Jurisdiction: {kase.jurisdiction || '— not confirmed yet'} • {kase.facts}</p>
      {msg && <p className="notice">{msg}</p>}

      {readiness && (
        <div className="card" style={{ marginTop: 12 }}>
          <h3>Case Readiness — {readiness.overall}%</h3>
          <div className="progress"><span style={{ width: `${readiness.overall}%` }} /></div>
          <table className="tbl" style={{ marginTop: 10 }}><thead><tr><th>Area</th><th>Score</th><th>Weight</th><th>Missing</th></tr></thead>
            <tbody>{readiness.breakdown.map((b) => <tr key={b.key}><td>{b.label}</td><td>{b.score}%</td><td>{b.weight}%</td><td className="small">{(b.missing || []).join('; ') || '—'}</td></tr>)}</tbody></table>
          <h4>Next required actions</h4>
          <ol>{readiness.nextRequiredActions.map((a, i) => <li key={i}>{a}</li>)}</ol>
        </div>
      )}

      {journey && (
        <div className="card" style={{ marginTop: 12 }}>
          <h3>Legal Journey</h3>
          {journey.stages.map((s) => (
            <div key={s.id} style={{ marginBottom: 10 }}>
              <div className="row"><strong>{s.position + 1}. {s.title}</strong><span className="badge">{s.status}</span><span className="small muted">Responsible: {s.actor}</span></div>
              <p className="small muted">{s.explanation}</p>
              {s.tasks.map((t) => (
                <label key={t.id} className="small" style={{ fontWeight: 400, display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input type="checkbox" style={{ width: 18 }} checked={t.status === 'DONE'} onChange={() => toggleTask(t)} />
                  {t.title} {t.required ? '' : '(optional)'} <span className="badge">{t.status}</span>
                </label>
              ))}
            </div>
          ))}
          <h4>Requirements</h4>
          {journey.requirements.map((r) => <div key={r.id} className="small">{r.status === 'DONE' ? '✓' : '✗'} {r.label} <span className="badge">{r.status}</span></div>)}
        </div>
      )}

      <div className="grid two" style={{ marginTop: 12 }}>
        <div className="card">
          <h3>Document checklist</h3>
          <label>Document type for next upload</label>
          <select value={docKey} onChange={(e) => setDocKey(e.target.value)}>
            <option value=""> supporting (general)</option><option value="identity">identity</option><option value="rental_agreement">rental_agreement</option>
            <option value="payment_proof">payment_proof</option><option value="employment_contract">employment_contract</option><option value="salary_proof">salary_proof</option>
            <option value="communication">communication</option><option value="bank_statement">bank_statement</option><option value="legal_notice">legal_notice</option>
          </select>
          <label>Upload a document (PDF, DOCX, TXT, PNG, JPG)</label><input type="file" onChange={uploadDoc} />
          {docs.map((d) => <div key={d.id} className="small row">• {d.filename} <span className="badge">{d.mime.split('/')[1]}</span><a href={`${import.meta.env.VITE_API_URL || '/api'}/documents/${d.id}/download`}>Download</a></div>)}
        </div>
        <div className="card">
          <h3>Evidence &amp; chain of custody</h3>
          <label>Upload evidence</label><input type="file" onChange={uploadEv} />
          {evs.map((e) => (
            <div key={e.id} className="small" style={{ borderTop: '1px solid var(--line)', paddingTop: 6, marginTop: 6 }}>
              <Link to={`/evidence/${e.id}`}><strong>{e.evidence_code}</strong></Link> — {e.filename}
              <div className="row"><span className={`badge ${e.status === 'VERIFIED' ? 'ok' : 'warn'}`}>{e.status}</span>
                <button className="btn ghost" onClick={() => verify(e.id)}>Verify integrity</button></div>
              <div className="muted">SHA-256: {e.sha256.slice(0, 24)}… • {(e.size_bytes / 1024).toFixed(1)} KB</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid two" style={{ marginTop: 12 }}>
        <div className="card">
          <h3>Tasks &amp; deadlines</h3>
          {tasks.map((t) => <label key={t.id} className="small" style={{ fontWeight: 400, display: 'flex', gap: 8 }}><input type="checkbox" style={{ width: 18 }} checked={t.status === 'DONE'} onChange={() => toggleCaseTask(t)} />{t.title} — {t.due_date || 'no due date'} <span className="badge">{t.priority}</span></label>)}
          <AddTask caseId={id} onDone={load} />
        </div>
        <div className="card">
          <h3>Hearings</h3>
          {hearings.map((h) => <div key={h.id} className="small">• {h.title} — {h.scheduled_at} ({h.mode}) <span className="badge info">{h.status}</span>{h.mode === 'VIRTUAL' && <Link to={`/hearing/${h.id}`}> Join (demo WebRTC room)</Link>}</div>)}
          {['LAWYER', 'JUDGE', 'ADMIN'].includes(user?.role) && <AddHearing caseId={id} onDone={load} />}
        </div>
      </div>

      <div className="grid two" style={{ marginTop: 12 }}>
        <div className="card">
          <h3>Messages — client ↔ lawyer</h3>
          {msgs.map((m) => <div key={m.id} className="small"><strong>{m.sender_name}:</strong> {m.body}</div>)}
          <div className="row" style={{ marginTop: 8 }}><input value={msgBody} onChange={(e) => setMsgBody(e.target.value)} placeholder="Write a message…" /><button className="btn" onClick={async () => { await api(`/cases/${id}/messages`, { method: 'POST', body: { body: msgBody } }); setMsgBody(''); load(); }}>Send</button></div>
        </div>
        <div className="card">
          <h3>Case notes</h3>
          {notes.map((n) => <div key={n.id} className="small">• {n.body}</div>)}
          {['LAWYER', 'JUDGE', 'ADMIN'].includes(user?.role) && (
            <div className="row" style={{ marginTop: 8 }}><input value={noteBody} onChange={(e) => setNoteBody(e.target.value)} placeholder="Add a case note…" /><button className="btn secondary" onClick={async () => { await api(`/cases/${id}/notes`, { method: 'POST', body: { body: noteBody } }); setNoteBody(''); load(); }}>Add</button></div>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <h3>Attached legal research</h3>
        {links.map((l) => <div key={l.id} className="small">• {l.title} <span className="muted">{l.citation}</span></div>)}
        <Link className="btn secondary" to="/research">Search &amp; attach research</Link>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <h3>Case timeline</h3>
        <div className="timeline">{timeline.map((e) => <div key={e.id}><span className="dot" /><div className="small muted">{e.created_at}</div><div><strong>{e.event_type}</strong> — {e.detail}</div></div>)}</div>
      </div>
    </div>
  );
}

function AddTask({ caseId, onDone }) {
  const [t, setT] = useState({ title: '', due_date: '', priority: 'MEDIUM' });
  return (
    <form className="row" onSubmit={async (e) => { e.preventDefault(); await api(`/cases/${caseId}/tasks`, { method: 'POST', body: t }); setT({ title: '', due_date: '', priority: 'MEDIUM' }); onDone(); }}>
      <input placeholder="New task" value={t.title} onChange={(e) => setT({ ...t, title: e.target.value })} required style={{ flex: 2 }} />
      <input type="date" value={t.due_date} onChange={(e) => setT({ ...t, due_date: e.target.value })} />
      <button className="btn secondary" type="submit">Add</button>
    </form>
  );
}
function AddHearing({ caseId, onDone }) {
  const [h, setH] = useState({ title: '', scheduled_at: '', mode: 'PHYSICAL', venue: '' });
  return (
    <form className="row" onSubmit={async (e) => { e.preventDefault(); await api(`/cases/${caseId}/hearings`, { method: 'POST', body: h }); onDone(); }}>
      <input placeholder="Hearing title" value={h.title} onChange={(e) => setH({ ...h, title: e.target.value })} required style={{ flex: 2 }} />
      <input type="date" value={h.scheduled_at} onChange={(e) => setH({ ...h, scheduled_at: e.target.value })} required />
      <select value={h.mode} onChange={(e) => setH({ ...h, mode: e.target.value })}><option>PHYSICAL</option><option>VIRTUAL</option></select>
      <button className="btn secondary" type="submit">Schedule</button>
    </form>
  );
}
