import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/auth-context';
import { friendlyAuthError, registerClub } from '../../features/auth/api';
import { ApiError } from '../../lib/api';
import type { AccountType } from '../../lib/api';
import { Field } from '../../components/ui/Field';
import { AccountTypeSelector } from './AccountTypeSelector';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Register(): JSX.Element {
  const { register, login } = useAuth();
  const navigate = useNavigate();
  // Two distinct signup flows (spec Step 3): person (POST /api/auth/register)
  // vs organisation (POST /api/clubs/register). Trust/verification is phase-2.
  const [accountType, setAccountType] = useState<AccountType>('person');
  const [clubName, setClubName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ displayName?: string; clubName?: string; email?: string; password?: string }>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function validate(): boolean {
    const next: typeof errors = {};
    if (accountType === 'person' && displayName.trim().length > 100) {
      next.displayName = 'Display name must be 100 characters or fewer.';
    }
    if (accountType === 'organisation' && clubName.trim().length < 1) {
      next.clubName = 'Enter your club name.';
    }
    if (!EMAIL_RE.test(email.trim())) next.email = 'Enter a valid email address.';
    if (password.length < 8) next.password = 'Password must be at least 8 characters.';
    if (password.length > 128) next.password = 'Password must be 128 characters or fewer.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    setSubmitError(null);
    if (!validate()) return;
    setPending(true);
    try {
      if (accountType === 'organisation') {
        await registerClub({ name: clubName.trim(), email: email.trim(), password });
        await login('organisation', email.trim(), password);
        navigate('/org', { replace: true });
      } else {
        await register(email.trim(), password, displayName);
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      if (err instanceof ApiError) setSubmitError(friendlyAuthError(err.code, err.status));
      else setSubmitError('Something went wrong. Your progress is safe — please try again.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="container">
        <div className="auth-layout">
          <aside className="auth-side">
            <img src="/logo.png" alt="Stackfit logo" />
            <h2>Find your path. Build what&apos;s next.</h2>
            <p>Discover the tech career that fits your skills, then follow a practical roadmap to get there.</p>
            <ul>
              <li>✅ <span>Take a short skill assessment.</span></li>
              <li>✅ <span>Try hands-on taster projects per field.</span></li>
              <li>✅ <span>Unlock a guided roadmap, quizzes, and events.</span></li>
            </ul>
          </aside>
          <div className="auth-main">
            <h1>Create your account</h1>
            <p className="auth-sub">Start as a person — or register your club as an organisation.</p>
            <AccountTypeSelector value={accountType} onChange={(v) => { setAccountType(v); setSubmitError(null); }} />
            {accountType === 'organisation' ? (
              <div className="form-note" role="note">
                Organisation accounts manage events only. Seeded clubs can also just{' '}
                <Link to="/login">sign in</Link> with password <code>club2000</code>.
              </div>
            ) : null}
            {submitError ? (
              <div className="form-error" role="alert">
                {submitError}
              </div>
            ) : null}
            <form onSubmit={onSubmit} noValidate>
              {accountType === 'person' ? (
                <Field
                  label="Display name (optional)"
                  name="displayName"
                  type="text"
                  autoComplete="nickname"
                  placeholder="Yassine"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  error={errors.displayName}
                  hint="Shown on the leaderboard."
                />
              ) : (
                <Field
                  label="Club name"
                  name="clubName"
                  type="text"
                  autoComplete="organization"
                  placeholder="IEEE INSAT Student Branch"
                  value={clubName}
                  onChange={(e) => setClubName(e.target.value)}
                  error={errors.clubName}
                />
              )}
              <Field
                label={accountType === 'person' ? 'Personal email' : 'Club email'}
                name="email"
                type="email"
                autoComplete="email"
                placeholder={accountType === 'person' ? 'you@university.tn' : 'info@yourclub.com'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={errors.email}
              />
              <Field
                label="Password"
                name="password"
                type="password"
                autoComplete="new-password"
                placeholder="Minimum 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={errors.password}
                hint="At least 8 characters."
              />
              <button type="submit" className="btn btn-primary btn-block" disabled={pending}>
                {pending ? 'Creating account…' : accountType === 'person' ? 'Create person account' : 'Register club'}
              </button>
            </form>
            <p className="auth-switch">
              Already have an account? <Link to="/login">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
