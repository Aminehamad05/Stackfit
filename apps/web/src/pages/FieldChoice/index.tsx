import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError, api } from '../../lib/api';
import { fetchDashboard } from '../../features/dashboard/api';
import { apiErrorMessage } from '../../lib/errors';
import type { FieldMatch, FitEntry } from '../../lib/types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { EmptyState, ErrorState, LoadingSkeleton, ProgressBar } from '../../components/ui/States';

// Assessment submission lands here: top-3 auto-compute on mount, no manual
// trigger, no field substitution — the only action is entering tasting.
// Committed users are sent to their roadmap: this section is tasting-only.
export default function FieldChoice(): JSX.Element {
  const navigate = useNavigate();
  const [matches, setMatches] = useState<FieldMatch[]>([]);
  const [fit, setFit] = useState<FitEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noBackground, setNoBackground] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        // Final path already picked → this section is gone; go to the roadmap.
        const dash = await fetchDashboard().catch(() => null);
        if (dash?.phase === 'committed') {
          navigate('/roadmap', { replace: true });
          return;
        }
        const r = await api<{ matches: FieldMatch[] }>('/users/me/field-matches/compute', { method: 'POST', body: {} });
        setMatches(r.matches);
        try {
          setFit((await api<{ fit: FitEntry[] }>('/users/me/field-fit')).fit);
        } catch {
          setFit([]); // fit is informational; never block the top-3 on it.
        }
      } catch (e) {
        // The only 400 compute can produce is "save background first".
        if (e instanceof ApiError && e.status === 400) setNoBackground(true);
        else setError(apiErrorMessage(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="container">
      <div className="page-head">
        <h1>Your top fields</h1>
        <p>Matched from your background. Best field = 100% compatibility.</p>
      </div>
      {loading ? <LoadingSkeleton lines={3} /> : null}
      {error ? <ErrorState title="Something went wrong" body={error} /> : null}
      {!loading && !error && noBackground ? (
        <EmptyState title="No background yet" body="Answer the assessment first so we can match fields to you." actionLabel="Take the assessment" actionTo="/assessment" />
      ) : null}
      {matches.map((m) => (
        <Card key={m.fieldId}>
          <h2>{m.name}</h2>
          <p>{m.description}</p>
          <ProgressBar value={m.compatibility} label={`${m.compatibility}% compatible · skill ${m.skillMatch ?? '?'}% · interest ${m.interestMatch ?? '?'}%`} />
          {m.matchedConcepts && m.matchedConcepts.length > 0 ? (
            <p style={{ fontSize: '0.875rem' }}>You already know: {m.matchedConcepts.map((c) => c.name).join(', ')}</p>
          ) : null}
        </Card>
      ))}
      {fit.length > 0 ? (
        <Card>
          <h2>Fit after tasters</h2>
          {fit.map((f) => (
            <p key={f.fieldId}>{f.slug}: {f.fit === null ? <em>not tried yet</em> : <strong>{Math.round(f.fit * 100)}%</strong>}</p>
          ))}
        </Card>
      ) : null}
      {matches.length > 0 ? (
        <div style={{ margin: '16px 0' }}>
          <Button variant="primary" to="/taster" block>Start tasting these 3 fields →</Button>
        </div>
      ) : null}
    </div>
  );
}
