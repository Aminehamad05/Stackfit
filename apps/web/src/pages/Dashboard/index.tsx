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
  const [draft, setDraft] = useState<string[]>([]);
  const [applying, setApplying] = useState(false);
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
          setDraft(seed);
        } else {
          setList(stored);
          setDraft(stored);
        }
      } catch (e: unknown) {
        setError(apiErrorMessage(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Toggles only stage into a draft — Apply commits, so only kept fields remain.
  function toggle(slug: string): void {
    setDraft((prev) => toggleTastingSlug(prev, slug));
  }

  function sameList(a: string[], b: string[]): boolean {
    return a.length === b.length && a.every((s) => b.includes(s));
  }

  function apply(): void {
    setApplying(true);
    try {
      setTastingList(draft);
      setList(draft);
    } finally {
      setApplying(false);
    }
  }

  const dirty = !sameList(draft, tastingList);
  const visibleTaste = taste.filter((b) => tastingList.includes(b.field.slug));

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
          <div style={{ display: 'grid', gap: 14, marginTop: 12 }}>
          {taste.length === 0 ? (
            <Card>
              <p>Nothing tasted yet.</p>
              <Button variant="primary" to="/onboarding">Tell us your background →</Button>
            </Card>
          ) : null}
          {visibleTaste.map((b) => (
            <Card key={b.field.slug}>
              <h2 style={{ margin: '0 0 10px' }}>{b.field.name}</h2>
              <ProgressBar
                value={b.tasters.total > 0 ? (b.tasters.done / b.tasters.total) * 100 : 0}
                label={`Tasters reviewed ${b.tasters.done}/${b.tasters.total} · quizzes passed ${b.quizzesPassed}`}
              />
              <p style={{ fontSize: '0.875rem', margin: '10px 0' }}>
                {b.enjoyment !== null ? `Enjoyment ${b.enjoyment}/5 · ` : ''}
                {b.performance !== null ? `Performance ${Math.round(b.performance * 100)}%` : 'No reviewed taster yet'}
              </p>
              <div style={{ marginTop: 12 }}>
                <Button variant="secondary" to="/field-choice">Compare fields →</Button>
              </div>
            </Card>
          ))}
          {allFields.length > 0 ? (
            <Card>
              <h2 style={{ margin: '0 0 6px' }}>Tasting list</h2>
              <p style={{ fontSize: '0.875rem', margin: '0 0 12px' }}>Pick fields, then apply — only kept fields stay on this page and your roadmap.</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {allFields.map((f) => {
                  const on = draft.includes(f.slug);
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
              <div style={{ marginTop: 14 }}>
                <Button variant="primary" onClick={apply} disabled={!dirty || applying}>
                  {applying ? 'Applying…' : dirty ? `Apply changes (${draft.length} kept)` : 'Up to date ✓'}
                </Button>
              </div>
            </Card>
          ) : null}
          </div>
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
