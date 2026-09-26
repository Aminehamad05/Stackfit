import type { ReactNode } from 'react';

type Tone = 'blue' | 'purple' | 'teal' | 'gray' | 'danger';

export function Badge({ tone = 'gray', children }: { tone?: Tone; children: ReactNode }): JSX.Element {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
