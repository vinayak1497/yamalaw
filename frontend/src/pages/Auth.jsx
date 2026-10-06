import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../components/AuthContext.jsx';
import { api } from '../api.js';

const FALLBACK_DEMO = [
  { role: 'CITIZEN', email: 'meera.citizen@yamalaw.demo', password: 'YamaLaw123', name: 'Meera Deshpande' },
  { role: 'LAWYER', email: 'arjun.lawyer@yamalaw.demo', password: 'YamaLaw123', name: 'Adv. Arjun Nair' },
  { role: 'JUDGE', email: 'kavitha.judge@yamalaw.demo', password: 'YamaLaw123', name: 'Judge Kavitha Rao' },
  { role: 'POLICE', email: 'vikram.police@yamalaw.demo', password: 'YamaLaw123', name: 'PSI Vikram Patil' },
  { role: 'ADMIN', email: 'admin@yamalaw.demo', password: 'YamaLaw123', name: 'YamaLaw Admin' },
];

function getRoleRoute(role) {
  if (role === 'LAWYER') return '/lawyer';
  if (role === 'JUDGE') return '/judge';
  if (role === 'POLICE') return '/police';
  if (role === 'ADMIN') return '/admin';
  return '/dashboard';
}

export function Login() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [demo, setDemo] = useState([]);

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      const d = await login(form.email, form.password);
      const role = d?.user?.role || 'CITIZEN';
      nav(getRoleRoute(role));
    } catch (e2) {
      setErr(e2.message || 'Failed to sign in. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const loadDemo = async () => {
    try {
      const res = await api('/auth/demo-credentials', { auth: false });
      setDemo(Array.isArray(res) && res.length ? res : FALLBACK_DEMO);
    } catch {
      setDemo(FALLBACK_DEMO);
    }
  };

  return (
    <div className="card" style={{ maxWidth: 520 }}>
      <img src="/logo.png" alt="YamaLaw logo" className="auth-logo" />
      <h2>{t('auth.welcome')}</h2>
      <form onSubmit={submit}>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          placeholder="your.email@example.com"
          required
        />
        <label htmlFor="pw">Password</label>
        <input
          id="pw"
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          placeholder="Enter password"
          required
        />
        {err && <p className="notice" role="alert">{err}</p>}
        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn" type="submit" disabled={loading}>
            {loading ? 'Signing in…' : t('nav.login')}
          </button>
          <Link to="/signup">{t('auth.noAccount')}</Link>
        </div>
      </form>
      <hr />
      <button className="btn secondary" type="button" onClick={loadDemo}>Show YamaLaw demo accounts</button>
      {demo.map((d) => (
        <div key={d.email} className="row small" style={{ marginTop: 6 }}>
          <span className="badge">{d.role}</span><code>{d.email} / {d.password}</code>
          <button
            className="btn ghost"
            type="button"
            onClick={() => setForm({ email: d.email, password: d.password })}
          >
            Use
          </button>
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
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    setNotice('');
    if (String(form.password || '').length < 6) {
      setErr('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      const res = await signup(form);
      if (res?.pendingEmailConfirmation) {
        setNotice(`Account created. Check ${res.email} for a confirmation link, then sign in.`);
        return;
      }
      const role = res?.user?.role || form.role;
      nav(getRoleRoute(role));
    } catch (e2) {
      setErr(e2.message || 'Failed to create account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: 560 }}>
      <img src="/logo.png" alt="YamaLaw logo" className="auth-logo" />
      <h2>Create your YamaLaw account</h2>
      <form onSubmit={submit}>
        <label htmlFor="n">Full name</label>
        <input
          id="n"
          value={form.full_name}
          onChange={(e) => setForm({ ...form, full_name: e.target.value })}
          placeholder="e.g. Priya Sharma"
          required
        />
        <label htmlFor="e">Email</label>
        <input
          id="e"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          placeholder="e.g. priya.sharma@gmail.com"
          required
        />
        <label htmlFor="phone">Phone (optional)</label>
        <input
          id="phone"
          type="tel"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          placeholder="+91 98765 43210"
        />
        <label htmlFor="p">Password (min 6 characters)</label>
        <input
          id="p"
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          placeholder="Choose a secure password"
          required
        />
        <label htmlFor="r">I am a</label>
        <select id="r" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
          <option value="CITIZEN">Citizen</option>
          <option value="LAWYER">Lawyer</option>
          <option value="JUDGE">Judge</option>
          <option value="POLICE">Police</option>
          <option value="ADMIN">Admin</option>
        </select>
        {err && <p className="notice" role="alert">{err}</p>}
        {notice && <p className="notice" role="status">{notice}</p>}
        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn" type="submit" disabled={loading}>
            {loading ? 'Creating account…' : 'Create account'}
          </button>
          <Link to="/login">Already have an account?</Link>
        </div>
      </form>
    </div>
  );
}
