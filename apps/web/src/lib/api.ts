// Thin typed fetch client to apps/api — all reads hit live_* views server-side (approved only).
// Two auth worlds (README "Auth: two worlds"): user JWT vs club JWT are stored separately.
//
// Base URL resolution (docker-first):
// - `VITE_API_URL=/api` (default in apps/web/Dockerfile + compose build arg) → same-origin.
//   In compose, nginx proxies /api/* → api:4000, so `docker compose up --build` just works
//   on any host with zero CORS issues. Local `vite dev` also proxies /api → localhost:4000.
// - Set an absolute URL (e.g. http://localhost:4000/api) only to point the web build
//   at a remote API outside compose.
const RAW_BASE: string = (import.meta.env.VITE_API_URL as string | undefined) ?? '';
const BASE: string = (RAW_BASE.trim() !== '' ? RAW_BASE : '/api').replace(/\/+$/, '');

const USER_KEY = 'stackfit_user_token';
const CLUB_KEY = 'stackfit_club_token';

export type AccountType = 'person' | 'organisation';

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function getUserToken(): string | null {
  return read(USER_KEY);
}

export function getClubToken(): string | null {
  return read(CLUB_KEY);
}

/** Legacy single-token helper kept for older pages: user token wins, club fallback. */
export function getToken(): string | null {
  return getUserToken() ?? getClubToken() ?? read('cp_token');
}

export function setUserToken(t: string | null): void {
  if (t) localStorage.setItem(USER_KEY, t);
  else localStorage.removeItem(USER_KEY);
}

export function setClubToken(t: string | null): void {
  if (t) localStorage.setItem(CLUB_KEY, t);
  else localStorage.removeItem(CLUB_KEY);
}

/** Back-compat for the previous single-token client. */
export function setToken(t: string | null): void {
  setUserToken(t);
  if (!t) setClubToken(null);
}

export function clearTokens(): void {
  setUserToken(null);
  setClubToken(null);
  try {
    localStorage.removeItem('cp_token');
  } catch {
    /* ignore */
  }
}

export interface ApiOptions {
  method?: string;
  body?: unknown;
  /** Explicit token overrides automatic selection. */
  token?: string | null;
  /** Which stored token to attach (default: user, fallback club). */
  account?: AccountType;
}

export class ApiError extends Error {
  readonly status: number;
  readonly path: string;
  readonly code?: string;
  constructor(status: number, path: string, code?: string) {
    super(`API ${status} ${path}${code ? ` (${code})` : ''}`);
    this.name = 'ApiError';
    this.status = status;
    this.path = path;
    this.code = code;
  }
}

function tokenFor(account?: AccountType): string | null {
  if (account === 'person') return getUserToken();
  if (account === 'organisation') return getClubToken();
  return getToken();
}

export async function api<T = unknown>(path: string, options: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, token, account } = options;
  const auth = token !== undefined ? token : tokenFor(account);
  let detail: string | undefined;
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(auth ? { Authorization: `Bearer ${auth}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, path, 'network_error');
  }
  if (!res.ok) {
    try {
      const data = (await res.json()) as { error?: string };
      detail = typeof data.error === 'string' ? data.error : undefined;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(res.status, path, detail);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
