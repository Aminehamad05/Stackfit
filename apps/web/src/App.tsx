import { Routes, Route, Link } from 'react-router-dom';
import Onboarding from './pages/Onboarding';
import Taster from './pages/Taster';
import FieldChoice from './pages/FieldChoice';
import Roadmap from './pages/Roadmap';
import Quiz from './pages/Quiz';
import Interview from './pages/Interview';
import Leaderboard from './pages/Leaderboard';
import Events from './pages/Events';

export default function App(): JSX.Element {
  return (
    <div>
      <nav style={{ display: 'flex', gap: 12, padding: 12, borderBottom: '1px solid #ddd' }}>
        <Link to="/">Onboarding</Link>
        <Link to="/taster">Taster</Link>
        <Link to="/field-choice">FieldChoice</Link>
        <Link to="/roadmap">Roadmap</Link>
        <Link to="/quiz">Quiz</Link>
        <Link to="/interview">Interview</Link>
        <Link to="/leaderboard">Leaderboard</Link>
        <Link to="/events">Events</Link>
      </nav>
      <main style={{ padding: 16 }}>
        <Routes>
          <Route path="/" element={<Onboarding />} />
          <Route path="/taster" element={<Taster />} />
          <Route path="/field-choice" element={<FieldChoice />} />
          <Route path="/roadmap" element={<Roadmap />} />
          <Route path="/quiz" element={<Quiz />} />
          <Route path="/interview" element={<Interview />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/events" element={<Events />} />
        </Routes>
      </main>
    </div>
  );
}
