import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight, Users, Star, CheckCircle2, UserPlus, FileText, Zap, Route, ShieldCheck,
  Gavel, BookOpen, Video, Scale, Languages, ChevronDown, Cpu, Cuboid, Radio,
} from 'lucide-react';
import Reveal from '../components/Reveal.jsx';

const HERO_STATS = [
  { icon: Users, value: '12', label: 'land.stats.categories' },
  { icon: Languages, value: '3', label: 'land.stats.languages' },
  { icon: CheckCircle2, value: '100%', label: 'land.stats.free' },
];

const QUICK_CARDS = [
  { icon: UserPlus, color: '#7c5cff', key: 'quickAccount', to: '/signup' },
  { icon: FileText, color: '#3f5dcc', key: 'quickDescribe', to: '/signup' },
  { icon: Zap, color: '#10b981', key: 'quickExplore', to: '/#features' },
];

const STEPS = [
  { icon: UserPlus, color: '#8b5cf6', title: 'land.how.s1', body: 'land.how.s1Body' },
  { icon: FileText, color: '#6366f1', title: 'land.how.s2', body: 'land.how.s2Body' },
  { icon: Route, color: '#ec4899', title: 'land.how.s3', body: 'land.how.s3Body' },
  { icon: Gavel, color: '#10b981', title: 'land.how.s4', body: 'land.how.s4Body' },
];

const FEATURES = [
  { icon: Route, color: '#3f5dcc', title: 'land.features.journey', body: 'land.features.journeyBody' },
  { icon: Zap, color: '#7c5cff', title: 'land.features.readiness', body: 'land.features.readinessBody' },
  { icon: ShieldCheck, color: '#10b981', title: 'land.features.evidence', body: 'land.features.evidenceBody' },
  { icon: Scale, color: '#f59e0b', title: 'land.features.aid', body: 'land.features.aidBody' },
  { icon: BookOpen, color: '#ef4444', title: 'land.features.research', body: 'land.features.researchBody' },
  { icon: Languages, color: '#8b5cf6', title: 'land.features.multilingual', body: 'land.features.multilingualBody' },
];

const TRUST = [
  { icon: ShieldCheck, color: '#8b5cf6', title: 'land.trust.security', body: 'land.trust.securityBody' },
  { icon: Gavel, color: '#10b981', title: 'land.trust.procedure', body: 'land.trust.procedureBody' },
  { icon: Users, color: '#6366f1', title: 'land.trust.roles', body: 'land.trust.rolesBody' },
  { icon: Star, color: '#ec4899', title: 'land.trust.readiness', body: 'land.trust.readinessBody' },
  { icon: CheckCircle2, color: '#f59e0b', title: 'land.trust.free', body: 'land.trust.freeBody' },
  { icon: ShieldCheck, color: '#3b82f6', title: 'land.trust.privacy', body: 'land.trust.privacyBody' },
];

const ROADMAP = [
  { icon: Languages, color: '#7c5cff', title: 'land.roadmap.languages', body: 'land.roadmap.languagesBody' },
  { icon: Cuboid, color: '#f59e0b', title: 'land.roadmap.forensics', body: 'land.roadmap.forensicsBody' },
  { icon: Radio, color: '#ef4444', title: 'land.roadmap.hearings', body: 'land.roadmap.hearingsBody' },
];

const FAQ_KEYS = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6'];

function IconTile({ icon: Icon, color, size = 26, radius, style }) {
  return (
    <span
      className="feature-icon"
      style={{
        '--card-glow': color,
        width: size + 26,
        height: size + 26,
        borderRadius: radius ?? 14,
        ...style,
      }}
    >
      <Icon size={size} aria-hidden="true" style={{ color }} />
    </span>
  );
}

export default function Landing() {
  const { t } = useTranslation();
  const [openFaq, setOpenFaq] = useState(null);

  return (
    <div className="landing">
      {/* ---------------- Hero ---------------- */}
      <section className="hero">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="pill">{t('landing.badge')}</span>
          <h1>
            {t('land.hero.title1')}
            <br />
            <span className="grad-text">{t('land.hero.title2')}</span>
          </h1>
          <p className="hero-sub">{t('land.hero.sub')}</p>
          <div className="hero-actions">
            <Link className="btn lg" to="/signup">
              {t('land.hero.cta1')}
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
            <Link className="btn secondary lg" to="/login">
              {t('land.hero.cta2')}
            </Link>
          </div>
          <div className="hero-stats">
            {HERO_STATS.map(({ icon: Icon, value, label }) => (
              <div className="hero-stat" key={label}>
                <Icon size={22} aria-hidden="true" />
                <div>
                  <b>{value}</b>
                  <span>{t(label)}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          className="hero-visual"
          initial={{ opacity: 0, x: 30, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.img
            src="/logo.png"
            alt="YamaLaw emblem — scales of justice with mace and crown"
            width="460"
            height="460"
            animate={{ y: [0, -14, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          />
        </motion.div>
      </section>

      {/* ---------------- Quick cards ---------------- */}
      <Reveal className="quick-grid" delay={0.05}>
        {QUICK_CARDS.map(({ icon: Icon, color, key, to }) => (
          <motion.div
            className="quick-card"
            key={key}
            whileHover={{ y: -5 }}
            transition={{ duration: 0.2 }}
            style={{ '--card-glow': color }}
          >
            <span
              className="quick-icon"
              style={{ background: `color-mix(in srgb, ${color} 10%, transparent)`, color }}
            >
              <Icon size={22} aria-hidden="true" />
            </span>
            <h3>{t(`land.${key}.title`)}</h3>
            <p>{t(`land.${key}.body`)}</p>
            <Link
              to={to}
              className="btn ghost sm"
              style={{ color, borderColor: `color-mix(in srgb, ${color} 35%, transparent)` }}
            >
              {t('land.quickCta')}
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </motion.div>
        ))}
      </Reveal>

      {/* ---------------- How it works ---------------- */}
      <section className="how" id="how">
        <Reveal className="sec-head">
          <span className="pill">{t('land.how.badge')}</span>
          <h2>
            {t('land.how.title1')}{' '}
            <span className="grad-text">{t('land.how.title2')}</span>
          </h2>
          <p>{t('land.how.sub')}</p>
        </Reveal>

        <div className="how-grid">
          {STEPS.map(({ icon: Icon, color, title, body }, i) => (
            <Reveal className="step" key={title} delay={i * 0.1}>
              <span className="step-badge">{String(i + 1).padStart(2, '0')}</span>
              <span
                className="step-icon"
                style={{
                  background: `color-mix(in srgb, ${color} 9%, transparent)`,
                  color,
                }}
              >
                <Icon size={40} aria-hidden="true" />
              </span>
              <h3>{t(title)}</h3>
              <p>{t(body)}</p>
              {i < STEPS.length - 1 && (
                <span className="step-connector" aria-hidden="true">
                  <ArrowRight size={18} />
                </span>
              )}
            </Reveal>
          ))}
        </div>

        <Reveal className="how-cta" delay={0.1}>
          <h3>{t('land.how.cta')}</h3>
          <Link className="btn lg" to="/signup">
            {t('land.how.ctaBtn')}
            <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </Reveal>
      </section>

      {/* ---------------- Features ---------------- */}
      <section className="features" id="features">
        <Reveal className="sec-head">
          <span className="pill">{t('land.features.badge')}</span>
          <h2>{t('land.features.title')}</h2>
          <p>{t('land.features.sub')}</p>
        </Reveal>

        <div className="feature-grid">
          {FEATURES.map(({ icon: Icon, color, title, body }, i) => (
            <Reveal className="feature-card" key={title} delay={i * 0.06} style={{ '--card-glow': color }}>
              <IconTile icon={Icon} color={color} />
              <h3>{t(title)}</h3>
              <p>{t(body)}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------------- Trust marquee ---------------- */}
      <section className="trust">
        <Reveal className="trust-head">
          <span className="pill">{t('land.trust.badge')}</span>
          <h2>
            <span className="grad-text">{t('land.trust.title')}</span>
          </h2>
          <p>{t('land.trust.sub')}</p>
        </Reveal>

        <div className="marquee">
          {/* Duplicated once so the -50% translate loops seamlessly. */}
          {[0, 1].map((copy) => (
            <div className="marquee-track" key={copy} aria-hidden={copy === 1}>
              {TRUST.map(({ icon: Icon, color, title, body }) => (
                <motion.div
                  className="trust-card"
                  key={`${copy}-${title}`}
                  style={{ '--card-glow': color }}
                  whileHover={{ y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  <span
                    className="trust-icon"
                    style={{ background: `color-mix(in srgb, ${color} 9%, transparent)`, color }}
                  >
                    <Icon size={32} aria-hidden="true" />
                  </span>
                  <h3>{t(title)}</h3>
                  <p>{t(body)}</p>
                </motion.div>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- Roadmap ---------------- */}
      <section className="roadmap" id="roadmap">
        <Reveal className="sec-head">
          <span className="pill">{t('land.roadmap.badge')}</span>
          <h2>
            {t('land.roadmap.title1')}{' '}
            <span className="grad-text">{t('land.roadmap.title2')}</span>
          </h2>
          <p>{t('land.roadmap.sub')}</p>
        </Reveal>

        <div className="roadmap-grid">
          {ROADMAP.map(({ icon: Icon, color, title, body }, i) => (
            <Reveal className="roadmap-card" key={title} delay={i * 0.08} style={{ '--card-glow': color }}>
              <IconTile icon={Icon} color={color} radius={16} />
              <h3>{t(title)}</h3>
              <p>{t(body)}</p>
            </Reveal>
          ))}
        </div>

        <Reveal className="roadmap-cta">
          <Link className="btn outline-strong" to="/signup">
            {t('land.roadmap.cta')}
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </Reveal>
      </section>

      {/* ---------------- Final CTA ---------------- */}
      <section className="final-cta" id="disclaimer">
        <Reveal className="final-cta-card">
          <span className="pill lg">{t('land.finalCta.badge')}</span>
          <h2>{t('land.finalCta.title')}</h2>
          <p>{t('land.finalCta.sub')}</p>
          <p className="cta-disclaimer">{t('landing.disclaimer')}</p>
          <Link className="btn lg" to="/signup">
            {t('land.finalCta.cta')}
            <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </Reveal>
      </section>

      {/* ---------------- FAQ ---------------- */}
      <section className="faq" id="faq">
        <Reveal className="sec-head">
          <span className="pill">{t('land.faq.badge')}</span>
          <h2>{t('land.faq.title')}</h2>
          <p>{t('land.faq.sub')}</p>
        </Reveal>

        <div className="faq-list">
          {FAQ_KEYS.map((k, i) => {
            const open = openFaq === i;
            return (
              <Reveal className="faq-item" key={k} delay={i * 0.04}>
                <button
                  className="faq-q"
                  type="button"
                  aria-expanded={open}
                  aria-controls={`faq-panel-${k}`}
                  id={`faq-trigger-${k}`}
                  onClick={() => setOpenFaq(open ? null : i)}
                >
                  {t(`land.faq.${k}`)}
                  <ChevronDown size={18} aria-hidden="true" />
                </button>
                <AnimatePresence initial={false}>
                  {open && (
                    <motion.div
                      className="faq-a"
                      id={`faq-panel-${k}`}
                      role="region"
                      aria-labelledby={`faq-trigger-${k}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: 'easeInOut' }}
                    >
                      <p>{t(`land.faq.${k}Answer`)}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Reveal>
            );
          })}
        </div>
      </section>
    </div>
  );
}
