import { api } from '../../lib/api';

export type PathNodeState = 'locked' | 'current' | 'completed' | 'skip_eligible';
export type PathNodeKind = 'course' | 'quiz' | 'project' | 'cert';

export interface PathConcept {
  id: number;
  slug: string;
  name: string;
  level?: string;
}

export interface PathNode {
  key: string;
  kind: PathNodeKind;
  position: number;
  state: PathNodeState;
  concept?: PathConcept;
  resource?: { id: number; title: string; url: string; isFree: boolean } | null;
  questionCount?: number;
  passThreshold?: number;
  locking?: boolean;
  taster?: { id: number; slug: string; title: string; level: string; estHours: number };
  userStatus?: string | null;
  cert?: { slug: string; title: string };
}

export interface PathPayload {
  roadmap: { id: number; field: { slug: string; name: string } };
  nodes: PathNode[];
  currentKey: string | null;
}

export function fetchPath(roadmapId: string): Promise<PathPayload> {
  return api<PathPayload>(`/roadmaps/${roadmapId}/path`);
}
