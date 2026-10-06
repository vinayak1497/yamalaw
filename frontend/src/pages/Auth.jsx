import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../components/AuthContext.jsx';
import { api } from '../api.js';

export function Login() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [err, setErr] = useState('');
  const [demo, setDemo] = useState([]);
  const submit = async (e) => {
    e.preventDefault(); setErr('');
    try { const d = await login(form.email, form.password); nav(d.user.role === 'CITIZEN' ? '/dashboard' : d.user.role === 'LAWYER' ? '/lawyer' : d.user.role === 'JUDGE' ? '/judge' : d.user.role === 'POLICE' ? '/police' : '/admin'); }
    catch (e2) { setErr(e2.message); }
  };
  const loadDemo = async () => setDemo(await api('/auth/demo-credentials', { auth: false }));
  return (
    <div className="card" style={{ maxWidth: 520 }}>
      <img src="/logo.png" alt="YamaLaw logo" className="auth-logo" />
      <h2>{t('auth.welcome')}</h2>
      <form onSubmit={submit}>
        <label htmlFor="email">Email</label><input id="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        <label htmlFor="pw">Password</label><input id="pw" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        {err && <p className="notice" role="alert">{err}</p>}
        <div className="row" style={{ marginTop: 12 }}><button className="btn" type="submit">{t('nav.login')}</button><Link to="/signup">{t('auth.noAccount')}</Link></div>
      </form>
      <hr />
      <button className="btn secondary" type="button" onClick={loadDemo}>Show YamaLaw demo accounts</button>
      {demo.map((d) => (
        <div key={d.email} className="row small" style={{ marginTop: 6 }}>
          <span className="badge">{d.role}</span><code>{d.email} / {d.password}</code>
          <button className="btn ghost" type="button" onClick={() => setForm({ email: d.email, password: d.password })}>Use</button>
        </div>
      ))}
    </div>
  );
}

export function Signup() {
  const { signup } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ full_name: '', email: '', password: '', role: 'CITIZEN', phone: '' });
  const [err, setErr] = useState('');
  const submit = async (e) => {
    e.preventDefault(); setErr('');
    try { await signup(form); nav('/dashboard'); } catch (e2) { setErr(e2.message); }
  };
  return (
    <div className="card" style={{ maxWidth: 560 }}>
      <img src="/logo.png" alt="YamaLaw logo" className="auth-logo" />
      <h2>Create your YamaLaw account</h2>
      <form onSubmit={submit}>
        <label htmlFor="n">Full name</label><input id="n" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
        <label htmlFor="e">Email</label><input id="e" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        <label htmlFor="p">Password (min 8 characters)</label><input id="p" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        <label htmlFor="r">I am a</label>
        <select id="r" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
          <option value="CITIZEN">Citizen</option><option value="LAWYER">Lawyer</option><option value="JUDGE">Judge (demo)</option><option value="POLICE">Police (demo)</option><option value="ADMIN">Admin (demo)</option>
        </select>
        {err && <p className="notice" role="alert">{err}</p>}
        <div className="row" style={{ marginTop: 12 }}><button className="btn" type="submit">Create account</button><Link to="/login">Already have an account?</Link></div>
      </form>
    </div>
  );
}
