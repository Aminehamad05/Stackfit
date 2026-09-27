import { api } from '../../lib/api';

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
