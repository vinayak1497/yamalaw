import { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X, Sun, Moon, Globe, LogOut } from 'lucide-react';
import { useAuth } from './AuthContext.jsx';
import { useTheme } from '../contexts/ThemeContext.jsx';

const LANGS = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'mr', label: 'मराठी' },
];

export default function Header() {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const nav = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [drawer, setDrawer] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close the drawer on Escape and lock body scroll while it is open.
  useEffect(() => {
    if (!drawer) return undefined;
    const onKey = (e) => e.key === 'Escape' && setDrawer(false);
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [drawer]);

  // Any navigation closes the drawer.
  useEffect(() => setDrawer(false), [i18n.language, user?.id]);

  const setLang = (code) => {
    i18n.changeLanguage(code);
    try {
      localStorage.setItem('yamalaw-lang', code);
    } catch {
      // Non-fatal if storage is blocked.
    }
  };

  const links = user
    ? [
        ['/dashboard', t('nav.dashboard')],
        ['/issues', t('nav.issues')],
        ['/cases', t('nav.cases')],
        ['/research', t('nav.research')],
        ['/aid', t('nav.aid')],
        ['/hearings', t('nav.hearings')],
        ['/notifications', t('nav.notifications')],
      ]
    : [
        ['/#features', t('header.features')],
        ['/#how', t('header.how')],
        ['/#roadmap', t('header.roadmap')],
        ['/#faq', t('header.faq')],
      ];

  return (
    // Entrance is a CSS animation, not a JS-driven transform: if the animation is
    // skipped for any reason the header still renders at its resting position.
    <header className={`site-header${scrolled ? ' scrolled' : ''}`}>
      <div className="container">
        <Link className="logo" to="/">
          <span className="logo-mark">
            <img src="/logo-icon.png" alt="" />
          </span>
          YamaLaw
        </Link>

        <nav className="desktop-nav" aria-label="Primary">
          {links.map(([to, label]) => (
            <NavLink key={to} to={to}>
              {label}
            </NavLink>
          ))}
        </nav>

        <span className="header-spacer" />

        <button
          className="lang-picker"
          type="button"
          onClick={() => {
            const i = LANGS.findIndex((l) => l.code === i18n.language);
            setLang(LANGS[(i + 1) % LANGS.length].code);
          }}
          aria-label={`${t('common.language')}: ${i18n.language.toUpperCase()}`}
        >
          <Globe size={16} aria-hidden="true" />
          {i18n.language.toUpperCase()}
        </button>

        <button
          className="icon-btn"
          type="button"
          onClick={toggle}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
        </button>

        <div className="header-cta">
          {user ? (
            <>
              <Link className="btn ghost sm" to="/profile">
                {user.full_name}
              </Link>
              <button
                className="btn ghost sm"
                type="button"
                onClick={() => {
                  logout();
                  nav('/');
                }}
              >
                <LogOut size={15} aria-hidden="true" />
                {t('nav.logout')}
              </button>
            </>
          ) : (
            <>
              <Link className="btn ghost sm" to="/login">
                {t('nav.login')}
              </Link>
              <Link className="btn sm" to="/signup">
                {t('nav.signup')}
              </Link>
            </>
          )}
        </div>

        <button
          className="icon-btn hamburger"
          type="button"
          onClick={() => setDrawer((d) => !d)}
          aria-expanded={drawer}
          aria-label={drawer ? 'Close menu' : 'Open menu'}
        >
          {drawer ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
        </button>
      </div>

      <AnimatePresence>
        {drawer && (
          <>
            <motion.div
              className="drawer-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawer(false)}
            />
            <motion.aside
              className="mobile-drawer"
              aria-label="Mobile navigation"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', ease: [0.22, 1, 0.36, 1], duration: 0.28 }}
            >
              {links.map(([to, label]) => (
                <Link key={to} to={to}>
                  {label}
                </Link>
              ))}

              <div className="drawer-lang" role="group" aria-label={t('common.language')}>
                {LANGS.map((l) => (
                  <button
                    key={l.code}
                    type="button"
                    onClick={() => setLang(l.code)}
                    aria-pressed={i18n.language === l.code}
                  >
                    {l.code.toUpperCase()}
                  </button>
                ))}
              </div>

              <div className="drawer-actions">
                {user ? (
                  <>
                    <Link className="btn block" to="/profile">
                      {user.full_name}
                    </Link>
                    <button
                      className="btn ghost block"
                      type="button"
                      onClick={() => {
                        logout();
                        nav('/');
                      }}
                    >
                      {t('nav.logout')}
                    </button>
                  </>
                ) : (
                  <>
                    <Link className="btn block" to="/signup">
                      {t('nav.signup')}
                    </Link>
                    <Link className="btn ghost block" to="/login">
                      {t('nav.login')}
                    </Link>
                  </>
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
