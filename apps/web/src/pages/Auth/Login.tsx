import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/auth-context';
import { friendlyAuthError } from '../../features/auth/api';
import { ApiError } from '../../lib/api';
import type { AccountType } from '../../lib/api';
import { Field } from '../../components/ui/Field';
import { AccountTypeSelector } from './AccountTypeSelector';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Login(): JSX.Element {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [accountType, setAccountType] = useState<AccountType>('person');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function validate(): boolean {
    const next: typeof errors = {};
    if (!EMAIL_RE.test(email.trim())) next.email = 'Enter a valid email address.';
    if (password.length < 1) next.password = 'Enter your password.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    setSubmitError(null);
    if (!validate()) return;
    setPending(true);
    try {
      await login(accountType, email.trim(), password);
      navigate(accountType === 'person' ? '/dashboard' : '/clubs', { replace: true });
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
          <aside className="auth-side" aria-hidden="false">
            <img src="/logo.png" alt="Stackfit logo" />
            <h2>Welcome back to Stackfit</h2>
            <p>Find your path. Build what&apos;s next — pick up exactly where you left off.</p>
            <ul>
              <li>✅ <span>Students: continue your roadmap, quizzes, and taster projects.</span></li>
              <li>✅ <span>Clubs: publish hackathons, meetups, and conferences.</span></li>
              <li>✅ <span>One account type per sign-in — person or organisation.</span></li>
            </ul>
          </aside>
          <div className="auth-main">
            <h1>Sign in</h1>
            <p className="auth-sub">Choose your account type, then enter your credentials.</p>
            <AccountTypeSelector value={accountType} onChange={(v) => { setAccountType(v); setSubmitError(null); }} />
            {accountType === 'organisation' ? (
              <div className="form-note" role="note">
                Organisation sign-in is for university clubs with a registered club email
                (demo password <code>club2000</code> for seeded clubs).
              </div>
            ) : null}
            {submitError ? (
              <div className="form-error" role="alert">
                {submitError}
              </div>
            ) : null}
            <form onSubmit={onSubmit} noValidate>
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
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={errors.password}
              />
              <button type="submit" className="btn btn-primary btn-block" disabled={pending}>
                {pending ? 'Signing in…' : `Sign in as ${accountType === 'person' ? 'person' : 'organisation'}`}
              </button>
            </form>
            <p className="auth-switch">
              New to Stackfit? <Link to="/register">Create an account</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
