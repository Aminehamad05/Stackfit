import { api, ApiError } from '../../lib/api';
import type {
  CertificationProgress,
  EarnedCertification,
  FieldMatch,
  SavedBackground,
} from '../../lib/types';

export interface TasteBlock {
  field: { slug: string; name: string };
  tasters: { done: number; total: number };
  enjoyment: number | null;
  performance: number | null;
  quizzesPassed: number;
}

export interface CommittedBlock {
  field: { slug: string; name: string };
  roadmapId: number | null;
  completionPct: number;
  milestones: { done: number; total: number };
  quizzesPassed: number;
  projects: { done: number; total: number };
  certsEarned: Array<{ slug: string; title: string; awardedAt: string }>;
  points: number;
  rank: number | null;
}

export interface DashboardPayload {
  phase: 'tasting' | 'committed';
  committedField: { slug: string; name: string } | null;
  taste: TasteBlock[];
  committed: CommittedBlock | null;
}

export function fetchDashboard(): Promise<DashboardPayload> {
  return api<DashboardPayload>('/users/me/dashboard');
}

async function nullOnNotComputed<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

export function fetchBackground(): Promise<SavedBackground[]> {
  return api<{ background: SavedBackground[] }>('/users/me/background', { account: 'person' }).then(
    (d) => d.background,
  );
}

/** null = matches never computed (server 404 not_computed). */
export function fetchFieldMatches(): Promise<FieldMatch[] | null> {
  return nullOnNotComputed(() =>
    api<{ matches: FieldMatch[] }>('/users/me/field-matches', { account: 'person' }).then((d) => d.matches),
  );
}

export interface Certifications {
  earned: EarnedCertification[];
  inProgress: CertificationProgress[];
}

export function fetchCertifications(): Promise<Certifications> {
  return api<Certifications>('/users/me/certifications', { account: 'person' });
}
