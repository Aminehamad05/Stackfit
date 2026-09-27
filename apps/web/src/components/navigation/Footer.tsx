import { Link } from 'react-router-dom';

export function Footer(): JSX.Element {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="site-footer-inner">
          <div className="footer-brand">
            <Link to="/" className="brand" aria-label="Stackfit home">
              <img src="/logo.png" alt="Stackfit logo" height={32} />
              <span>
                Stack<span className="brand-fit">fit</span>
              </span>
            </Link>
            <p>Find your path. Build what&apos;s next.</p>
            <p>Built for Tunisian CS students, engineers, and career switchers.</p>
          </div>
          <div>
            <h4>Learn</h4>
            <ul>
              <li><Link to="/careers">Career paths</Link></li>
              <li><Link to="/assessment">Skill assessment</Link></li>
              <li><Link to="/roadmap">My roadmap</Link></li>
              <li><Link to="/taster">Taster projects</Link></li>
            </ul>
          </div>
          <div>
            <h4>Community</h4>
            <ul>
              <li><Link to="/networking">Student clubs</Link></li>
              <li><Link to="/networking">Events</Link></li>
              <li><Link to="/leaderboard">Leaderboard</Link></li>
            </ul>
          </div>
          <div>
            <h4>Account</h4>
            <ul>
              <li><Link to="/login">Sign in</Link></li>
              <li><Link to="/register">Create account</Link></li>
              <li><Link to="/dashboard">Dashboard</Link></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 Stackfit. Learn by building.</span>
          <span>Student progress · Club events · Practical roadmaps</span>
        </div>
      </div>
    </footer>
  );
}
