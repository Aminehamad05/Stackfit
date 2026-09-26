import { useEffect, useState } from 'react';
import { api, getToken } from '../../lib/api';
import { apiErrorMessage } from '../../lib/errors';
import { useAuth } from '../../features/auth/auth-context';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ErrorState, LoadingSkeleton, ProgressBar } from '../../components/ui/States';

export const ROADMAP_ID_KEY = 'cp_roadmap_id';

interface NextAction {
  label: string;
  to: string;
}

interface Progress {
  picks: number;
  top: { slug: string; name: string; compatibility: number; chosen: boolean } | null;
  certs: number;
}

/** Single JWT-sub decode (mirrors features/auth decoding, no new dep). */
function myUserId(): number | null {
  try {
    const payload = JSON.parse(atob((getToken() ?? '').split('.')[1] ?? '')) as { sub?: number };
    return typeof payload.sub === 'number' ? payload.sub : null;
  } catch {
    return null;
  }
}

export default function Dashboard(): JSX.Element {
  const { userEmail } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [next, setNext] = useState<NextAction>({ label: 'Tell us your background', to: '/onboarding' });
  const [progress, setProgress] = useState<Progress>({ picks: 0, top: null, certs: 0 });
  const [points, setPoints] = useState<{ total: number; rank: number } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        // Chain the journey state top-down; first gap found becomes THE next action.
        const bg = await api<{ background: unknown[] }>('/users/me/background');
        if (bg.background.length === 0) {
          setNext({ label: 'Tell us your background', to: '/onboarding' });
          setProgress({ picks: 0, top: null, certs: 0 });
          return;
        }
        let top: Progress['top'] = null;
        try {
          const m = await api<{ matches: Array<{ slug: string; name: string; compatibility: number; chosen: boolean }> }>(
            '/users/me/field-matches',
          );
          top = m.matches[0] ?? null;
        } catch {
          setNext({ label: 'Compute my top fields', to: '/field-choice' });
          setProgress({ picks: bg.background.length, top: null, certs: 0 });
          return;
        }
        const roadmapId = localStorage.getItem(ROADMAP_ID_KEY);
        if (!roadmapId) {
          setNext({ label: `Choose ${top?.name ?? 'your field'}`, to: '/field-choice' });
        } else {
          setNext({ label: 'Continue your roadmap', to: `/roadmap?id=${roadmapId}` });
        }
        const [certs, board] = await Promise.all([
          api<{ earned: unknown[] }>('/users/me/certifications').catch(() => ({ earned: [] })),
          api<{ rows?: Array<{ id: number; total_points: number }>; leaderboard?: Array<{ id: number; total_points: number }> }>(
            '/leaderboard',
          ).catch(() => null),
        ]);
        setProgress({ picks: bg.background.length, top, certs: certs.earned.length });
        const rows = board?.rows ?? board?.leaderboard ?? [];
        const me = myUserId();
        const idx = me === null ? -1 : rows.findIndex((r) => r.id === me);
        setPoints(idx >= 0 ? { total: rows[idx].total_points, rank: idx + 1 } : null);
      } catch (e) {
        setError(apiErrorMessage(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const firstName = (userEmail ?? '').split('@')[0] || 'there';

  return (
    <div className="container">
      {loading ? (
        <LoadingSkeleton lines={4} />
      ) : error ? (
        <ErrorState title="Couldn't load your dashboard" body={error} onRetry={() => window.location.reload()} />
      ) : (
        <>
          {/* Block 1 — one-line greeting (the only heading on this view). */}
          <h1>Hey {firstName} 👋</h1>

          {/* Block 2 — current progress, compact. */}
          <Card>
            {progress.top ? (
              <>
                <div style={{ fontSize: '0.875rem' }}>Top match: <strong>{progress.top.name}</strong></div>
                <ProgressBar value={progress.top.compatibility} label={`${progress.top.compatibility}% compatible · ${progress.picks} background picks`} />
              </>
            ) : (
              <div style={{ fontSize: '0.875rem' }}>{progress.picks} background picks saved. Compute your matches to see progress.</div>
            )}
          </Card>

          {/* Block 3 — the single next action. */}
          <div style={{ margin: '16px 0' }}>
            <Button variant="primary" to={next.to} block>{next.label} →</Button>
          </div>

          {/* Block 4 — points (hidden until the ledger endpoint lands). */}
          {points ? (
            <Card>
              <Badge tone="teal">#{points.rank}</Badge> {points.total} pts
              {progress.certs > 0 ? <span style={{ marginLeft: 8 }}>🏅 {progress.certs} certification{progress.certs === 1 ? '' : 's'}</span> : null}
            </Card>
          ) : null}
        </>
      )}
    </div>
  );
}
