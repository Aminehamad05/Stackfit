import { api, getClubToken, getUserToken, setClubToken, setUserToken, clearTokens } from '../../lib/api';
import type { AccountType } from '../../lib/api';

export interface PersonSession {
  token: string;
  user: { id: number; email: string; displayName: string; avatarUrl: string | null };
}

export interface PersonProfile {
  id: number;
  email: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface ClubSession {
  token: string;
  club: { id: number; name: string; email: string };
}

export async function registerPerson(input: {
  email: string;
  password: string;
  displayName: string;
}): Promise<PersonSession> {
  // POST /api/auth/register — student/user world (README "Auth: two worlds").
  const session = await api<PersonSession>('/auth/register', { method: 'POST', body: input });
  setUserToken(session.token);
  return session;
}

export async function loginPerson(input: { email: string; password: string }): Promise<PersonSession> {
  // POST /api/auth/login — student/user world.
  const session = await api<PersonSession>('/auth/login', { method: 'POST', body: input });
  setUserToken(session.token);
  return session;
}

export async function fetchPerson(): Promise<PersonProfile> {
  // GET /api/auth/me — display name + avatar for greetings (JWT carries email only).
  const r = await api<{ user: PersonProfile }>('/auth/me', { account: 'person' });
  return r.user;
}

export async function updatePerson(input: { displayName?: string; avatarUrl?: string | null }): Promise<PersonProfile> {
  // PATCH /api/auth/me — manage your own profile (name + photo).
  const r = await api<{ user: PersonProfile }>('/auth/me', { method: 'PATCH', body: input, account: 'person' });
  return r.user;
}

export async function changePassword(input: { currentPassword: string; newPassword: string }): Promise<void> {
  // POST /api/auth/password — change your own password (current required).
  await api<{ changed: boolean }>('/auth/password', { method: 'POST', body: input, account: 'person' });
}

export async function deleteAccount(): Promise<void> {
  // DELETE /api/auth/me — delete your account and all associated data.
  await api<unknown>('/auth/me', { method: 'DELETE', account: 'person' });
  clearTokens();
}
export async function loginClub(input: { email: string; password: string }): Promise<ClubSession> {
  // POST /api/clubs/login — organisation (uni club) world, club JWT (requireClub).
  const session = await api<ClubSession>('/clubs/login', { method: 'POST', body: input });
  setClubToken(session.token);
  return session;
}

export async function registerClub(input: {
  name: string;
  email: string;
  password: string;
}): Promise<ClubSession> {
  // POST /api/clubs/register — organisation signup ("I represent a club").
  // Trust/verification is phase-2; anyone can claim a name for the demo.
  const session = await api<ClubSession>('/clubs/register', { method: 'POST', body: input });
  setClubToken(session.token);
  return session;
}

export function logout(account?: AccountType): void {
  if (account === 'person') setUserToken(null);
  else if (account === 'organisation') setClubToken(null);
  else clearTokens();
}

export function currentAccount(): AccountType | null {
  if (getUserToken()) return 'person';
  if (getClubToken()) return 'organisation';
  return null;
}

export function friendlyAuthError(code: string | undefined, status: number): string {
  if (status === 0 || code === 'network_error') return 'Could not reach the server. Check that the API is running and try again.';
  if (code === 'invalid_credentials' || status === 401) return 'Invalid email or password. Please try again.';
  if (code === 'validation_error' || status === 400) return 'Please check the highlighted fields and try again.';
  if (status === 409) return 'An account with this email already exists. Try signing in instead.';
  return 'Something went wrong. Your progress is safe — please try again.';
}
