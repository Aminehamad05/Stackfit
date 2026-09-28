import { useEffect, useRef, useState } from 'react';
import { fetchDashboard } from '../../features/dashboard/api';
import { getTastingList } from '../../features/tasting/list';
import { api } from '../../lib/api';
import { apiErrorMessage } from '../../lib/errors';
import { fetchPath, type PathNode } from '../../features/roadmap/api';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { EmptyState, ErrorState, LoadingSkeleton } from '../../components/ui/States';
import RoadmapPath from './RoadmapPath';
import NodeDrawer from './NodeDrawer';
import './roadmap-path.css';

const MINI_POSITIONS = 5;

interface Mini {
  fieldId: number;
  slug: string;
  name: string;
  compatibility: number;
  roadmapId: number;
  nodes: PathNode[];
  currentKey: string | null;
  complete: boolean;
  tasters: { reviewed: number; total: number };
}

interface TasteField {
  fieldId: number;
  slug: string;
  name: string;
  compatibility: number;
  roadmapId: number | null;
  tasters: { reviewed: number; total: number };
  complete: boolean;
}

function namespaced(roadmapId: number, nodes: PathNode[]): PathNode[] {
  return nodes.map((n) => ({ ...n, key: `${roadmapId}:${n.key}` }));
}

function firstCurrent(nodes: PathNode[]): string | null {
  return nodes.find((n) => n.state === 'current')?.key ?? null;
}

export default function Roadmap(): JSX.Element {
  const [phase, setPhase] = useState<'tasting' | 'committed' | null>(null);
  const [minis, setMinis] = useState<Mini[]>([]);
  const [committed, setCommitted] = useState<{ roadmapId: number | null; slug: string; name: string } | null>(null);
  const [nodes, setNodes] = useState<PathNode[]>([]);
  const [currentKey, setCurrentKey] = useState<string | null>(null);
  const [fieldName, setFieldName] = useState('');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [unlockedKeys, setUnlockedKeys] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prevStates = useRef(new Map<string, string>());

  function trackFlips(all: PathNode[]): void {
    const flipped = new Set<string>();
    for (const n of all) {
      const prev = prevStates.current.get(n.key);
      if (prev && prev !== n.state && (n.state === 'current' || n.state === 'completed')) flipped.add(n.key);
      prevStates.current.set(n.key, n.state);
    }
    setUnlockedKeys(flipped);
  }

  async function ensureRoadmap(fieldId: number, existing: number | null): Promise<number> {
    if (existing) return existing;
    const created = await api<{ roadmap: { id: number } }>('/roadmaps', { method: 'POST', body: { fieldId } });
    return created.roadmap.id;
  }

  async function load(): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const dash = await fetchDashboard();
      if (dash.phase === 'committed' && dash.committed) {
        setPhase('committed');
        let rid = dash.committed.roadmapId;
        if (rid === null) {
          const fields = await api<{ fields: Array<{ id: number; slug: string }> }>('/fields');
          const match = fields.fields.find((f) => f.slug === dash.committed?.field.slug);
          if (!match) throw new Error('Committed field not found');
          rid = await ensureRoadmap(match.id, null);
        }
        const payload = await fetchPath(String(rid));
        trackFlips(payload.nodes);
        setNodes(payload.nodes);
        setCurrentKey(payload.currentKey);
        setFieldName(payload.roadmap.field.name);
        setCommitted({ roadmapId: rid, slug: payload.roadmap.field.slug, name: payload.roadmap.field.name });
      } else {
        setPhase('tasting');
        // Minis follow the dashboard tasting list (explicit user picks).
        // Never curated → matched top-3. Explicitly emptied → empty state.
        const stored = getTastingList();
        if (stored !== null && stored.length === 0) {
          setMinis([]);
          setNodes([]);
          return;
        }
        const params = stored ? `?fields=${stored.join(',')}` : '';
        let tasting;
        try {
          tasting = await api<{ fields: TasteField[] }>(`/users/me/tasting${params}`);
        } catch {
          tasting = await api<{ fields: TasteField[] }>('/users/me/tasting');
        }
        const built: Mini[] = [];
        for (const f of tasting.fields) {
          const rid = await ensureRoadmap(f.fieldId, f.roadmapId);
          const payload = await fetchPath(String(rid));
          const slice = namespaced(rid, payload.nodes.filter((n) => n.position <= MINI_POSITIONS));
          trackFlips(slice);
          built.push({
            fieldId: f.fieldId,
            slug: f.slug,
            name: f.name,
            compatibility: f.compatibility,
            roadmapId: rid,
            nodes: slice,
            currentKey: firstCurrent(slice),
            complete: f.complete,
            tasters: f.tasters,
          });
        }
        setMinis(built);
        setNodes([]);
      }
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function choose(fieldId: number): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      await api('/users/me/field-choice', { method: 'POST', body: { fieldId } });
      prevStates.current.clear();
      await load();
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function refreshMini(roadmapId: number): Promise<void> {
    try {
      const payload = await fetchPath(String(roadmapId));
      const slice = namespaced(roadmapId, payload.nodes.filter((n) => n.position <= MINI_POSITIONS));
      trackFlips(slice);
      setMinis((ms) => ms.map((m) => (m.roadmapId === roadmapId ? { ...m, nodes: slice, currentKey: firstCurrent(slice) } : m)));
    } catch (e) {
      setError(apiErrorMessage(e));
    }
  }

  // Committed but empty shell (choice creates the row, steps come later):
  // build the steps for the committed field, then load the new roadmap.
  async function generateCommitted(): Promise<void> {
    if (!committed) return;
    setBusy(true);
    setError(null);
    try {
      const fields = await api<{ fields: Array<{ id: number; slug: string }> }>('/fields');
      const match = fields.fields.find((f) => f.slug === committed.slug);
      if (!match) throw new Error(`Unknown field "${committed.slug}"`);
      const created = await api<{ roadmap: { id: number } }>('/roadmaps', { method: 'POST', body: { fieldId: match.id } });
      localStorage.setItem('cp_roadmap_id', String(created.roadmap.id));
      setCommitted({ ...committed, roadmapId: created.roadmap.id });
      const payload = await fetchPath(String(created.roadmap.id));
      trackFlips(payload.nodes);
      setNodes(payload.nodes);
      setCurrentKey(payload.currentKey);
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const allNodes = phase === 'committed' ? nodes : minis.flatMap((m) => m.nodes);
  const selected = allNodes.find((n) => n.key === selectedKey) ?? null;
  const selectedMini = minis.find((m) => m.nodes.some((n) => n.key === selectedKey)) ?? null;

  return (
    <div className="container">
      <div className="page-head">
        <h1>{phase === 'committed' && committed ? `${committed.name} path` : 'Tasting paths'}</h1>
        <p>One path per field, no branches — gates block progress, badges don&apos;t.</p>
      </div>
      {loading ? <LoadingSkeleton lines={4} /> : null}
      {error ? <ErrorState title="Something went wrong" body={error} onRetry={() => void load()} /> : null}

      {!loading && !error && phase === 'tasting' ? (
        <>
          {minis.length === 0 ? (
            <EmptyState title="No taste fields yet" body="Pick fields on your dashboard tasting list, or compute your top-3 first." actionLabel="Go to dashboard" actionTo="/dashboard" />
          ) : null}
          {minis.map((m) => (
            <section key={m.slug} aria-label={m.name}>
              <h2>{m.name} <Badge tone={m.complete ? 'teal' : 'gray'}>{m.compatibility}% · tasters {m.tasters.reviewed}/{m.tasters.total}{m.complete ? ' · done' : ''}</Badge></h2>
              <div style={{ margin: '8px 0' }}>
                <Button variant="secondary" onClick={() => void choose(m.fieldId)} disabled={busy}>
                  Pick as final path →
                </Button>
              </div>
              <RoadmapPath
                nodes={m.nodes}
                currentKey={m.currentKey}
                unlockedKeys={unlockedKeys}
                selectedKey={selectedKey}
                onSelect={setSelectedKey}
              />
            </section>
          ))}
          {minis.length > 0 && minis.every((m) => m.complete) ? (
            <Card>
              <h2>All 3 tastings complete — pick your field</h2>
              <p>This is the final choice. Your full roadmap builds from here.</p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {minis.map((m) => (
                  <Button key={m.slug} variant="primary" onClick={() => void choose(m.fieldId)} disabled={busy}>
                    Commit to {m.name}
                  </Button>
                ))}
              </div>
            </Card>
          ) : null}
        </>
      ) : null}

      {!loading && !error && phase === 'committed' && nodes.length > 0 ? (
        <RoadmapPath
          nodes={nodes}
          currentKey={currentKey}
          unlockedKeys={unlockedKeys}
          selectedKey={selectedKey}
          onSelect={setSelectedKey}
        />
      ) : null}
      {!loading && !error && phase === 'committed' && nodes.length === 0 ? (
        <Card>
          <h2>Roadmap shell is empty</h2>
          <p>Choosing {committed?.name ?? 'your field'} created the roadmap — now build its steps:</p>
          <Button variant="primary" onClick={() => void generateCommitted()} disabled={busy}>Generate steps →</Button>
        </Card>
      ) : null}

      <NodeDrawer
        node={selected}
        onClose={() => setSelectedKey(null)}
        onUnlocked={() => {
          if (phase === 'committed') void load();
          else if (selectedMini) void refreshMini(selectedMini.roadmapId);
        }}
      />
    </div>
  );
}
