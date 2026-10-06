import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Bug, Scale, ExternalLink } from 'lucide-react';

const REPO_URL = 'https://github.com/vinayak1497/yamalaw';

/* lucide dropped brand glyphs, so the GitHub mark is inlined here. */
function GithubIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .5C5.73.5.5 5.73.5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.12 3.05.74.81 1.18 1.84 1.18 3.1 0 4.43-2.69 5.4-5.25 5.69.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5Z" />
    </svg>
  );
}

export default function Footer() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <span className="logo-mark" style={{ background: 'rgba(255,255,255,.1)' }}>
              <Scale size={20} color="#fff" aria-hidden="true" />
            </span>
            <div className="footer-brand-name">YamaLaw</div>
            <p>{t('footer.tagline')}</p>
            <div className="social-tiles">
              <a
                className="social-tile"
                href={`${REPO_URL}/issues`}
                target="_blank"
                rel="noreferrer noopener"
                aria-label="Report an issue on GitHub"
              >
                <Bug size={18} aria-hidden="true" />
              </a>
              <a
                className="social-tile"
                href={REPO_URL}
                target="_blank"
                rel="noreferrer noopener"
                aria-label="View the YamaLaw repository on GitHub"
              >
                <GithubIcon size={18} />
              </a>
            </div>
          </div>

          <div>
            <h4>{t('footer.quickLinks')}</h4>
            <ul className="footer-links">
              <li><Link to="/">{t('footer.home')}</Link></li>
              <li><Link to="/#features">{t('footer.features')}</Link></li>
              <li><Link to="/#how">{t('footer.howItWorks')}</Link></li>
              <li><Link to="/#roadmap">{t('footer.roadmap')}</Link></li>
              <li><Link to="/research">{t('nav.research')}</Link></li>
              <li><Link to="/aid">{t('nav.aid')}</Link></li>
              <li><Link to="/#faq">{t('header.faq')}</Link></li>
            </ul>
          </div>

          <div>
            <h4>{t('footer.legal')}</h4>
            <ul className="footer-links">
              <li><span>{t('footer.privacy')}</span></li>
              <li><span>{t('footer.terms')}</span></li>
              <li><span>{t('footer.disclaimer')}</span></li>
            </ul>
          </div>

          <div>
            <h4>{t('footer.getInTouch')}</h4>
            <ul className="footer-links">
              <li>
                <a href={`${REPO_URL}/issues`} target="_blank" rel="noreferrer noopener">
                  {t('footer.reportIssue')}
                  <ExternalLink size={14} aria-hidden="true" />
                </a>
              </li>
              <li>
                <a href={REPO_URL} target="_blank" rel="noreferrer noopener">
                  {t('footer.viewRepository')}
                  <ExternalLink size={14} aria-hidden="true" />
                </a>
              </li>
              <li>
                <a href="#top" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                  {t('footer.backToTop')}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <span>
            © {year} YamaLaw. {t('footer.madeWith')}
          </span>
          <span>
            {t('footer.derived')}{' '}
            <a href="https://github.com/viru0909-dev/nyay-setu-working" target="_blank" rel="noreferrer noopener">
              nyay-setu-working
            </a>{' '}
            (MIT)
          </span>
        </div>
      </div>
    </footer>
  );
}
