import { useState } from 'react';
import { api } from '../../lib/api';
import { apiErrorMessage } from '../../lib/errors';
import type { Taster } from '../../lib/types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ErrorState } from '../../components/ui/States';
import { Field } from '../../components/ui/Field';

export default function Taster(): JSX.Element {
  const [fieldId, setFieldId] = useState('4');
  const [taster, setTaster] = useState<Taster | null>(null);
  const [tasterId, setTasterId] = useState('');
  const [reflection, setReflection] = useState('');
  const [enjoyment, setEnjoyment] = useState(5);
  const [difficulty, setDifficulty] = useState(3);
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function wrap(fn: () => Promise<void>): Promise<void> {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await fn();
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container">
      <div className="page-head">
        <h1>Taster projects</h1>
        <p>Short hands-on taste of a field (1–3h) before you commit.</p>
      </div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'end' }}>
        <Field label="Field id" name="fieldId" value={fieldId} onChange={(e) => setFieldId(e.target.value)} />
        <Button variant="secondary" onClick={() => void wrap(async () => {
          const r = await api<{ taster: Taster }>(`/fields/${fieldId}/taster`);
          setTaster(r.taster);
          setTasterId(String(r.taster.id));
        })} disabled={busy}>Load taster</Button>
      </div>
      {error ? <ErrorState title="Something went wrong" body={error} /> : null}
      {notice ? <p><Badge tone="teal">{notice}</Badge></p> : null}
      {taster ? (
        <Card>
          <h2>{taster.title} <Badge tone="blue">~{taster.estHours}h · {taster.level}</Badge></h2>
          <p>{taster.description}</p>
          <h3>Rubric</h3>
          <ul>{taster.rubric.map((c) => <li key={c.id}>{c.criterion} (weight {c.weight})</li>)}</ul>
          <Button variant="primary" onClick={() => void wrap(async () => {
            await api(`/users/me/tasters/${tasterId}/start`, { method: 'POST', body: {} });
            setNotice('Taster started. Good luck!');
          })} disabled={busy || !tasterId}>Start</Button>
          <h3>Submit</h3>
          <Field label="Submission URL (repo)" name="url" value={url} onChange={(e) => setUrl(e.target.value)} />
          <div style={{ display: 'flex', gap: 12 }}>
            <label>Enjoyment (1–5)
              <input type="number" min={1} max={5} value={enjoyment} onChange={(e) => setEnjoyment(+e.target.value)} />
            </label>
            <label>Difficulty (1–5)
              <input type="number" min={1} max={5} value={difficulty} onChange={(e) => setDifficulty(+e.target.value)} />
            </label>
          </div>
          <label>Reflection (explain it like to a non-technical friend)
            <textarea value={reflection} onChange={(e) => setReflection(e.target.value)} rows={4} style={{ width: '100%' }} />
          </label>
          <div style={{ marginTop: 8 }}>
            <Button variant="accent" onClick={() => void wrap(async () => {
              await api(`/users/me/tasters/${tasterId}/submit`, {
                method: 'POST',
                body: { submissionUrl: url || undefined, enjoyment, difficulty, wouldContinue: enjoyment >= 4, reflection },
              });
              setNotice('Submitted! AI review is disabled for now — your reflection is saved.');
            })} disabled={busy || !tasterId}>Submit taster</Button>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
