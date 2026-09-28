import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { apiErrorMessage } from '../../lib/errors';
import type { ProjectSuggestion, Taster } from '../../lib/types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ErrorState, ProgressBar } from '../../components/ui/States';
import { Field } from '../../components/ui/Field';

interface TastingConcept {
  slug: string;
  name: string;
  level: string;
  importance: number;
  resource: { title: string; url: string } | null;
}

interface Tasting {
  field: { id: number; slug: string; name: string; description: string };
  simplestConcepts: TastingConcept[];
  tastings: Array<Taster & { concepts: Array<{ slug: string; name: string }>; resources: Array<{ title: string; url: string }> }>;
  starterProjects: ProjectSuggestion[];
}

export default function Taster(): JSX.Element {
  const [fields, setFields] = useState<Array<{ id: number; name: string }>>([]);
  const [fieldId, setFieldId] = useState('');
  const [tasting, setTasting] = useState<Tasting | null>(null);
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

  useEffect(() => {
    api<{ fields: Array<{ id: number; name: string }> }>('/fields')
      .then((r) => {
        setFields(r.fields);
        if (r.fields.length > 0) setFieldId((v) => v || String(r.fields[0].id));
      })
      .catch((e: unknown) => setError(apiErrorMessage(e)));
  }, []);

  return (
    <div className="container">
      <div className="page-head">
        <h1>Taster projects</h1>
        <p>Short hands-on taste of a field (1–3h) before you commit.</p>
      </div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'end', flexWrap: 'wrap' }}>
        <div className="field" style={{ marginBottom: 0, minWidth: 240 }}>
          <label className="field-label" htmlFor="t-field">Field</label>
          <select id="t-field" className="select" value={fieldId} onChange={(e) => setFieldId(e.target.value)}>
            {fields.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <span className="field-label" aria-hidden="true">&nbsp;</span>
          <div style={{ display: 'flex', gap: 10, minHeight: 46, alignItems: 'center' }}>
            <Button variant="primary" onClick={() => void wrap(async () => {
              const r = await api<Tasting>(`/fields/${fieldId}/tasting`);
              setTasting(r);
              setTaster(null);
              setTasterId('');
            })} disabled={busy}>Taste this field</Button>
            <Button variant="secondary" onClick={() => void wrap(async () => {
              const r = await api<{ taster: Taster }>(`/fields/${fieldId}/taster`);
              setTaster(r.taster);
              setTasting(null);
              setTasterId(String(r.taster.id));
            })} disabled={busy}>Load taster</Button>
          </div>
        </div>
      </div>
      {error ? <ErrorState title="Something went wrong" body={error} /> : null}
      {notice ? <p><Badge tone="teal">{notice}</Badge></p> : null}
      {tasting ? (
        <>
          <Card>
            <h2>{tasting.field.name} — taste it</h2>
            <p>{tasting.field.description}</p>
          </Card>
          <h2 style={{ margin: '28px 0 4px' }}>Simplest 5 concepts</h2>
          <div style={{ display: 'grid', gap: 12, marginBottom: 8 }}>
          {tasting.simplestConcepts.map((c, i) => (
            <Card key={c.slug}>
              <strong>{i + 1}. {c.name}</strong> <Badge tone="gray">{c.level}</Badge>
              {c.resource ? (
                <div style={{ marginTop: 6 }}><a href={c.resource.url} target="_blank" rel="noreferrer">{c.resource.title}</a></div>
              ) : null}
            </Card>
          ))}
          </div>
          <h2 style={{ margin: '28px 0 4px' }}>Starter projects (simplest first)</h2>
          <div style={{ display: 'grid', gap: 12, marginBottom: 8 }}>
          {tasting.starterProjects.map((p) => (
            <Card key={p.slug}>
              <strong>{p.ready ? '✅ ' : ''}{p.title}</strong> <Badge tone={p.ready ? 'teal' : 'gray'}>~{p.estHours}h</Badge>
              <p style={{ fontSize: '0.875rem' }}>{p.description}</p>
              <ProgressBar value={p.total ? (p.mastered / p.total) * 100 : 0} label={`${p.mastered}/${p.total} concepts mastered`} />
            </Card>
          ))}
          </div>
          <h2 style={{ margin: '28px 0 4px' }}>Guided tastings ({tasting.tastings.length})</h2>
          <div style={{ display: 'grid', gap: 12, marginBottom: 8 }}>
          {tasting.tastings.map((t) => (
            <Card key={t.id}>
              <strong>{t.title}</strong> <Badge tone="blue">~{t.estHours}h · {t.level}</Badge>
              <p style={{ fontSize: '0.875rem' }}>{t.description}</p>
              <div style={{ marginTop: 8 }}>
              <Button variant="secondary" onClick={() => {
                setTaster(t);
                setTasting(null);
                setTasterId(String(t.id));
              }}>Open for start/submit ↓</Button>
              </div>
            </Card>
          ))}
          </div>
        </>
      ) : null}
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
