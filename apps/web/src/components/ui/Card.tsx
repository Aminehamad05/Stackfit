import type { CSSProperties, ReactNode } from 'react';

export function Card({
  children,
  hover = false,
  flat = false,
  style,
}: {
  children: ReactNode;
  hover?: boolean;
  flat?: boolean;
  style?: CSSProperties;
}): JSX.Element {
  return (
    <div
      className={['card', hover ? 'card-hover' : '', flat ? 'card-flat' : ''].join(' ').trim()}
      style={style}
    >
      {children}
    </div>
  );
}
