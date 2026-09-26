import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/navigation/Layout';
import Landing from './pages/Landing';
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import Onboarding from './pages/Onboarding';
import Taster from './pages/Taster';
import FieldChoice from './pages/FieldChoice';
import Roadmap from './pages/Roadmap';
import Quiz from './pages/Quiz';
import Interview from './pages/Interview';
import Leaderboard from './pages/Leaderboard';
import Events from './pages/Events';
import Certs from './pages/Certs';
import Projects from './pages/Projects';
import DashboardPage from './pages/Dashboard';
import Networking from './pages/Networking';
import Org from './pages/Org';
import { RequireOrg } from './components/guards';
import {
  Assessment,
  CareerDetail,
  Careers,
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
        <Route path="/assessment" element={<Assessment />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/field-choice" element={<FieldChoice />} />
        <Route path="/roadmap" element={<Roadmap />} />
        <Route path="/quiz" element={<Quiz />} />
        <Route path="/taster" element={<Taster />} />
        <Route path="/interview" element={<Interview />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/certs" element={<Certs />} />
        <Route path="/networking" element={<Networking />} />
        <Route path="/org" element={<RequireOrg><Org /></RequireOrg>} />
        <Route path="/resources" element={<Resources />} />
        {/* Legacy: standalone Clubs section removed (Step 3) — events live under Networking. */}
        <Route path="/clubs" element={<Navigate to="/networking" replace />} />
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
