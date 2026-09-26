import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/auth-context';
import { useTheme } from '../../features/theme/theme-context';

const LINKS = [
  { to: '/careers', label: 'Explore' },
  { to: '/roadmap', label: 'Roadmap' },
  { to: '/projects', label: 'Projects' },
  { to: '/clubs', label: 'Clubs' },
];

export function Header(): JSX.Element {
  const { account, userEmail, clubName, logout } = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const signedIn = account !== null;

  function handleLogout(): void {
    logout();
    setOpen(false);
    navigate('/');
  }

  return (
    <header className="site-header">
      <div className="container site-header-inner">
        <Link to="/" className="brand" aria-label="Stackfit home">
          <img src="/logo.png" alt="Stackfit logo" height={36} />
          <span>
            Stack<span className="brand-fit">fit</span>
          </span>
        </Link>
        <nav className="nav-links" aria-label="Primary">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} className={({ isActive }) => (isActive ? 'active' : '')}>
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="header-actions">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            <span aria-hidden="true">{theme === 'dark' ? '☀️' : '🌙'}</span>
          </button>
          {signedIn ? (
            <>
              <span className="account-chip" title={account === 'person' ? userEmail ?? '' : clubName ?? ''}>
                {account === 'person' ? '👤' : '🏛️'} {account === 'person' ? 'Student' : 'Club'}
              </span>
              <button type="button" className="btn btn-secondary btn-sm" onClick={handleLogout}>
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost btn-sm">
                Sign in
              </Link>
              <Link to="/register" className="btn btn-primary btn-sm">
                Get started
              </Link>
            </>
          )}
          <button
            type="button"
            className="btn btn-secondary btn-sm mobile-menu-btn"
            aria-expanded={open}
            aria-label="Toggle menu"
            onClick={() => setOpen((v) => !v)}
          >
            ☰
          </button>
        </div>
      </div>
      {open ? (
        <nav className="mobile-nav" aria-label="Mobile">
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) => (isActive ? 'active' : '')}
              onClick={() => setOpen(false)}
            >
              {l.label}
            </NavLink>
          ))}
          {!signedIn ? (
            <>
              <NavLink to="/login" onClick={() => setOpen(false)}>
                Sign in
              </NavLink>
              <NavLink to="/register" onClick={() => setOpen(false)}>
                Get started
              </NavLink>
            </>
          ) : null}
        </nav>
      ) : null}
    </header>
  );
}
