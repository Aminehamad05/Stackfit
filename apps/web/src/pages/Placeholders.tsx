import { Link } from 'react-router-dom';
import { EmptyState } from '../components/ui/States';

function StubPage({ title, body, actionLabel, actionTo }: { title: string; body: string; actionLabel: string; actionTo: string }): JSX.Element {
  return (
    <div className="container">
      <div className="page-head">
        <h1>{title}</h1>
        <p>{body}</p>
      </div>
      <div style={{ margin: '16px 0 64px' }}>
        <EmptyState title={`${title} is on the way`} body={body} actionLabel={actionLabel} actionTo={actionTo} />
        <p style={{ marginTop: 12, fontSize: '0.875rem' }}>
          API status: working endpoints today are user register/login, club login, club event
          CRUD, subscriptions, certifications, and project suggestions. Tasters, roadmap, quiz,
          leaderboard, and public event reads are next (no AI needed). <Link to="/">Back home</Link>
        </p>
      </div>
    </div>
  );
}

export function Careers(): JSX.Element {
  return <StubPage title="Career paths" body="Four guided paths: Full-Stack, Cloud, Machine Learning, and Data." actionLabel="Take the assessment" actionTo="/assessment" />;
}
export function CareerDetail(): JSX.Element {
  return <StubPage title="Career overview" body="Concepts, roadmap, resources, and projects for this path." actionLabel="View all careers" actionTo="/careers" />;
}
export function Assessment(): JSX.Element {
  return <StubPage title="Skill assessment" body="Answer a few questions to discover which path fits your current skills." actionLabel="Sign in to start" actionTo="/login" />;
}
export function Projects(): JSX.Element {
  return <StubPage title="Taster projects" body="Short hands-on projects that show what each field really feels like." actionLabel="Explore careers" actionTo="/careers" />;
}
export function Resources(): JSX.Element {
  return <StubPage title="Learning resources" body="Curated free resources behind every concept and roadmap step." actionLabel="View roadmap" actionTo="/roadmap" />;
}
export function Clubs(): JSX.Element {
  return <StubPage title="Student clubs" body="Tunisian university clubs and communities posting hackathons and meetups." actionLabel="Browse events" actionTo="/events" />;
}
export function Dashboard(): JSX.Element {
  return <StubPage title="Dashboard" body="Where am I, what should I learn next, and how close am I to my goal?" actionLabel="Take the assessment" actionTo="/assessment" />;
}
export function Profile(): JSX.Element {
  return <StubPage title="Profile" body="Skills, completed concepts, interests, and career direction." actionLabel="Go to dashboard" actionTo="/dashboard" />;
}
