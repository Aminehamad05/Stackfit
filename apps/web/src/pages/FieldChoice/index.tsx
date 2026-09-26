import { useState } from 'react';
import { api } from '../../lib/api';
import { apiErrorMessage } from '../../lib/errors';
import type { FieldMatch, FitEntry } from '../../lib/types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState, ErrorState, ProgressBar } from '../../components/ui/States';

export default function FieldChoice(): JSX.Element {
  const [matches, setMatches] = useState<FieldMatch[]>([]);
  const [fit, setFit] = useState<FitEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roadmapId, setRoadmapId] = useState<number | null>(null);

  async function compute(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ matches: FieldMatch[] }>('/users/me/field-matches/compute', { method: 'POST', body: {} });
      setMatches(r.matches);
      setFit([]);
      setRoadmapId(null);
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function loadFit(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      setFit((await api<{ fit: FitEntry[] }>('/users/me/field-fit')).fit);
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function choose(fieldId: number): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ roadmap: { id: number } }>('/users/me/field-choice', { method: 'POST', body: { fieldId } });
      setRoadmapId(r.roadmap.id);
      // Dashboard's "Continue your roadmap" action reads this key.
      localStorage.setItem('cp_roadmap_id', String(r.roadmap.id));
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container">
      <div className="page-head">
        <h1>Your top fields</h1>
        <p>Deterministic match from your background. Best field = 100% compatibility.</p>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <Button variant="primary" onClick={() => void compute()} disabled={busy}>Compute my top-3</Button>
        <Button variant="secondary" onClick={() => void loadFit()} disabled={busy || matches.length === 0}>Fit after tasters</Button>
      </div>
      {error ? <div style={{ marginTop: 12 }}><ErrorState title="Something went wrong" body={error} onRetry={() => void compute()} /></div> : null}
      {matches.length === 0 && !error ? (
        <div style={{ marginTop: 12 }}>
          <EmptyState title="No matches yet" body="Save your background first, then compute your top-3 fields." actionLabel="Go to onboarding" actionTo="/onboarding" />
        </div>
      ) : null}
      {matches.map((m) => (
        <Card key={m.fieldId}>
          <h2>{m.name} {m.chosen ? <Badge tone="teal">chosen</Badge> : null}</h2>
          <p>{m.description}</p>
          <ProgressBar value={m.compatibility} label={`${m.compatibility}% compatible · skill ${m.skillMatch ?? '?'}% · interest ${m.interestMatch ?? '?'}%`} />
          {m.matchedConcepts && m.matchedConcepts.length > 0 ? (
            <p style={{ fontSize: '0.875rem' }}>You already know: {m.matchedConcepts.map((c) => c.name).join(', ')}</p>
          ) : null}
          <Button variant="accent" onClick={() => void choose(m.fieldId)} disabled={busy}>Choose {m.name}</Button>
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
      {roadmapId !== null ? (
        <p><Button variant="primary" to={`/roadmap?id=${roadmapId}`}>Open your roadmap →</Button></p>
      ) : null}
    </div>
  );
}
