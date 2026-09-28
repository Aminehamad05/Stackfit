import { useEffect, useState } from 'react';
import { api, ApiError, getToken } from '../../lib/api';
import { apiErrorMessage } from '../../lib/errors';
import type { LeaderboardRow } from '../../lib/types';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { EmptyState, ErrorState, LoadingSkeleton } from '../../components/ui/States';

const MEDALS = ['🥇', '🥈', '🥉'];

/** Own user id from the JWT (for the "you" highlight) — no extra request. */
function myUserId(): number | null {
  try {
    const payload = JSON.parse(atob((getToken() ?? '').split('.')[1] ?? '')) as { sub?: number };
    return typeof payload.sub === 'number' ? payload.sub : null;
  } catch {
    return null;
  }
}

export default function Leaderboard(): JSX.Element {
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api<{ rows?: LeaderboardRow[]; leaderboard?: LeaderboardRow[] }>('/leaderboard')
      .then((r) => {
        if (!cancelled) setRows(r.rows ?? r.leaderboard ?? []);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        if (e instanceof ApiError && e.status === 401) setUnauthorized(true);
        else setError(apiErrorMessage(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const top3 = rows.slice(0, 3);
  const rest = rows.slice(3);
  const max = rows[0]?.total_points ?? 1;
  const me = myUserId();

  return (
    <div className="container">
      <div className="page-head">
        <h1>Leaderboard</h1>
        <p>Points from quizzes, tasters, interviews and projects. Climb the ranks by passing gates and completing projects.</p>
      </div>
      {loading ? <LoadingSkeleton /> : null}
      {!loading && unauthorized ? (
        <div style={{ margin: '16px 0 64px' }}>
          <EmptyState title="Sign in to see the ranks" body="The leaderboard is yours once you have an account — then every passed quiz moves you up." actionLabel="Sign in" actionTo="/login" />
        </div>
      ) : null}
      {error ? <ErrorState title="Something went wrong" body={error} /> : null}
      {!loading && !unauthorized && !error && rows.length > 0 ? (
        <>
          {top3.length >= 3 ? (
            <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(3, 1fr)', alignItems: 'end', marginBottom: 16 }}>
              {[top3[1], top3[0], top3[2]].map((r, podiumIdx) => {
                const rank = podiumIdx === 1 ? 1 : podiumIdx === 0 ? 2 : 3;
                const medal = MEDALS[rank - 1];
                const isFirst = rank === 1;
                const isMe = me !== null && r.id === me;
                const heightPct = Math.max(30, Math.round((r.total_points / max) * 100));
                return (
                  <Card
                    key={r.id}
                    style={{
                      padding: isFirst ? '20px 12px 16px' : '16px 12px 14px',
                      textAlign: 'center',
                      background: isFirst
                        ? 'linear-gradient(180deg, var(--brand-blue), var(--brand-blue-dark))'
                        : isMe ? 'var(--blue-soft)' : 'var(--surface)',
                      color: isFirst ? '#fff' : 'var(--text-primary)',
                      border: isFirst ? 'none' : isMe ? '2px solid var(--brand-blue)' : '1px solid var(--border)',
                      boxShadow: isFirst ? '0 12px 30px rgba(50,85,255,.35)' : 'none',
                    }}
                  >
                    <div style={{ fontSize: isFirst ? 44 : 32, lineHeight: 1 }}>{medal}</div>
                    <div style={{ fontWeight: 700, fontSize: isFirst ? '1.05rem' : '0.95rem', margin: '8px 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.display_name}
                    </div>
                    {isMe ? <div style={{ marginBottom: 4 }}><Badge tone="teal">you</Badge></div> : null}
                    <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>{r.total_points} pts</div>
                    <div style={{ marginTop: 10, height: isFirst ? 56 : 36, borderRadius: 6, background: isFirst ? 'rgba(255,255,255,.18)' : 'var(--blue-soft)', display: 'flex', alignItems: 'flex-end' }}>
                      <div style={{ width: '100%', height: `${heightPct}%`, minHeight: 6, borderRadius: 6, background: isFirst ? 'var(--gradient-brand)' : 'var(--brand-blue)' }} />
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : null}

          {rest.length > 0 ? (
            <div style={{ display: 'grid', gap: 8 }}>
              {rest.map((r, i) => {
                const rank = i + 4;
                const isMe = me !== null && r.id === me;
                const heightPct = Math.max(8, Math.round((r.total_points / max) * 100));
                return (
                  <Card key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: isMe ? 'var(--blue-soft)' : undefined, border: isMe ? '2px solid var(--brand-blue)' : undefined }}>
                    <span style={{ width: 28, textAlign: 'right', fontWeight: 700, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                      {rank}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.display_name} {isMe ? <Badge tone="teal">you</Badge> : null}
                      </div>
                      <div style={{ marginTop: 4, height: 6, borderRadius: 3, background: 'var(--surface-soft)' }}>
                        <div style={{ width: `${heightPct}%`, height: '100%', borderRadius: 3, background: 'var(--gradient-brand)' }} />
                      </div>
                    </div>
                    <span style={{ fontWeight: 700, color: 'var(--brand-blue)', minWidth: 60, textAlign: 'right' }}>
                      {r.total_points} pts
                    </span>
                  </Card>
                );
              })}
            </div>
          ) : null}
        </>
      ) : null}
      {!loading && !unauthorized && !error && rows.length === 0 ? (
        <Card><p>No points yet — be the first to climb the board.</p></Card>
      ) : null}
    </div>
  );
}
