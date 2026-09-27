import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { apiErrorMessage } from '../../lib/errors';
import type { RoadmapStep } from '../../lib/types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ErrorState, EmptyState, LoadingSkeleton } from '../../components/ui/States';
import { Field } from '../../components/ui/Field';
import { ROADMAP_ID_KEY } from '../Dashboard';
import { generateRoadmap } from '../../features/dashboard/api';

interface RoadmapMeta {
  id: number;
  field: { slug: string; name: string };
  includePaid: boolean;
}

function storedRoadmapId(): string | null {
  try {
    return localStorage.getItem(ROADMAP_ID_KEY);
  } catch {
    return null;
  }
}

function rememberRoadmapId(id: string): void {
  try {
    localStorage.setItem(ROADMAP_ID_KEY, id);
  } catch {
    /* storage unavailable — page still works for this visit */
  }
}

export default function Roadmap(): JSX.Element {
  const [params] = useSearchParams();
  const paramId = params.get('id');
  // Resolution order: explicit ?id= → id saved at field-choice time →
  // manual entry. Never a hardcoded id (id=1 usually belongs to someone else).
  const [id, setId] = useState(paramId ?? storedRoadmapId() ?? '');
  const [meta, setMeta] = useState<RoadmapMeta | null>(null);
  const [steps, setSteps] = useState<RoadmapStep[]>([]);
  const [busy, setBusy] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (roadmapId: string) => {
    const trimmed = roadmapId.trim();
    if (!trimmed) {
      setError(null);
      setSteps([]);
      setMeta(null);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ roadmap: RoadmapMeta; steps: RoadmapStep[] }>(`/roadmaps/${trimmed}`);
      setMeta(r.roadmap);
      setSteps(r.steps);
      // GET is owner-enforced server-side, so a successful load is always the
      // viewer's own roadmap — safe to remember for Dashboard's Continue action.
      rememberRoadmapId(String(r.roadmap.id));
    } catch (e) {
      setError(apiErrorMessage(e));
      setSteps([]);
      setMeta(null);
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    const initial = paramId ?? storedRoadmapId() ?? '';
    setId(initial);
    if (initial) void load(initial);
  }, [paramId, load]);

  // Field-choice creates a roadmap shell with zero steps; the ordered steps
  // come from POST /roadmaps (deterministic buildRoadmap). When the loaded
  // roadmap is empty, offer to generate into a fresh roadmap and switch to it
  // (the API keeps history — it never fills the shell in place).
  async function handleGenerateSteps(): Promise<void> {
    if (!meta) return;
    setGenerating(true);
    setError(null);
    try {
      const catalogue = await api<{ fields: Array<{ id: number; slug: string }> }>('/fields');
      const field = catalogue.fields.find((f) => f.slug === meta.field.slug);
      if (!field) throw new Error(`unknown field ${meta.field.slug}`);
      const created = await generateRoadmap(field.id);
      const newId = String(created.roadmap.id);
      setId(newId);
      await load(newId);
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="container">
      <div className="page-head">
        <h1>Roadmap{meta ? ` — ${meta.field.name}` : ''}</h1>
        <p>Your ordered concept steps — prerequisites always come first.</p>
      </div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'end' }}>
        <Field label="Roadmap id" name="roadmapId" value={id} onChange={(e) => setId(e.target.value)} />
        <Button variant="primary" onClick={() => void load(id)} disabled={busy}>Load</Button>
      </div>
      {busy && steps.length === 0 ? <div style={{ marginTop: 16 }}><LoadingSkeleton lines={4} /></div> : null}
      {error ? (
        <div style={{ marginTop: 16 }}>
          <ErrorState
            title="Couldn't load this roadmap"
            body={`${error} If you typed the id by hand, note roadmaps are private — an id from another account reads as not found.`}
            onRetry={() => void load(id)}
          />
        </div>
      ) : null}
      {!busy && !error && meta && steps.length === 0 ? (
        <div style={{ marginTop: 16 }}>
          <Card>
            <h3 style={{ marginTop: 0 }}>Roadmap — {meta.field.name}</h3>
            <p style={{ fontSize: '0.875rem' }}>
              Your choice was saved, but this roadmap has no steps yet — choosing a field only
              reserves the roadmap. Generate the ordered, prerequisite-sorted steps now.
            </p>
            <Button variant="primary" onClick={() => void handleGenerateSteps()} disabled={generating}>
              {generating ? 'Generating…' : 'Generate my steps →'}
            </Button>
          </Card>
        </div>
      ) : null}
      {!busy && !error && !meta && steps.length === 0 ? (
        <div style={{ marginTop: 16 }}>
          <EmptyState title="No roadmap loaded" body="Pick a field first — choosing saves a roadmap to your account and opens it here automatically." actionLabel="Choose a field" actionTo="/field-choice" />
        </div>
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
      <div style={{ height: 48 }} />
    </div>
  );
}
