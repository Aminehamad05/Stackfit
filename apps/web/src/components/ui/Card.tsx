import type { ReactNode } from 'react';

export function Card({
  children,
  hover = false,
  flat = false,
}: {
  children: ReactNode;
  hover?: boolean;
  flat?: boolean;
}): JSX.Element {
  return (
    <div className={['card', hover ? 'card-hover' : '', flat ? 'card-flat' : ''].join(' ').trim()}>
      {children}
    </div>
  );
}
