import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { apiErrorMessage } from '../../lib/errors';
import type { LeaderboardRow } from '../../lib/types';
import { ErrorState, LoadingSkeleton } from '../../components/ui/States';

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

  return (
    <div className="container">
      <div className="page-head">
        <h1>Leaderboard</h1>
        <p>Points from quizzes, tasters, interviews and projects.</p>
      </div>
      {loading ? <LoadingSkeleton /> : null}
      {error ? <ErrorState title="Something went wrong" body={error} /> : null}
      <ol>
        {rows.map((r, i) => (
          <li key={r.id}><strong>{['🥇', '🥈', '🥉'][i] ?? ''} {r.display_name}</strong> — {r.total_points} pts</li>
        ))}
      </ol>
    </div>
  );
}
