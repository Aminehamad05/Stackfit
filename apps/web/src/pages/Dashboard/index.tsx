import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiErrorMessage } from '../../lib/errors';
import { useAuth } from '../../features/auth/auth-context';
import { useJourney } from '../../features/journey/journey-context';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState, ErrorState, LoadingSkeleton, ProgressBar } from '../../components/ui/States';
import {
  fetchBackground,
  fetchCertifications,
  fetchFieldFit,
  fetchProjectSuggestions,
  generateRoadmap,
  type Certifications,
  type ProjectSuggestions,
} from '../../features/dashboard/api';
import type { FieldMatch, FitEntry } from '../../lib/types';

export const ROADMAP_ID_KEY = 'cp_roadmap_id';

type Phase = 'signed-out' | 'organisation' | 'loading' | 'onboarding' | 'uncomputed' | 'ready' | 'error';

interface DashboardData {
  picks: number;
  matches: FieldMatch[];
  fitByField: Map<number, FitEntry>;
  certs: Certifications;
  suggestions: ProjectSuggestions;
}

const pct01 = (x: number): number => Math.round(Math.max(0, Math.min(1, x)) * 100);

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function firstNameOf(email: string | null): string {
  const name = (email ?? '').split('@')[0].replace(/[._-]+/g, ' ').trim();
  return name ? name.charAt(0).toUpperCase() + name.slice(1) : 'there';
}

/** One KPI block per taste-phase candidate field (matching.fitScore rules). */
function TasteFieldCard({ match, fit }: { match: FieldMatch; fit: FitEntry | undefined }): JSX.Element {
  const tried = fit?.complete === true && fit.fit !== null;
  return (
    <Card>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <h3 style={{ margin: 0 }}>{match.name}</h3>
        {tried ? <Badge tone="teal">Tried</Badge> : <Badge tone="gray">Not tried yet</Badge>}
      </div>
      <div style={{ marginTop: 12 }}>
        <ProgressBar value={match.compatibility} label={`${match.compatibility}% compatibility (0.6 skill background + 0.4 interest)`} />
      </div>
      {tried && fit ? (
        <>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 12 }}>
            <span style={{ fontSize: '1.75rem', fontWeight: 800 }}>{pct01(fit.fit ?? 0)}%</span>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>fit score</span>
          </div>
          <div className="part-row"><span>Skill</span><ProgressBar value={pct01(fit.parts.skill)} /><span>{pct01(fit.parts.skill)}%</span></div>
          {fit.parts.enjoyment !== undefined ? (
            <div className="part-row"><span>Enjoyment</span><ProgressBar value={pct01(fit.parts.enjoyment)} /><span>{pct01(fit.parts.enjoyment)}%</span></div>
          ) : null}
          {fit.parts.performance !== undefined ? (
            <div className="part-row"><span>Performance</span><ProgressBar value={pct01(fit.parts.performance)} /><span>{pct01(fit.parts.performance)}%</span></div>
          ) : null}
        </>
      ) : (
        <p style={{ fontSize: '0.875rem', marginTop: 12 }}>
          Complete a taster to unlock a fit score. Untried fields are never ranked against tried ones.
        </p>
      )}
    </Card>
  );
}

export default function Dashboard(): JSX.Element {
  const { account, userEmail } = useAuth();
  // Taste-phase + matches come from the shared journey context (single source
  // of truth with the header) — never refetched here.
  const journey = useJourney();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('loading');
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (account === null) {
      setPhase('signed-out');
      return;
    }
    if (account === 'organisation') {
      setPhase('organisation');
      return;
    }
    setPhase('loading');
    setError(null);
    try {
      const background = await fetchBackground();
      if (background.length === 0) {
        setPhase('onboarding');
        setData({ picks: 0, matches: [], fitByField: new Map(), certs: { earned: [], inProgress: [] }, suggestions: { suggestions: [], thresholds: { projectMinScore: 0.6 } } });
        return;
      }
      const matches = journey.matches;
      if (!matches) {
        setPhase('uncomputed');
        setData({ picks: background.length, matches: [], fitByField: new Map(), certs: { earned: [], inProgress: [] }, suggestions: { suggestions: [], thresholds: { projectMinScore: 0.6 } } });
        return;
      }
      const [fit, certs, suggestions] = await Promise.all([
        fetchFieldFit(),
        fetchCertifications(),
        fetchProjectSuggestions(),
      ]);
      setData({
        picks: background.length,
        matches,
        fitByField: new Map((fit ?? []).map((f) => [f.fieldId, f])),
        certs,
        suggestions,
      });
      setPhase('ready');
    } catch (e) {
      setError(apiErrorMessage(e));
      setPhase('error');
    }
  }, [account, journey.loaded, journey.matches]);

  useEffect(() => {
    if (!journey.loaded) return;
    void load();
  }, [load, journey.loaded]);

  async function handleGenerateRoadmap(fieldId: number): Promise<void> {
    setGenerating(true);
    setGenerateError(null);
    try {
      const created = await generateRoadmap(fieldId);
      try {
        localStorage.setItem(ROADMAP_ID_KEY, String(created.roadmap.id));
      } catch {
        /* storage unavailable — navigation still works without it */
      }
      navigate(`/roadmap?id=${created.roadmap.id}`);
    } catch (e) {
      setGenerateError(apiErrorMessage(e));
    } finally {
      setGenerating(false);
    }
  }

  if (phase === 'loading') {
    return (
      <div className="container">
        <div className="page-head"><h1>Dashboard</h1></div>
        <LoadingSkeleton lines={5} />
      </div>
    );
  }

  if (phase === 'signed-out') {
    return (
      <div className="container">
        <div className="page-head"><h1>Dashboard</h1><p>Your progress lives here once you sign in.</p></div>
        <div style={{ margin: '16px 0 64px' }}>
          <EmptyState title="Sign in to see your progress" body="Field matches, taster fit scores, certifications, and project readiness appear here." actionLabel="Sign in" actionTo="/login" />
        </div>
      </div>
    );
  }

  if (phase === 'organisation') {
    return (
      <div className="container">
        <div className="page-head"><h1>Dashboard</h1><p>This dashboard tracks student progress.</p></div>
        <div style={{ margin: '16px 0 64px' }}>
          <EmptyState title="Club account" body="You are signed in as an organisation. Student progress KPIs need a person account; your club tools live in the Org section." actionLabel="Go to Org" actionTo="/org" />
        </div>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="container">
        <div className="page-head"><h1>Dashboard</h1></div>
        <div style={{ margin: '16px 0 64px' }}>
          <ErrorState title="We couldn't load your dashboard" body={error ?? 'Your progress is safe. Try again.'} onRetry={() => void load()} />
        </div>
      </div>
    );
  }

  const name = firstNameOf(userEmail);

  if (phase === 'onboarding' || !data) {
    return (
      <div className="container">
        <div className="page-head"><h1>{greeting()}, {name}</h1><p>Your roadmap is waiting.</p></div>
        <div style={{ margin: '16px 0 64px' }}>
          <EmptyState title="Tell us your background first" body="Pick your courses, skills, and experience so we can score fields against them (0.6 skill + 0.4 interest)." actionLabel="Take the assessment" actionTo="/assessment" />
        </div>
      </div>
    );
  }

  if (phase === 'uncomputed') {
    return (
      <div className="container">
        <div className="page-head"><h1>{greeting()}, {name}</h1><p>{data.picks} background picks saved.</p></div>
        <div style={{ margin: '16px 0 64px' }}>
          <EmptyState title="Compute your top fields" body="We score every field from your background and keep the top 3 with a compatibility percentage (best = 100%)." actionLabel="Compute my top fields" actionTo="/field-choice" />
        </div>
      </div>
    );
  }

  // Phase + chosen field come from the shared journey context (same source of
  // truth as the header) — the locally fetched matches only feed the KPI data.
  const { tastePhase, chosen } = journey;
  const triedCount = data.matches.filter((m) => data.fitByField.get(m.fieldId)?.complete === true).length;
  const storedRoadmapId = (() => {
    try {
      return localStorage.getItem(ROADMAP_ID_KEY);
    } catch {
      return null;
    }
  })();

  const next = !chosen
    ? triedCount < data.matches.length
      ? { label: 'Try a taster', to: '/taster' }
      : { label: 'Compare fit scores & choose', to: '/field-choice' }
    : storedRoadmapId
      ? { label: 'Continue your roadmap', to: `/roadmap?id=${storedRoadmapId}` }
      : { label: 'Generate your roadmap', to: '' };

  const chosenFit = chosen ? data.fitByField.get(chosen.fieldId) : undefined;
  const fieldCerts = chosen ? data.certs.inProgress.filter((c) => c.field === chosen.slug) : [];
  // NOTE: earned certifications carry no field on the server response
  // (slug/title/awardedAt only), so per-field earned filtering is impossible
  // without guessing — the card lists every earned certification instead.
  const fieldSuggestions = chosen ? data.suggestions.suggestions.filter((s) => s.field === chosen.slug) : [];
  const readyCount = fieldSuggestions.filter((s) => s.ready).length;
  const showGenerate = !tastePhase && chosen !== null && storedRoadmapId === null;

  return (
    <div className="container">
      <div className="page-head">
        <h1>{greeting()}, {name}</h1>
        <p>
          {tastePhase
            ? `Taste phase — ${triedCount} of ${data.matches.length} fields tried.`
            : `Your current path — ${chosen?.name ?? 'your field'}.`}
        </p>
      </div>

      <div style={{ margin: '16px 0 24px' }}>
        {next.to !== '' ? (
          <Button variant="primary" to={next.to}>{next.label} →</Button>
        ) : showGenerate && chosen ? (
          <button type="button" className="btn btn-primary" disabled={generating} onClick={() => void handleGenerateRoadmap(chosen.fieldId)}>
            {generating ? 'Generating…' : `${next.label} →`}
          </button>
        ) : null}
        {generateError ? <p className="field-error" role="alert" style={{ marginTop: 8 }}>{generateError}</p> : null}
      </div>

      {tastePhase ? (
        <section aria-label="Taste phase progress">
          <h2 className="section-title">Your taste fields</h2>
          <p>One KPI block per candidate field. Fit = 0.2 × skill + 0.5 × enjoyment + 0.3 × taster performance.</p>
          <div className="taste-grid">
            {data.matches.map((m) => (
              <TasteFieldCard key={m.fieldId} match={m} fit={data.fitByField.get(m.fieldId)} />
            ))}
          </div>
        </section>
      ) : (
        chosen && (
          <>
            <section aria-label="Field progress">
              <h2 className="section-title">Field progress — {chosen.name}</h2>
              <div className="kpi-grid">
                <div className="kpi">
                  <div className="kpi-value">{chosen.compatibility}%</div>
                  <div className="kpi-label">Compatibility</div>
                </div>
                <div className="kpi">
                  <div className="kpi-value">{chosenFit?.fit == null ? '—' : `${pct01(chosenFit.fit)}%`}</div>
                  <div className="kpi-label">Fit score</div>
                </div>
                <div className="kpi">
                  <div className="kpi-value">{data.certs.earned.length}</div>
                  <div className="kpi-label">Certifications earned</div>
                </div>
                <div className="kpi">
                  <div className="kpi-value">{readyCount}/{fieldSuggestions.length}</div>
                  <div className="kpi-label">Projects ready</div>
                </div>
              </div>
              <Card>
                <h3 style={{ marginTop: 0 }}>Certifications</h3>
                {data.certs.earned.length === 0 && fieldCerts.length === 0 ? (
                  <p style={{ fontSize: '0.875rem' }}>No certifications yet. Pass quizzes to master concepts — a concept counts as mastered at quiz ≥ 0.7, a passed roadmap step, or a proven concept.</p>
                ) : (
                  <>
                    {data.certs.earned.map((e) => (
                      <div key={e.slug} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                        <Badge tone="teal">Earned</Badge>
                        <span>{e.title}</span>
                      </div>
                    ))}
                    {fieldCerts.map((c) => (
                      <div key={c.slug} style={{ marginBottom: 12 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                          <Badge tone={c.eligible ? 'teal' : 'blue'}>{c.eligible ? 'Eligible' : 'In progress'}</Badge>
                          <strong>{c.title}</strong>
                        </div>
                        {c.missingConcepts.length > 0 ? (
                          <p style={{ fontSize: '0.875rem', margin: '4px 0 0' }}>Missing: {c.missingConcepts.join(', ')}</p>
                        ) : null}
                        {c.needsTaster ? <p style={{ fontSize: '0.875rem', margin: '4px 0 0' }}>Needs a reviewed taster in this field.</p> : null}
                        {c.needsInterviews > 0 ? <p style={{ fontSize: '0.875rem', margin: '4px 0 0' }}>Needs {c.needsInterviews} more passed interview(s).</p> : null}
                      </div>
                    ))}
                  </>
                )}
              </Card>
              <div style={{ marginTop: 16 }}>
                <Card>
                  <h3 style={{ marginTop: 0 }}>Project readiness</h3>
                  <p className="rule-note" style={{ marginTop: 0 }}>
                    Ready = every required concept mastered (quiz ≥ {data.suggestions.thresholds.projectMinScore}, roadmap pass, or proven concept).
                  </p>
                  {fieldSuggestions.length === 0 ? (
                    <p style={{ fontSize: '0.875rem' }}>No project suggestions for this field yet.</p>
                  ) : (
                    fieldSuggestions.map((s) => (
                      <div key={s.slug} style={{ marginBottom: 12 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                          <Badge tone={s.ready ? 'teal' : 'gray'}>{s.ready ? 'Ready' : 'Not yet'}</Badge>
                          <strong>{s.title}</strong>
                        </div>
                        <ProgressBar value={s.total ? Math.round((s.mastered / s.total) * 100) : 0} label={`${s.mastered}/${s.total} concepts mastered${s.missing.length > 0 ? ` — missing: ${s.missing.join(', ')}` : ''}`} />
                      </div>
                    ))
                  )}
                </Card>
              </div>
            </section>

            <section aria-label="Roadmap" style={{ marginBottom: 64 }}>
              <h2 className="section-title">Roadmap</h2>
              <Card>
                {storedRoadmapId ? (
                  <p style={{ fontSize: '0.875rem' }}>
                    Your roadmap is saved on this device. <Link to={`/roadmap?id=${storedRoadmapId}`}>Continue your roadmap →</Link>
                  </p>
                ) : (
                  <p style={{ fontSize: '0.875rem' }}>Generate your roadmap to get an ordered, prerequisite-sorted plan for {chosen.name}.</p>
                )}
                <p className="rule-note">
                  Flag: step-by-step progress % isn&apos;t shown here because the API has no &ldquo;my
                  roadmaps&rdquo; endpoint (only GET /roadmaps/:id by id) — the page can&apos;t resolve
                  your latest roadmap id from the server, so it uses the id saved on this device.
                </p>
              </Card>
            </section>
          </>
        )
      )}
    </div>
  );
}
