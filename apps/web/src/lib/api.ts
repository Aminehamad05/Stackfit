// Thin typed fetch client to apps/api — all reads hit live_* views server-side (approved only).
const BASE: string = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api';

let token: string | null = localStorage.getItem('cp_token');

export function setToken(t: string | null): void {
  token = t;
  if (t) localStorage.setItem('cp_token', t);
  else localStorage.removeItem('cp_token');
}

export function getToken(): string | null {
  return token;
}

export interface ApiOptions {
  method?: string;
  body?: unknown;
}

export class ApiError extends Error {
  readonly status: number;
  readonly path: string;
  constructor(status: number, path: string) {
    super(`API ${status} ${path}`);
    this.name = 'ApiError';
    this.status = status;
    this.path = path;
  }
}

export async function api<T = unknown>(path: string, options: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body } = options;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new ApiError(res.status, path);
  return (await res.json()) as T;
}
