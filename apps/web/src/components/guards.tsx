import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../features/auth/auth-context';

/** Organisation-only route (Step 3: fully separate org experience). */
export function RequireOrg({ children }: { children: ReactNode }): JSX.Element {
  const { account } = useAuth();
  if (account !== 'organisation') return <Navigate to="/login" replace />;
  return <>{children}</>;
}

/** Student-only route. */
export function RequirePerson({ children }: { children: ReactNode }): JSX.Element {
  const { account } = useAuth();
  if (account !== 'person') return <Navigate to="/login" replace />;
  return <>{children}</>;
}
