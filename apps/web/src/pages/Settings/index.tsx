import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/auth-context';
import { useTheme } from '../../features/theme/theme-context';
import { ApiError } from '../../lib/api';
import { apiErrorMessage } from '../../lib/errors';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState, ErrorState } from '../../components/ui/States';
import { Field } from '../../components/ui/Field';

export default function Settings(): JSX.Element {
  const { account, userEmail, displayName, saveProfile, changePassword, deleteAccount, logout } = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [name, setName] = useState(displayName ?? '');
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [erase, setErase] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function run(fn: () => Promise<void>, done: string): Promise<void> {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await fn();
      setNotice(done);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) setError('Current password is incorrect.');
      else setError(apiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  function submitName(e: FormEvent): void {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Display name cannot be empty.');
      return;
    }
    void run(() => saveProfile({ displayName: trimmed }), 'Display name updated.');
  }

  function submitPassword(e: FormEvent): void {
    e.preventDefault();
    if (next.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (next !== confirmPw) {
      setError('New passwords do not match — please retype the same password.');
      return;
    }
    void run(
      async () => {
        await changePassword({ currentPassword: current, newPassword: next });
        setCurrent('');
        setNext('');
        setConfirmPw('');
      },
      'Password changed. Use it next time you sign in.',
    );
  }

  function submitDelete(e: FormEvent): void {
    e.preventDefault();
    if (erase.trim().toLowerCase() !== (userEmail ?? '').toLowerCase()) {
      setError('Type your exact account email to confirm deletion.');
      return;
    }
    if (!confirm('Delete your account and all progress permanently? This cannot be undone.')) return;
    void (async () => {
      setBusy(true);
      setError(null);
      try {
        await deleteAccount();
        navigate('/', { replace: true });
      } catch (err) {
        setError(apiErrorMessage(err));
        setBusy(false);
      }
    })();
  }

  return (
    <div className="container">
      <div className="page-head">
        <h1>Parameters</h1>
        <p>Account, appearance, security — everything that is yours to change.</p>
      </div>

      {error ? <div style={{ marginBottom: 12 }}><ErrorState title="Something went wrong" body={error} /></div> : null}
      {notice ? <p><Badge tone="teal">{notice}</Badge></p> : null}

      <Card>
        <h2>Appearance</h2>
        <p style={{ fontSize: '0.875rem' }}>Light pages by day, dark navy by night. Your choice is remembered on this device.</p>
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant={theme === 'light' ? 'primary' : 'secondary'} onClick={toggleTheme} disabled={busy || theme === 'light'}>
            ☀️ Light
          </Button>
          <Button variant={theme === 'dark' ? 'primary' : 'secondary'} onClick={toggleTheme} disabled={busy || theme === 'dark'}>
            🌙 Dark
          </Button>
        </div>
      </Card>

      {account === null ? (
        <div style={{ marginTop: 16 }}>
          <EmptyState title="Sign in for more settings" body="Display name, password, and account controls appear once you have an account." actionLabel="Sign in" actionTo="/login" />
        </div>
      ) : null}

      {account === 'person' ? (
        <>
          <Card>
            <h2>Account</h2>
            <form onSubmit={submitName}>
              <Field label="Display name" name="settingsName" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} placeholder={displayName ?? ''} />
              <Field label="Email (cannot be changed)" name="settingsEmail" value={userEmail ?? ''} disabled />
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button type="submit" className="btn btn-primary" disabled={busy || name.trim() === '' || name.trim() === (displayName ?? '')}>
                  Save name
                </button>
                <Link className="btn btn-secondary" to="/profile">Manage photo →</Link>
              </div>
            </form>
          </Card>

          <Card>
            <h2>Security</h2>
            <form onSubmit={submitPassword}>
              <Field label="Current password" name="currentPassword" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
              <Field label="New password" name="newPassword" type="password" autoComplete="new-password" placeholder="Minimum 8 characters" value={next} onChange={(e) => setNext(e.target.value)} hint="At least 8 characters." />
              <Field label="Confirm new password" name="confirmPassword" type="password" autoComplete="new-password" placeholder="Retype the new password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} />
              <button type="submit" className="btn btn-primary" disabled={busy}>
                Change password
              </button>
            </form>
          </Card>

          <Card>
            <h2>Danger zone</h2>
            <p style={{ fontSize: '0.875rem' }}>
              Deleting removes your account, background, roadmaps, quiz attempts, points, and
              certifications — permanently. Type your email <code>{userEmail}</code> to confirm.
            </p>
            <form onSubmit={submitDelete}>
              <Field label="Confirm with your email" name="erase" value={erase} onChange={(e) => setErase(e.target.value)} placeholder={userEmail ?? ''} />
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button type="submit" className="btn btn-danger" disabled={busy}>Delete my account</button>
                <Button variant="secondary" onClick={() => { logout(); navigate('/', { replace: true }); }} disabled={busy}>
                  Sign out
                </Button>
              </div>
            </form>
          </Card>
        </>
      ) : null}

      {account === 'organisation' ? (
        <Card>
          <h2>Organisation</h2>
          <p style={{ fontSize: '0.875rem' }}>Club accounts manage events only — password and deletion are handled by your club admin for now.</p>
          <Link className="btn btn-secondary" to="/org">Go to Org dashboard</Link>
        </Card>
      ) : null}
    </div>
  );
}
