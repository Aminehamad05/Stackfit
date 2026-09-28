import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../features/auth/auth-context';
import { api } from '../../lib/api';
import { apiErrorMessage } from '../../lib/errors';
import type { BackgroundItem, ProfileConcept, SavedBackground } from '../../lib/types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState, ErrorState, LoadingSkeleton, ProgressBar } from '../../components/ui/States';

interface Pick {
  confidence: number;
  interest: number;
  checked: boolean;
}

const KIND_LABEL: Record<string, string> = { uni_course: 'University courses', skill: 'Skills', experience: 'Experience' };

// ONBOARDING STEPS (ordered — append future steps here without restructuring).
//   1. 'catalogue' (this screen): uni courses + skills only. Zero fields for job
//      titles, years of experience, or employers — background_items covers it.
//   2. 'experience_ai' — DEFERRED (spec Step 2, backlog): an optional step where the
//      user pastes a free-text bio/CV excerpt; a backend LLM call parses it into
//      concepts and inserts user_known_concepts rows with source='experience_ai',
//      feeding the SAME rankFields matching as background items. No separate path.
//      (DB already allows the value: KnownSource includes 'experience_ai'.)
export const ONBOARDING_STEPS = ['catalogue'] as const;

export default function Onboarding(): JSX.Element {
  const { account } = useAuth();
  const [items, setItems] = useState<BackgroundItem[]>([]);
  const [picks, setPicks] = useState<Record<number, Pick>>({});
  const [savedCount, setSavedCount] = useState(0);
  const [profile, setProfile] = useState<{ known: ProfileConcept[]; liked: ProfileConcept[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const [cat, mine] = await Promise.all([
        api<{ items: BackgroundItem[] }>('/background-items'),
        api<{ background: SavedBackground[] }>('/users/me/background'),
      ]);
      setItems(cat.items);
      setSavedCount(mine.background.length);
      const init: Record<number, Pick> = {};
      for (const s of mine.background) init[s.itemId] = { confidence: s.confidence, interest: s.interest, checked: true };
      setPicks(init);
      if (mine.background.length > 0) {
        setProfile(await api<{ known: ProfileConcept[]; liked: ProfileConcept[] }>('/users/me/background/profile'));
      } else setProfile(null);
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (account === null) return; // signed-out users get the sign-in prompt below, no fetch.
    void load();
  }, [account]);

  const groups = useMemo(() => {
    const g = new Map<string, BackgroundItem[]>();
    for (const i of items) {
      const arr = g.get(i.kind) ?? [];
      arr.push(i);
      g.set(i.kind, arr);
    }
    return [...g.entries()];
  }, [items]);

  function toggle(id: number): void {
    setPicks((p) => ({
      ...p,
      [id]: p[id]?.checked ? { ...p[id], checked: false } : { confidence: 3, interest: 3, checked: true },
    }));
  }
  function set(id: number, k: 'confidence' | 'interest', v: number): void {
    setPicks((p) => ({ ...p, [id]: { ...(p[id] ?? { checked: false }), checked: true, [k]: v } }));
  }

  async function save(): Promise<void> {
    setSaving(true);
    setError(null);
    try {
      await api('/users/me/background', {
        method: 'POST',
        body: {
          items: Object.entries(picks)
            .filter(([, v]) => v.checked)
            .map(([id, v]) => ({ itemId: +id, confidence: v.confidence, interest: v.interest })),
        },
      });
      await load();
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="container">
      <div className="page-head">
        <h1>What have you done before?</h1>
        <p>Tick what applies and rate confidence + interest (1–5). Saved picks: {savedCount}</p>
      </div>
      {account === null ? (
        <EmptyState title="Sign in to start" body="The assessment needs an account so we can match fields to your background." actionLabel="Sign in" actionTo="/login" />
      ) : null}
      {account === null ? null : loading ? (
        <LoadingSkeleton lines={5} />
      ) : error && items.length === 0 ? (
        <ErrorState title="Couldn't load the catalogue" body={error} onRetry={() => void load()} />
      ) : (
        <>
          {error ? <ErrorState title="Something went wrong" body={error} onRetry={() => void load()} /> : null}
          {groups.map(([kind, list]) => (
            <section key={kind} aria-label={kind}>
              <h2>{KIND_LABEL[kind] ?? kind} <Badge tone="gray">{list.length}</Badge></h2>
              {list.map((item) => {
                const p = picks[item.id];
                return (
                  <Card key={item.id}>
                    <label style={{ display: 'flex', gap: 10, alignItems: 'center', cursor: 'pointer' }}>
                      <input type="checkbox" checked={!!p?.checked} onChange={() => toggle(item.id)} />
                      <strong>{item.name}</strong>
                    </label>
                    <p style={{ fontSize: '0.875rem', color: 'var(--muted, #555)', margin: '6px 0' }}>
                      {item.concepts.map((c) => `${c.name} (${c.strength}/5)`).join(' · ')}
                    </p>
                    {p?.checked ? (
                      <div style={{ display: 'flex', gap: 12 }}>
                        <label>Confidence
                          <select value={p.confidence} onChange={(e) => set(item.id, 'confidence', +e.target.value)}>
                            {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
                          </select>
                        </label>
                        <label>Interest
                          <select value={p.interest} onChange={(e) => set(item.id, 'interest', +e.target.value)}>
                            {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
                          </select>
                        </label>
                      </div>
                    ) : null}
                  </Card>
                );
              })}
            </section>
          ))}
          <div style={{ display: 'flex', gap: 10, margin: '16px 0' }}>
            <Button variant="primary" onClick={() => void save()} disabled={saving}>
              {saving ? 'Saving…' : 'Save my background'}
            </Button>
            <Button variant="secondary" to="/field-choice">See my top fields →</Button>
          </div>
          {profile ? (
            <Card>
              <h2>What we inferred <Badge tone="teal">evaluate & adjust above if wrong</Badge></h2>
              <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
                {(['known', 'liked'] as const).map((k) => (
                  <div key={k}>
                    <h3 style={{ textTransform: 'capitalize' }}>{k}</h3>
                    {profile[k].slice(0, 8).map((c) => (
                      <div key={c.conceptId} style={{ marginBottom: 8 }}>
                        <div style={{ fontSize: '0.875rem' }}>{c.name}</div>
                        <ProgressBar value={c.score * 100} label={`${Math.round(c.score * 100)}%`} />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </Card>
          ) : (
            <EmptyState title="No picks yet" body="Save at least one course, skill, or experience to see your inferred knowledge." actionLabel="Back to top" actionTo="/onboarding" />
          )}
          <p><Link to="/field-choice">Continue to field matching →</Link></p>
        </>
      )}
    </div>
  );
}
