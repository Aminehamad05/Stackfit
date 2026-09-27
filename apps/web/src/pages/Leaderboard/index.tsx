import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { apiErrorMessage } from '../../lib/errors';
import type { LeaderboardRow } from '../../lib/types';
import { ErrorState, LoadingSkeleton } from '../../components/ui/States';
import { Card } from '../../components/ui/Card';

const MEDALS = ['🥇', '🥈', '🥉'] as const;

export default function Leaderboard(): JSX.Element {
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ rows?: LeaderboardRow[]; leaderboard?: LeaderboardRow[] }>('/leaderboard')
      .then((r) => setRows(r.rows ?? r.leaderboard ?? []))
      .catch((e: unknown) => setError(apiErrorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  const top3 = rows.slice(0, 3);
  const rest = rows.slice(3);
  const max = rows[0]?.total_points ?? 1;

  return (
    <div className="container">
      <div className="page-head">
        <h1>Leaderboard</h1>
        <p>Points from quizzes, tasters, interviews and projects. Climb the ranks by passing gates and completing projects.</p>
      </div>
      {loading ? <LoadingSkeleton /> : null}
      {error ? <ErrorState title="Something went wrong" body={error} /> : null}

      {!loading && !error && rows.length > 0 ? (
        <>
          {top3.length >= 3 ? (
            <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(3, 1fr)', alignItems: 'end', marginBottom: 16 }}>
              {[top3[1], top3[0], top3[2]].map((r, podiumIdx) => {
                const rank = podiumIdx === 1 ? 1 : podiumIdx === 0 ? 2 : 3;
                const medal = MEDALS[rank - 1];
                const isFirst = rank === 1;
                const heightPct = Math.max(30, Math.round((r.total_points / max) * 100));
                return (
                  <Card
                    key={r.id}
                    style={{
                      padding: isFirst ? '20px 12px 16px' : '16px 12px 14px',
                      textAlign: 'center',
                      background: isFirst
                        ? 'linear-gradient(180deg, var(--brand-blue), var(--brand-blue-dark))'
                        : 'var(--surface)',
                      color: isFirst ? '#fff' : 'var(--text-primary)',
                      border: isFirst ? 'none' : '1px solid var(--border)',
                      boxShadow: isFirst ? '0 12px 30px rgba(50,85,255,.35)' : 'none',
                    }}
                  >
                    <div style={{ fontSize: isFirst ? 44 : 32, lineHeight: 1 }}>{medal}</div>
                    <div style={{ fontWeight: 700, fontSize: isFirst ? '1.05rem' : '0.95rem', margin: '8px 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.display_name}
                    </div>
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
                const heightPct = Math.max(8, Math.round((r.total_points / max) * 100));
                return (
                  <Card key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px' }}>
                    <span style={{ width: 28, textAlign: 'right', fontWeight: 700, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                      {rank}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.display_name}
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
      {!loading && !error && rows.length === 0 ? (
        <Card><p>No points yet — be the first to climb the board.</p></Card>
      ) : null}
    </div>
  );
}
