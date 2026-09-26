import { useState } from 'react';
import { api } from '../../lib/api';
import { apiErrorMessage } from '../../lib/errors';
import type { QuizQuestion } from '../../lib/types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ErrorState } from '../../components/ui/States';
import { Field } from '../../components/ui/Field';

export default function Quiz(): JSX.Element {
  const [conceptId, setConceptId] = useState('45');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [picked, setPicked] = useState<Record<number, number>>({});
  const [result, setResult] = useState<{ score: number; passed: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(): Promise<void> {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      setQuestions((await api<{ questions: QuizQuestion[] }>(`/concepts/${conceptId}/quiz`)).questions);
      setPicked({});
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function submit(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const answers = questions
        .filter((q) => picked[q.id] !== undefined)
        .map((q) => ({ questionId: q.id, optionId: picked[q.id] }));
      setResult(await api<{ score: number; passed: boolean }>(`/concepts/${conceptId}/quiz/attempt`, {
        method: 'POST',
        body: { answers },
      }));
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container">
      <div className="page-head">
        <h1>Quiz gate</h1>
        <p>Pass the quiz to unlock the next roadmap step.</p>
      </div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'end' }}>
        <Field label="Concept id" name="conceptId" value={conceptId} onChange={(e) => setConceptId(e.target.value)} />
        <Button variant="primary" onClick={() => void load()} disabled={busy}>Load questions</Button>
      </div>
      {error ? <ErrorState title="Something went wrong" body={error} onRetry={() => void load()} /> : null}
      {questions.map((q) => (
        <Card key={q.id}>
          <strong>Q{q.id}:</strong> {q.stem}
          {q.options.map((o) => (
            <label key={o.id} style={{ display: 'block', margin: '4px 0' }}>
              <input
                type="radio"
                name={`q${q.id}`}
                checked={picked[q.id] === o.id}
                onChange={() => setPicked((p) => ({ ...p, [q.id]: o.id }))}
              /> {o.text}
            </label>
          ))}
        </Card>
      ))}
      {questions.length > 0 ? <Button variant="accent" onClick={() => void submit()} disabled={busy}>Submit attempt</Button> : null}
      {result ? <p><strong>Score: {Math.round(result.score * 100)}% — {result.passed ? 'passed ✅' : 'try again ❌'}</strong></p> : null}
    </div>
  );
}
