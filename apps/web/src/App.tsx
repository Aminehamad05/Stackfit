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
import {
  Assessment,
  CareerDetail,
  Careers,
  Clubs,
  Dashboard,
  Profile,
  Projects,
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
        <Route path="/resources" element={<Resources />} />
        <Route path="/clubs" element={<Clubs />} />
        <Route path="/events" element={<Events />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<Profile />} />

        {/* Legacy deep links */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
