import { useEffect, useRef, useState } from 'react';
import { api } from '../../lib/api';
import { apiErrorMessage } from '../../lib/errors';
import type { PathNode } from '../../features/roadmap/api';
import type { QuizQuestion } from '../../lib/types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ErrorState } from '../../components/ui/States';

const KIND_META: Record<PathNode['kind'], { shape: string; label: string }> = {
  course: { shape: '●', label: 'Course' },
  quiz: { shape: '◆', label: 'Quiz gate' },
  project: { shape: '⬡', label: 'Project gate' },
  cert: { shape: '🎖', label: 'Bonus certification' },
};

function stateGlyph(state: PathNode['state']): string {
  if (state === 'completed') return '✓';
  if (state === 'locked') return '🔒';
  if (state === 'skip_eligible') return '⇄';
  return '▶';
}

function nodeTitle(n: PathNode): string {
  if (n.kind === 'course') return n.concept?.name ?? n.key;
  if (n.kind === 'quiz') return `Quiz: ${n.concept?.name ?? ''}`;
  if (n.kind === 'project') return n.taster?.title ?? n.key;
  return n.cert?.title ?? n.key;
}

export default function NodeDrawer({
  node,
  onClose,
  onUnlocked,
}: {
  node: PathNode | null;
  onClose: () => void;
  onUnlocked: () => void;
}): JSX.Element | null {
  if (!node) return null;
  const meta = KIND_META[node.kind];
  return (
    <div className="path-drawer-backdrop" onClick={onClose} aria-hidden="true">
      <aside
        className="path-drawer"
        role="dialog"
        aria-modal="false"
        aria-label={nodeTitle(node)}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>
            <Badge tone={node.kind === 'cert' ? 'teal' : 'blue'}>{meta.label}</Badge>{' '}
            <Badge tone={node.state === 'completed' ? 'teal' : node.state === 'locked' ? 'gray' : 'blue'}>
              {node.state.replace('_', ' ')}
            </Badge>
          </span>
          <Button variant="ghost" onClick={onClose} aria-label="Close details">✕</Button>
        </div>
        <h2>{nodeTitle(node)}</h2>
        {node.kind === 'course' && node.resource ? (
          <>
            <p>{node.resource.title}</p>
            <a className="btn btn-primary" href={node.resource.url} target="_blank" rel="noreferrer">
              {node.resource.isFree ? 'Start free resource →' : 'Open resource →'}
            </a>
          </>
        ) : null}
        {node.kind === 'course' && !node.resource ? <p>No resource linked yet.</p> : null}
        {node.kind === 'quiz' ? <QuizRunner node={node} onUnlocked={onUnlocked} /> : null}
        {node.kind === 'project' && node.taster ? (
          <>
            <p>Build to unblock the path — graded like a taster ({node.taster.estHours}h, {node.taster.level}).</p>
            <p style={{ fontSize: '0.875rem' }}>
              Status: {node.userStatus ?? 'not started'}. Start & submit from the Taster page (AI review disabled — reflection is saved).
            </p>
            <Button variant="primary" to="/taster">Open Taster page →</Button>
          </>
        ) : null}
        {node.kind === 'cert' && node.cert ? (
          <>
            <p>Prestige extra — optional, never blocks advancement.</p>
            <Button variant="secondary" to="/dashboard">Track on dashboard →</Button>
          </>
        ) : null}
      </aside>
    </div>
  );
}

function QuizRunner({ node, onUnlocked }: { node: PathNode; onUnlocked: () => void }): JSX.Element {
  const conceptId = node.concept?.id;
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [picked, setPicked] = useState<Record<number, number>>({});
  const [result, setResult] = useState<{ score: number; passed: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (conceptId === undefined) return;
    setBusy(true);
    api<{ questions: QuizQuestion[] }>(`/concepts/${conceptId}/quiz`)
      .then((r) => setQuestions(r.questions))
      .catch((e: unknown) => setError(apiErrorMessage(e)))
      .finally(() => setBusy(false));
  }, [conceptId]);

  async function submit(): Promise<void> {
    if (conceptId === undefined) return;
    setBusy(true);
    setError(null);
    try {
      const answers = questions
        .filter((q) => picked[q.id] !== undefined)
        .map((q) => ({ questionId: q.id, optionId: picked[q.id] }));
      const r = await api<{ score: number; passed: boolean }>(`/concepts/${conceptId}/quiz/attempt`, {
        method: 'POST',
        body: { answers },
      });
      setResult(r);
      if (r.passed) onUnlocked();
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  if (node.state === 'locked') return <p>🔒 Pass the previous steps to unlock this quiz.</p>;
  return (
    <div>
      <p style={{ fontSize: '0.875rem' }}>
        {node.questionCount ?? 0} questions banked · pass ≥ {Math.round((node.passThreshold ?? 0.7) * 100)}%
      </p>
      {error ? <ErrorState title="Quiz failed" body={error} /> : null}
      {questions.map((q) => (
        <div key={q.id} style={{ margin: '8px 0' }}>
          <strong>Q: </strong>{q.stem}
          {q.options.map((o) => (
            <label key={o.id} style={{ display: 'block', margin: '4px 0' }}>
              <input type="radio" name={`pq${q.id}`} checked={picked[q.id] === o.id}
                onChange={() => setPicked((p) => ({ ...p, [q.id]: o.id }))} /> {o.text}
            </label>
          ))}
        </div>
      ))}
      {questions.length > 0 ? <Button variant="accent" onClick={() => void submit()} disabled={busy}>Submit attempt</Button> : null}
      {result ? <p><strong>Score {Math.round(result.score * 100)}% — {result.passed ? 'passed ✅ watch the lock open!' : 'try again ❌'}</strong></p> : null}
    </div>
  );
}

export { stateGlyph };
