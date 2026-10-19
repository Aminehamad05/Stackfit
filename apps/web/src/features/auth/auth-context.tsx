import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  changePassword as changePasswordApi,
  currentAccount,
  deleteAccount as deleteAccountApi,
  fetchPerson,
  loginClub,
  loginPerson,
  logout as logoutSessions,
  registerPerson,
  updatePerson,
} from './api';
import { getClubToken, getUserToken } from '../../lib/api';
import type { AccountType } from '../../lib/api';

const NAME_KEY = 'stackfit_display_name';
const AVATAR_KEY = 'stackfit_avatar';

interface AuthState {
  account: AccountType | null;
  userEmail: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  clubName: string | null;
  login: (account: AccountType, email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  saveProfile: (input: { displayName?: string; avatarUrl?: string | null }) => Promise<void>;
  changePassword: (input: { currentPassword: string; newPassword: string }) => Promise<void>;
  deleteAccount: () => Promise<void>;
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

function readStored(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function readName(): string | null {
  return readStored(NAME_KEY);
}

function writeName(name: string | null): void {
  try {
    if (name) localStorage.setItem(NAME_KEY, name);
    else localStorage.removeItem(NAME_KEY);
  } catch {
    /* storage unavailable */
  }
}

function writeAvatar(url: string | null): void {
  try {
    if (url) localStorage.setItem(AVATAR_KEY, url);
    else localStorage.removeItem(AVATAR_KEY);
  } catch {
    /* storage unavailable (large dataURLs can exceed quota — header falls back to /me) */
  }
}

export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const [account, setAccount] = useState<AccountType | null>(() => currentAccount());
  const [userEmail, setUserEmail] = useState<string | null>(() => decodeEmail(getUserToken()));
  const [displayName, setDisplayName] = useState<string | null>(() => readName());
  const [avatarUrl, setAvatarUrl] = useState<string | null>(() => readStored(AVATAR_KEY));
  const [clubEmail, setClubEmail] = useState<string | null>(() => decodeEmail(getClubToken()));

  // Backfill the display name + avatar for sessions created before /auth/me
  // existed (JWT carries email only). Runs once per stored person session.
  const [backfilled, setBackfilled] = useState(false);
  useEffect(() => {
    if (account !== 'person' || backfilled) return;
    let cancelled = false;
    fetchPerson()
      .then((u) => {
        if (cancelled) return;
        setDisplayName(u.displayName);
        writeName(u.displayName);
        setAvatarUrl(u.avatarUrl);
        writeAvatar(u.avatarUrl);
        setBackfilled(true);
      })
      .catch(() => {
        /* offline or logged out elsewhere — keep email fallback */
      });
    return () => {
      cancelled = true;
    };
  }, [account, backfilled]);

  const login = useCallback(async (kind: AccountType, email: string, password: string) => {
    if (kind === 'person') {
      const session = await loginPerson({ email, password });
      setUserEmail(session.user.email);
      setDisplayName(session.user.displayName);
      writeName(session.user.displayName);
      setAvatarUrl(session.user.avatarUrl);
      writeAvatar(session.user.avatarUrl);
      setBackfilled(true);
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
      displayName: displayName.trim(),
    });
    setUserEmail(session.user.email);
    setDisplayName(session.user.displayName);
    writeName(session.user.displayName);
    setAvatarUrl(session.user.avatarUrl);
    writeAvatar(session.user.avatarUrl);
    setBackfilled(true);
    setAccount('person');
  }, []);

  const saveProfile = useCallback(async (input: { displayName?: string; avatarUrl?: string | null }) => {
    const user = await updatePerson(input);
    setDisplayName(user.displayName);
    writeName(user.displayName);
    setAvatarUrl(user.avatarUrl);
    writeAvatar(user.avatarUrl);
  }, []);

  const logout = useCallback(() => {
    logoutSessions();
    setAccount(null);
    setUserEmail(null);
    setDisplayName(null);
    writeName(null);
    setAvatarUrl(null);
    writeAvatar(null);
    setBackfilled(false);
    setClubEmail(null);
  }, []);

  const changePassword = useCallback(async (input: { currentPassword: string; newPassword: string }) => {
    await changePasswordApi(input);
  }, []);

  const deleteAccount = useCallback(async () => {
    await deleteAccountApi();
    logoutSessions();
    setAccount(null);
    setUserEmail(null);
    setDisplayName(null);
    writeName(null);
    setAvatarUrl(null);
    writeAvatar(null);
    setBackfilled(false);
    setClubEmail(null);
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      account,
      userEmail,
      displayName,
      avatarUrl,
      clubName: clubEmail,
      login,
      register,
      saveProfile,
      changePassword,
      deleteAccount,
      logout,
    }),
    [account, userEmail, displayName, avatarUrl, clubEmail, login, register, saveProfile, changePassword, deleteAccount, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
