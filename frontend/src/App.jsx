import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import { AuthProvider, useAuth } from './components/AuthContext.jsx';
import Landing from './pages/Landing.jsx';
import { Login, Signup } from './pages/Auth.jsx';
import { CitizenDashboard, Issues, CasesList, NewCase } from './pages/Citizen.jsx';
import CaseDetail from './pages/CaseDetail.jsx';
import EvidenceDetail from './pages/EvidenceDetail.jsx';
import { Research, LegalAid, Hearings, Notifications, Profile } from './pages/Common.jsx';
import { LawyerDash, JudgeDash, PoliceDash, AdminDash, HearingRoom } from './pages/Staff.jsx';

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

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<RoleHome />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/dashboard" element={<Guard roles={['CITIZEN', 'ADMIN']}><CitizenDashboard /></Guard>} />
            <Route path="/issues" element={<Guard roles={['CITIZEN', 'ADMIN']}><Issues /></Guard>} />
            <Route path="/cases" element={<Guard roles={['CITIZEN', 'LAWYER', 'JUDGE', 'POLICE', 'ADMIN']}><CasesList /></Guard>} />
            <Route path="/cases/new" element={<Guard roles={['CITIZEN', 'ADMIN']}><NewCase /></Guard>} />
            <Route path="/cases/:id" element={<Guard roles={['CITIZEN', 'LAWYER', 'JUDGE', 'POLICE', 'ADMIN']}><CaseDetail /></Guard>} />
            <Route path="/evidence/:id" element={<Guard roles={['CITIZEN', 'LAWYER', 'JUDGE', 'POLICE', 'ADMIN']}><EvidenceDetail /></Guard>} />
            <Route path="/research" element={<Guard roles={['CITIZEN', 'LAWYER', 'JUDGE', 'ADMIN']}><Research /></Guard>} />
            <Route path="/aid" element={<Guard roles={['CITIZEN', 'ADMIN']}><LegalAid /></Guard>} />
            <Route path="/hearings" element={<Guard roles={['CITIZEN', 'LAWYER', 'JUDGE', 'ADMIN']}><Hearings /></Guard>} />
            <Route path="/notifications" element={<Guard roles={['CITIZEN', 'LAWYER', 'JUDGE', 'POLICE', 'ADMIN']}><Notifications /></Guard>} />
            <Route path="/profile" element={<Guard roles={['CITIZEN', 'LAWYER', 'JUDGE', 'POLICE', 'ADMIN']}><Profile /></Guard>} />
            <Route path="/lawyer" element={<Guard roles={['LAWYER', 'ADMIN']}><LawyerDash /></Guard>} />
            <Route path="/judge" element={<Guard roles={['JUDGE', 'ADMIN']}><JudgeDash /></Guard>} />
            <Route path="/police" element={<Guard roles={['POLICE', 'ADMIN']}><PoliceDash /></Guard>} />
            <Route path="/firs" element={<Guard roles={['POLICE', 'ADMIN']}><PoliceDash /></Guard>} />
            <Route path="/admin" element={<Guard roles={['ADMIN']}><AdminDash /></Guard>} />
            <Route path="/hearing/:id" element={<Guard roles={['CITIZEN', 'LAWYER', 'JUDGE', 'ADMIN']}><HearingRoom /></Guard>} />
            <Route path="*" element={<div className="card"><h2>Page not found — YamaLaw</h2><p>The page you asked for does not exist.</p></div>} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </AuthProvider>
  );
}
