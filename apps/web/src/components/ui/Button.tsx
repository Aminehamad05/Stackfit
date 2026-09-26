import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';

type Variant = 'primary' | 'secondary' | 'accent' | 'teal' | 'ghost';

interface BaseProps {
  variant?: Variant;
  block?: boolean;
  children: ReactNode;
}

type ButtonProps = BaseProps &
  ButtonHTMLAttributes<HTMLButtonElement> & { to?: undefined };

type LinkButtonProps = BaseProps & { to: string; onClick?: never; disabled?: never };

export function Button(props: ButtonProps | LinkButtonProps): JSX.Element {
  const { variant = 'primary', block = false, children } = props;
  const className = ['btn', `btn-${variant}`, block ? 'btn-block' : '']
    .filter(Boolean)
    .join(' ');
  if ('to' in props && props.to) {
    return (
      <Link to={props.to} className={className}>
        {children}
      </Link>
    );
  }
  const { variant: _v, block: _b, ...rest } = props as ButtonProps;
  return (
    <button type="button" {...rest} className={`${className} ${(rest as { className?: string }).className ?? ''}`.trim()}>
      {children}
    </button>
  );
}
