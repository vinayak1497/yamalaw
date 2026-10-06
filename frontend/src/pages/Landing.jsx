import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function Landing() {
  const { t } = useTranslation();
  return (
    <div>
      <section className="hero">
        <img src="/logo.png" alt="YamaLaw logo — scales of justice with mace and crown, Justice • Dharma" className="hero-logo" />
        <span className="badge info">{t('landing.badge')}</span>
        <h1>YamaLaw</h1>
        <h2 style={{ marginTop: 0 }}>{t('tagline')}</h2>
        <p className="muted" style={{ maxWidth: 640 }}>{t('subline')}</p>
        <div className="flow" aria-label="workflow">
          {['Problem', 'Understand', 'Prepare', 'Connect', 'Track', 'Resolve'].map((s) => <span key={s}>{s}</span>)}
        </div>
        <div className="row">
          <Link className="btn" to="/signup">{t('landing.cta1')}</Link>
          <Link className="btn secondary" to="/login">{t('landing.cta2')}</Link>
        </div>
      </section>
      <div className="grid two">
        <div className="card"><h3>Legal Journey Engine</h3><p className="muted">Intake → classification → documents → evidence → next step → case tracking. Every stage is stored, not just generated text.</p></div>
        <div className="card"><h3>Case Readiness</h3><p className="muted">Transparent score from documents (30%), evidence (25%), information, prerequisites, jurisdiction and preparation. You always see why.</p></div>
        <div className="card"><h3>Evidence Chain of Custody</h3><p className="muted">SHA-256 hashing, verification, access history and tamper detection for every file.</p></div>
        <div className="card"><h3>Legal Aid Discovery</h3><p className="muted">Configurable eligibility check plus DLSA / NGO providers with contact and next action.</p></div>
        <div className="card"><h3>Source-grounded Research</h3><p className="muted">Search the YamaLaw legal library, inspect sources, bookmark and attach to a case. No invented citations — “Source not found” when nothing matches.</p></div>
        <div className="card"><h3>Free-first &amp; Multilingual</h3><p className="muted">Runs with AI disabled. English, हिन्दी and मराठी UI with plain-language legal terms.</p></div>
      </div>
      <p className="notice" style={{ marginTop: 18 }}>{t('landing.disclaimer')}</p>
    </div>
  );
}
