import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api.js';

export default function EvidenceDetail() {
  const { id } = useParams();
  const [ev, setEv] = useState(null);
  const [msg, setMsg] = useState('');
  const load = () => api(`/evidence/${id}`).then(setEv).catch((e) => setMsg(e.message));
  useEffect(load, [id]);
  const verify = async () => { const r = await api(`/evidence/${id}/verify`, { method: 'POST' }); setMsg(`Integrity: ${r.integrity}. Stored hash matches current file: ${r.integrity === 'VERIFIED' ? 'yes' : 'NO — flagged'}.`); load(); };
  if (!ev) return <p>Loading… {msg}</p>;
  return (
    <div>
      <h2>Evidence {ev.evidence_code}</h2>
      {msg && <p className="notice">{msg}</p>}
      <div className="card">
        <div className="row"><strong>{ev.filename}</strong><span className={`badge ${ev.status === 'VERIFIED' ? 'ok' : 'warn'}`}>{ev.status}</span></div>
        <table className="tbl"><tbody>
          <tr><td>Evidence ID</td><td><code>{ev.evidence_code}</code></td></tr>
          <tr><td>Integrity</td><td>{ev.status}</td></tr>
          <tr><td>SHA-256</td><td><code className="small">{ev.sha256}</code></td></tr>
          <tr><td>Uploaded</td><td>{ev.created_at} IST</td></tr>
          <tr><td>Size / type</td><td>{(ev.size_bytes / 1024).toFixed(1)} KB • {ev.mime}</td></tr>
          <tr><td>Description</td><td>{ev.description}</td></tr>
        </tbody></table>
        <div className="row" style={{ marginTop: 10 }}>
          <button className="btn" onClick={verify}>Verify integrity now</button>
          <a className="btn secondary" href={`${import.meta.env.VITE_API_URL || '/api'}/evidence/${ev.id}/download`}>Download</a>
        </div>
      </div>
      <div className="card" style={{ marginTop: 12 }}>
        <h3>Chain of custody</h3>
        <div className="timeline">{(ev.accessHistory || []).map((a) => <div key={a.id}><span className="dot" /><div className="small muted">{a.created_at}</div><div><strong>{a.action}</strong> by {a.actor_name} {a.detail}</div></div>)}</div>
      </div>
    </div>
  );
}
