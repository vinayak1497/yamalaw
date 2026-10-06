import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthProvider, useAuth } from './components/AuthContext.jsx';
import { ThemeProvider } from './contexts/ThemeContext.jsx';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import ScrollProgress from './components/ScrollProgress.jsx';
import Landing from './pages/Landing.jsx';
import { Login, Signup } from './pages/Auth.jsx';
import { CitizenDashboard, Issues, CasesList, NewCase } from './pages/Citizen.jsx';
import CaseDetail from './pages/CaseDetail.jsx';
import EvidenceDetail from './pages/EvidenceDetail.jsx';
import { Research, LegalAid, Hearings, Notifications, Profile } from './pages/Common.jsx';
import { LawyerDash, JudgeDash, PoliceDash, AdminDash, HearingRoom } from './pages/Staff.jsx';

const ALL_ROLES = ['CITIZEN', 'LAWYER', 'JUDGE', 'POLICE', 'ADMIN'];

function Guard({ roles, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
}

function RoleHome() {
  const { user } = useAuth();
  if (!user) return <Landing />;
  if (user.role === 'LAWYER') return <Navigate to="/lawyer" replace />;
  if (user.role === 'JUDGE') return <Navigate to="/judge" replace />;
  if (user.role === 'POLICE') return <Navigate to="/police" replace />;
  if (user.role === 'ADMIN') return <Navigate to="/admin" replace />;
  return <Navigate to="/dashboard" replace />;
}

/** Anchored links such as /#features need the browser scrolled after the route paints. */
function ScrollToHash() {
  const { hash } = useLocation();
  useEffect(() => {
    if (!hash) return;
    const el = document.querySelector(hash);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [hash]);
  return null;
}

function NotFound() {
  const { t } = useTranslation();
  return (
    <div className="card">
      <h2>{t('common.notFound')}</h2>
    </div>
  );
}

/** Wraps an authenticated page in the padded app container. */
const app = (element) => <div className="wrap">{element}</div>;

function Shell() {
  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <ScrollToHash />
      <ScrollProgress />
      <Header />
      <main id="main" className="main-full">
        <Routes>
          <Route path="/" element={<RoleHome />} />
          <Route path="/login" element={app(<Login />)} />
          <Route path="/signup" element={app(<Signup />)} />
          <Route path="/dashboard" element={app(<Guard roles={['CITIZEN', 'ADMIN']}><CitizenDashboard /></Guard>)} />
          <Route path="/issues" element={app(<Guard roles={['CITIZEN', 'ADMIN']}><Issues /></Guard>)} />
          <Route path="/cases" element={app(<Guard roles={ALL_ROLES}><CasesList /></Guard>)} />
          <Route path="/cases/new" element={app(<Guard roles={['CITIZEN', 'ADMIN']}><NewCase /></Guard>)} />
          <Route path="/cases/:id" element={app(<Guard roles={ALL_ROLES}><CaseDetail /></Guard>)} />
          <Route path="/evidence/:id" element={app(<Guard roles={ALL_ROLES}><EvidenceDetail /></Guard>)} />
          <Route path="/research" element={app(<Guard roles={['CITIZEN', 'LAWYER', 'JUDGE', 'ADMIN']}><Research /></Guard>)} />
          <Route path="/aid" element={app(<Guard roles={['CITIZEN', 'ADMIN']}><LegalAid /></Guard>)} />
          <Route path="/hearings" element={app(<Guard roles={['CITIZEN', 'LAWYER', 'JUDGE', 'ADMIN']}><Hearings /></Guard>)} />
          <Route path="/notifications" element={app(<Guard roles={ALL_ROLES}><Notifications /></Guard>)} />
          <Route path="/profile" element={app(<Guard roles={ALL_ROLES}><Profile /></Guard>)} />
          <Route path="/lawyer" element={app(<Guard roles={['LAWYER', 'ADMIN']}><LawyerDash /></Guard>)} />
          <Route path="/judge" element={app(<Guard roles={['JUDGE', 'ADMIN']}><JudgeDash /></Guard>)} />
          <Route path="/police" element={app(<Guard roles={['POLICE', 'ADMIN']}><PoliceDash /></Guard>)} />
          <Route path="/firs" element={app(<Guard roles={['POLICE', 'ADMIN']}><PoliceDash /></Guard>)} />
          <Route path="/admin" element={app(<Guard roles={['ADMIN']}><AdminDash /></Guard>)} />
          <Route path="/hearing/:id" element={app(<Guard roles={['CITIZEN', 'LAWYER', 'JUDGE', 'ADMIN']}><HearingRoom /></Guard>)} />
          <Route path="*" element={app(<NotFound />)} />
        </Routes>
      </main>
      <Footer />
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <Shell />
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
