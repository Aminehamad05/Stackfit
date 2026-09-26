import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { apiErrorMessage } from '../../lib/errors';
import type { RoadmapStep } from '../../lib/types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ErrorState, EmptyState } from '../../components/ui/States';
import { Field } from '../../components/ui/Field';

export default function Roadmap(): JSX.Element {
  const [params] = useSearchParams();
  const [id, setId] = useState(params.get('id') ?? '1');
  const [steps, setSteps] = useState<RoadmapStep[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      setSteps((await api<{ steps: RoadmapStep[] }>(`/roadmaps/${id}`)).steps);
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container">
      <div className="page-head">
        <h1>Roadmap</h1>
        <p>Your ordered concept steps — prerequisites always come first.</p>
      </div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'end' }}>
        <Field label="Roadmap id" name="roadmapId" value={id} onChange={(e) => setId(e.target.value)} />
        <Button variant="primary" onClick={() => void load()} disabled={busy}>Load</Button>
      </div>
      {error ? <ErrorState title="Something went wrong" body={error} onRetry={() => void load()} /> : null}
      {steps.length === 0 && !error ? (
        <EmptyState title="No roadmap loaded" body="Pick a field first, then open its roadmap here." actionLabel="Choose a field" actionTo="/field-choice" />
      ) : null}
      {steps.map((s) => (
        <Card key={s.position}>
          <strong>{s.position}. {s.concept.name}</strong> <Badge tone={s.status === 'locked' ? 'gray' : 'teal'}>{s.status}</Badge>
          {s.resource ? (
            <div><a href={s.resource.url} target="_blank" rel="noreferrer">{s.resource.title}</a></div>
          ) : (
            <div style={{ fontSize: '0.875rem' }}>No resource linked yet.</div>
          )}
        </Card>
      ))}
    </div>
  );
}
