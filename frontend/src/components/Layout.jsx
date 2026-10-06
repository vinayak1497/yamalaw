import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from './AuthContext.jsx';
import { useState } from 'react';

export default function Layout({ children }) {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const role = user?.role;
  const links = !user ? [] : role === 'CITIZEN' ? [
    ['/dashboard', t('nav.dashboard')], ['/issues', t('nav.issues')], ['/cases', t('nav.cases')],
    ['/research', t('nav.research')], ['/aid', t('nav.aid')], ['/hearings', t('nav.hearings')],
    ['/notifications', t('nav.notifications')],
  ] : role === 'LAWYER' ? [
    ['/lawyer', t('nav.dashboard')], ['/cases', t('nav.cases')], ['/research', t('nav.research')],
    ['/hearings', t('nav.hearings')], ['/notifications', t('nav.notifications')],
  ] : role === 'JUDGE' ? [
    ['/judge', t('nav.dashboard')], ['/cases', t('nav.cases')], ['/hearings', t('nav.hearings')],
  ] : role === 'POLICE' ? [
    ['/police', t('nav.dashboard')], ['/firs', 'FIRs'], ['/cases', t('nav.cases')],
  ] : [['/admin', t('nav.dashboard')], ['/cases', t('nav.cases')], ['/research', t('nav.research')], ['/aid', t('nav.aid')]];

  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <header className="topbar">
        <Link className="brand" to={user ? '/dashboard' : '/'}><span className="brand-chip"><img src="/logo-icon.png" alt="" width="30" height="30" /></span>YamaLaw</Link>
        <nav className={open ? 'open' : ''} aria-label="Primary">
          {links.map(([to, label]) => <NavLink key={to} to={to}>{label}</NavLink>)}
        </nav>
        <span className="spacer" />
        <label className="small" style={{ color: '#e9e4d8' }} htmlFor="lang">{t('common.language')}</label>
        <select id="lang" className="lang" value={i18n.language} onChange={(e) => { i18n.changeLanguage(e.target.value); localStorage.setItem('yamalaw-lang', e.target.value); }} aria-label="Language">
          <option value="en">English</option><option value="hi">हिन्दी</option><option value="mr">मराठी</option>
        </select>
        {user ? <><Link to="/profile" style={{ color: '#fff' }} className="small">{user.full_name}</Link><button className="btn ghost" style={{ color: '#fff', borderColor: 'rgba(255,255,255,.4)' }} onClick={() => { logout(); nav('/'); }}>{t('nav.logout')}</button></>
          : <><Link className="small" style={{ color: '#fff' }} to="/login">{t('nav.login')}</Link><Link className="btn" style={{ background: '#e9e4d8', color: '#14342b', borderColor: '#e9e4d8' }} to="/signup">{t('nav.signup')}</Link></>}
      </header>
      <main id="main" className="wrap">{children}</main>
      <footer className="footer">
        <div className="wrap" style={{ padding: 0 }}>
          <div className="row"><img src="/logo-icon.png" alt="YamaLaw logo" width="28" height="28" className="foot-logo" /><strong>YamaLaw</strong><span>— Citizen Legal Access &amp; Case Continuity Platform. Legal information only, not legal advice.</span> <span className="badge">DEMO</span></div>
          <div className="small">Derived from the open-source Nyay Setu project (MIT) for attribution; product identity is YamaLaw.</div>
        </div>
      </footer>
    </>
  );
}
