import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  currentAccount,
  loginClub,
  loginPerson,
  logout as logoutSessions,
  registerPerson,
} from './api';
import { getClubToken, getUserToken } from '../../lib/api';
import type { AccountType } from '../../lib/api';

interface AuthState {
  account: AccountType | null;
  userEmail: string | null;
  clubName: string | null;
  login: (account: AccountType, email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

function decodeEmail(token: string | null): string | null {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1] ?? '')) as { email?: string };
    return typeof payload.email === 'string' ? payload.email : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const [account, setAccount] = useState<AccountType | null>(() => currentAccount());
  const [userEmail, setUserEmail] = useState<string | null>(() => decodeEmail(getUserToken()));
  const [clubEmail, setClubEmail] = useState<string | null>(() => decodeEmail(getClubToken()));

  const login = useCallback(async (kind: AccountType, email: string, password: string) => {
    if (kind === 'person') {
      const session = await loginPerson({ email, password });
      setUserEmail(session.user.email);
      setAccount('person');
    } else {
      const session = await loginClub({ email, password });
      setClubEmail(session.club.email);
      setAccount('organisation');
    }
  }, []);

  const register = useCallback(async (email: string, password: string, displayName: string) => {
    // Only the person world supports self-registration (POST /api/auth/register).
    // Clubs are pre-seeded organisations (password `club2000`); org login only.
    const session = await registerPerson({
      email,
      password,
      displayName: displayName.trim() ? displayName.trim() : undefined,
    });
    setUserEmail(session.user.email);
    setAccount('person');
  }, []);

  const logout = useCallback(() => {
    logoutSessions();
    setAccount(null);
    setUserEmail(null);
    setClubEmail(null);
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      account,
      userEmail,
      clubName: clubEmail,
      login,
      register,
      logout,
    }),
    [account, userEmail, clubEmail, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
