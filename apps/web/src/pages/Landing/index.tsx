import { Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';

const PATHS = [
  {
    icon: '🧱',
    tint: '#edf1ff',
    color: '#3255fd',
    title: 'Full-Stack Development',
    body: 'Build modern web applications from frontend to backend.',
    meta: '12 concepts · 8 projects',
    badge: 'Beginner → Advanced',
    tone: 'blue' as const,
  },
  {
    icon: '☁️',
    tint: '#e8f7fe',
    color: '#2fa9f4',
    title: 'Cloud Engineering',
    body: 'Ship reliable infrastructure, CI pipelines, and containers.',
    meta: '10 concepts · 6 projects',
    badge: 'Beginner → Advanced',
    tone: 'blue' as const,
  },
  {
    icon: '🧠',
    tint: '#f3ecff',
    color: '#8241fb',
    title: 'Machine Learning',
    body: 'Train models, evaluate them honestly, and explain results.',
    meta: '14 concepts · 5 projects',
    badge: 'Intermediate → Advanced',
    tone: 'purple' as const,
  },
  {
    icon: '📊',
    tint: '#e3faf6',
    color: '#01c8b1',
    title: 'Data',
    body: 'Turn raw data into decisions with analysis and dashboards.',
    meta: '11 concepts · 7 projects',
    badge: 'Beginner → Intermediate',
    tone: 'teal' as const,
  },
];

export default function Landing(): JSX.Element {
  return (
    <div className="container">
      <section className="hero">
        <div>
          <Badge tone="purple">Tunisian CS students · Engineers · Switchers</Badge>
          <h1 style={{ marginTop: 16 }}>
            Find your path.
            <br />
            Build what&apos;s next.
          </h1>
          <p className="hero-sub">
            Discover the tech career that fits your skills, then follow a practical
            roadmap to get there.
          </p>
          <div className="hero-cta">
            <Link to="/register" className="btn btn-primary">
              Find my path
            </Link>
            <Link to="/careers" className="btn btn-secondary">
              Explore careers
            </Link>
          </div>
          <div className="hero-proof">
            <span>✅ Skill assessment</span>
            <span>✅ Hands-on tasters</span>
            <span>✅ Club events</span>
          </div>
        </div>
        <div className="hero-visual">
          <img src="/logo.png" alt="Stackfit layered logo" />
          <Card flat>
            <Badge tone="teal">Your next step</Badge>
            <h3 style={{ marginTop: 8 }}>Take the 5-minute assessment</h3>
            <p>Answer a few questions to discover which path fits your current skills.</p>
            <Link to="/assessment" className="btn btn-primary btn-sm">
              Take the assessment
            </Link>
          </Card>
        </div>
      </section>

      <section aria-label="Career paths">
        <h2>Four paths. One guided journey.</h2>
        <p>Each path pairs concepts, resources, practical projects, and quizzes.</p>
        <div className="path-grid">
          {PATHS.map((p) => (
            <Card key={p.title} hover>
              <div className="path-card-icon" style={{ background: p.tint, color: p.color }}>
                <span aria-hidden="true">{p.icon}</span>
              </div>
              <h3>{p.title}</h3>
              <p>{p.body}</p>
              <p style={{ fontSize: '0.875rem' }}>{p.meta}</p>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
                <Badge tone={p.tone}>{p.badge}</Badge>
              </div>
              <Link to="/careers">Explore path →</Link>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
