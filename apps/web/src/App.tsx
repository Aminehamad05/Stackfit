import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/navigation/Layout';
import Landing from './pages/Landing';
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import Onboarding from './pages/Onboarding';
import Taster from './pages/Taster';
import FieldChoice from './pages/FieldChoice';
import Roadmap from './pages/Roadmap';
import Interview from './pages/Interview';
import Leaderboard from './pages/Leaderboard';
import Events from './pages/Events';
import DashboardPage from './pages/Dashboard';
import Networking from './pages/Networking';
import Org from './pages/Org';
import Careers from './pages/Careers';
import { RequireOrg } from './components/guards';
import {
  CareerDetail,
  Dashboard,
  Profile,
  Resources,
} from './pages/Placeholders';

export default function App(): JSX.Element {
  return (
    <Layout>
      <Routes>
        {/* Landing + auth (implemented first per skill §24) */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Guided journey (skill §24–§25): stubs until backend modules land */}
        <Route path="/careers" element={<Careers />} />
        <Route path="/careers/:slug" element={<CareerDetail />} />
        {/* Assessment = the real onboarding question flow (same component). */}
        <Route path="/assessment" element={<Onboarding />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/field-choice" element={<FieldChoice />} />
        <Route path="/roadmap" element={<Roadmap />} />
        <Route path="/taster" element={<Taster />} />
        <Route path="/interview" element={<Interview />} />
        <Route path="/networking" element={<Networking />} />
        <Route path="/org" element={<RequireOrg><Org /></RequireOrg>} />
        <Route path="/resources" element={<Resources />} />
        {/* Legacy: standalone Clubs section removed (Step 3) — events live under Networking. */}
        <Route path="/clubs" element={<Navigate to="/networking" replace />} />
        {/* Legacy: standalone Quiz/Certs/Projects removed (product-decisions.md Q4) —
            content lives in the roadmap view; keep redirects for old links. */}
        <Route path="/quiz" element={<Navigate to="/roadmap" replace />} />
        <Route path="/certs" element={<Navigate to="/roadmap" replace />} />
        <Route path="/projects" element={<Navigate to="/roadmap" replace />} />
        <Route path="/events" element={<Events />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/profile" element={<Profile />} />

        {/* Legacy deep links */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
