import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { apiErrorMessage } from '../../lib/errors';
import type { CertificationProgress, EarnedCertification } from '../../lib/types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ErrorState, LoadingSkeleton } from '../../components/ui/States';

export default function Certs(): JSX.Element {
  const [earned, setEarned] = useState<EarnedCertification[]>([]);
  const [pending, setPending] = useState<CertificationProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function load(): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const r = await api<{ earned: EarnedCertification[]; inProgress: CertificationProgress[] }>('/users/me/certifications');
      setEarned(r.earned);
      setPending(r.inProgress);
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function check(): Promise<void> {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const r = await api<{ awarded: string[] }>('/users/me/certifications/check', { method: 'POST', body: {} });
      setNotice(r.awarded.length > 0 ? `Awarded: ${r.awarded.join(', ')}` : 'Nothing new yet — keep completing courses.');
      await load();
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container">
      <div className="page-head">
        <h1>Certifications</h1>
        <p>Awarded automatically when you complete the important courses (quizzes + taster).</p>
      </div>
      <Button variant="primary" onClick={() => void check()} disabled={busy}>Check & award now</Button>
      {notice ? <p><Badge tone="teal">{notice}</Badge></p> : null}
      {error ? <ErrorState title="Something went wrong" body={error} onRetry={() => void load()} /> : null}
      {loading ? <LoadingSkeleton /> : null}
      <h2>Earned ({earned.length})</h2>
      {earned.map((c) => (
        <Card key={c.slug}>🏅 <strong>{c.title}</strong> <span style={{ fontSize: '0.875rem' }}>awarded {new Date(c.awardedAt).toLocaleDateString()}</span></Card>
      ))}
      <h2>In progress</h2>
      {pending.map((c) => (
        <Card key={c.slug}>
          <strong>{c.title}</strong> <Badge tone="gray">{c.field}</Badge>
          {c.missingConcepts.length > 0 ? <p style={{ fontSize: '0.875rem' }}>Still to pass: {c.missingConcepts.join(', ')}</p> : null}
          {c.needsTaster ? <p style={{ fontSize: '0.875rem' }}>Needs a reviewed taster in this field.</p> : null}
          {c.needsInterviews > 0 ? <p style={{ fontSize: '0.875rem' }}>Needs {c.needsInterviews} passed interview(s).</p> : null}
        </Card>
      ))}
    </div>
  );
}
