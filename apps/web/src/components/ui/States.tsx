import { Link } from 'react-router-dom';

export function EmptyState({
  title,
  body,
  actionLabel,
  actionTo,
}: {
  title: string;
  body: string;
  actionLabel: string;
  actionTo: string;
}): JSX.Element {
  return (
    <div className="empty-state">
      <h3>{title}</h3>
      <p>{body}</p>
      <Link className="btn btn-primary" to={actionTo}>
        {actionLabel}
      </Link>
    </div>
  );
}

export function ErrorState({ title, body, onRetry }: { title: string; body: string; onRetry?: () => void }): JSX.Element {
  return (
    <div className="error-state" role="alert">
      <h3>{title}</h3>
      <p>{body}</p>
      {onRetry ? (
        <button type="button" className="btn btn-secondary" onClick={onRetry}>
          Try again
        </button>
      ) : null}
    </div>
  );
}

export function LoadingSkeleton({ lines = 3 }: { lines?: number }): JSX.Element {
  return (
    <div aria-busy="true" aria-label="Loading" style={{ display: 'grid', gap: 10 }}>
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className="skeleton" style={{ height: i === 0 ? 22 : 14, width: `${92 - i * 12}%` }} />
      ))}
    </div>
  );
}

export function ProgressBar({ value, label }: { value: number; label?: string }): JSX.Element {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div>
      <div className="progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label ?? 'Progress'}>
        <div style={{ width: `${pct}%` }} />
      </div>
      {label ? <p style={{ fontSize: '0.875rem', marginTop: 6 }}>{label}</p> : null}
    </div>
  );
}
