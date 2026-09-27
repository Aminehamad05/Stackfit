import { useEffect, useState } from 'react';
import { fetchDashboard, type CommittedBlock, type TasteBlock } from '../../features/dashboard/api';
import { getTastingList, setTastingList, toggleTastingSlug } from '../../features/tasting/list';
import { api } from '../../lib/api';
import { apiErrorMessage } from '../../lib/errors';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ErrorState, LoadingSkeleton, ProgressBar } from '../../components/ui/States';

// Phase-aware dashboard (product-decisions.md, confirmed by user, 2026-09-27):
// tasting = one KPI block per tasted domain; committed = exactly one block.
export default function Dashboard(): JSX.Element {
  const [phase, setPhase] = useState<'tasting' | 'committed' | null>(null);
  const [taste, setTaste] = useState<TasteBlock[]>([]);
  const [committed, setCommitted] = useState<CommittedBlock | null>(null);
  const [allFields, setAllFields] = useState<Array<{ slug: string; name: string }>>([]);
  const [tastingList, setList] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [d, f] = await Promise.all([
          fetchDashboard(),
          api<{ fields: Array<{ slug: string; name: string }> }>('/fields').catch(() => ({ fields: [] })),
        ]);
        setPhase(d.phase);
        setTaste(d.taste);
        setCommitted(d.committed);
        setAllFields(f.fields);
        const stored = getTastingList();
        if (stored === null) {
          const seed = d.taste.map((b) => b.field.slug);
          setTastingList(seed);
          setList(seed);
        } else {
          setList(stored);
        }
      } catch (e: unknown) {
        setError(apiErrorMessage(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function toggle(slug: string): void {
    setList((prev) => {
      const next = toggleTastingSlug(prev, slug);
      setTastingList(next);
      return next;
    });
  }

  return (
    <div className="container">
      <div className="page-head">
        <h1>{phase === 'committed' ? 'My field' : 'My fields'}</h1>
      </div>
      {loading ? <LoadingSkeleton lines={4} /> : null}
      {error ? <ErrorState title="Couldn't load your dashboard" body={error} /> : null}
      {!loading && !error && phase === 'tasting' ? (
        <>
          <p>One block per domain you are tasting.</p>
          {taste.length === 0 ? (
            <Card>
              <p>Nothing tasted yet.</p>
              <Button variant="primary" to="/onboarding">Tell us your background →</Button>
            </Card>
          ) : null}
          {taste.map((b) => (
            <Card key={b.field.slug}>
              <h2>{b.field.name}</h2>
              <ProgressBar
                value={b.tasters.total > 0 ? (b.tasters.done / b.tasters.total) * 100 : 0}
                label={`Tasters reviewed ${b.tasters.done}/${b.tasters.total} · quizzes passed ${b.quizzesPassed}`}
              />
              <p style={{ fontSize: '0.875rem' }}>
                {b.enjoyment !== null ? `Enjoyment ${b.enjoyment}/5 · ` : ''}
                {b.performance !== null ? `Performance ${Math.round(b.performance * 100)}%` : 'No reviewed taster yet'}
              </p>
              <Button variant="secondary" to="/field-choice">Compare fields →</Button>
            </Card>
          ))}
          {allFields.length > 0 ? (
            <Card>
              <h2>Tasting list</h2>
              <p style={{ fontSize: '0.875rem' }}>Pick which fields appear as mini roadmaps on your roadmap page.</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {allFields.map((f) => {
                  const on = tastingList.includes(f.slug);
                  return (
                    <Button
                      key={f.slug}
                      variant={on ? 'primary' : 'secondary'}
                      onClick={() => toggle(f.slug)}
                      aria-pressed={on}
                      title={on ? 'Remove from tasting list' : 'Add to tasting list'}
                    >
                      {on ? '✓ ' : '+ '}{f.name}
                    </Button>
                  );
                })}
              </div>
            </Card>
          ) : null}
        </>
      ) : null}
      {!loading && !error && phase === 'committed' && committed ? (
        <Card>
          <h2>{committed.field.name} <Badge tone="teal">committed</Badge></h2>
          <ProgressBar value={committed.completionPct} label={`Roadmap ${committed.milestones.done}/${committed.milestones.total} milestones · ${committed.completionPct}%`} />
          <ul style={{ fontSize: '0.875rem' }}>
            <li>Quizzes passed: {committed.quizzesPassed}</li>
            <li>Mandatory projects done: {committed.projects.done}/{committed.projects.total}</li>
            <li>Certs earned: {committed.certsEarned.length > 0 ? committed.certsEarned.map((c) => c.title).join(', ') : 'none yet'}</li>
            <li>Points: {committed.points}{committed.rank !== null ? ` · rank #${committed.rank}` : ''}</li>
          </ul>
          {committed.roadmapId !== null ? (
            <Button variant="primary" to={`/roadmap?id=${committed.roadmapId}`}>Continue your roadmap →</Button>
          ) : (
            <Button variant="primary" to="/field-choice">Open your roadmap →</Button>
          )}
        </Card>
      ) : null}
    </div>
  );
}
