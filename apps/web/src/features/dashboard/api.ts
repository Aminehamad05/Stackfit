import { api, ApiError } from '../../lib/api';
import type {
  CertificationProgress,
  EarnedCertification,
  FieldMatch,
  FitEntry,
  ProjectSuggestion,
  SavedBackground,
} from '../../lib/types';

// Dashboard data layer — fetches ONLY endpoints that exist today (all
// requireAuth, student world). Shapes mirror the server responses 1:1;
// see apps/api/src/modules/{matching,growth,background}/routes.ts.
//
// Deliberately NOT fetched (flagged in the UI instead of guessed):
// - GET /leaderboard → 501 not_implemented (no points ledger read yet).
// - Roadmap step progress → no "my roadmaps" list endpoint exists; only
//   GET /roadmaps/:id by id. The page falls back to the locally stored id.

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

/** null = matches never computed (server 404 not_computed). */
export function fetchFieldFit(): Promise<FitEntry[] | null> {
  return nullOnNotComputed(() =>
    api<{ fit: FitEntry[] }>('/users/me/field-fit', { account: 'person' }).then((d) => d.fit),
  );
}

export interface Certifications {
  earned: EarnedCertification[];
  inProgress: CertificationProgress[];
}

export function fetchCertifications(): Promise<Certifications> {
  return api<Certifications>('/users/me/certifications', { account: 'person' });
}

export interface ProjectSuggestions {
  suggestions: ProjectSuggestion[];
  thresholds: { projectMinScore: number };
}

export function fetchProjectSuggestions(): Promise<ProjectSuggestions> {
  return api<ProjectSuggestions>('/users/me/project-suggestions', { account: 'person' });
}

export interface RoadmapCreated {
  roadmap: { id: number; field: { slug: string; name: string } };
}

/** POST /api/roadmaps — deterministic generation (matching.buildRoadmap). */
export function generateRoadmap(fieldId: number): Promise<RoadmapCreated> {
  return api<RoadmapCreated>('/roadmaps', {
    method: 'POST',
    body: { fieldId },
    account: 'person',
  });
}
