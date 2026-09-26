import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { apiErrorMessage } from '../../lib/errors';
import type { ProjectSuggestion } from '../../lib/types';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { ErrorState, LoadingSkeleton, ProgressBar } from '../../components/ui/States';

export default function Projects(): JSX.Element {
  const [items, setItems] = useState<ProjectSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ suggestions: ProjectSuggestion[] }>('/users/me/project-suggestions')
      .then((r) => setItems(r.suggestions))
      .catch((e: unknown) => setError(apiErrorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="container">
      <div className="page-head">
        <h1>Projects for you</h1>
        <p>Suggested the moment your course knowledge covers what the build needs. Ready ones first.</p>
      </div>
      {loading ? <LoadingSkeleton lines={4} /> : null}
      {error ? <ErrorState title="Something went wrong" body={error} /> : null}
      {items.map((p) => (
        <Card key={p.slug}>
          <h2>{p.ready ? '✅ ' : ''}{p.title} <Badge tone={p.ready ? 'teal' : 'gray'}>{p.level} · ~{p.estHours}h</Badge></h2>
          <p>{p.description}</p>
          <ProgressBar value={p.total ? (p.mastered / p.total) * 100 : 0} label={`${p.mastered}/${p.total} concepts mastered`} />
          {p.missing.length > 0 ? <p style={{ fontSize: '0.875rem' }}>Unlock by passing: {p.missing.join(', ')}</p> : null}
          {p.deliverableHint ? <p style={{ fontSize: '0.875rem' }}>Deliverable: {p.deliverableHint}</p> : null}
        </Card>
      ))}
    </div>
  );
}
