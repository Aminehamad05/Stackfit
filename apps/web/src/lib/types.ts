export interface BackgroundConcept {
  id: number;
  slug: string;
  name: string;
  level: string;
  strength: number;
}

export interface BackgroundItem {
  id: number;
  kind: 'uni_course' | 'skill' | 'experience';
  name: string;
  concepts: BackgroundConcept[];
}

export interface SavedBackground {
  itemId: number;
  kind: string;
  name: string;
  confidence: number;
  interest: number;
}

export interface ProfileConcept {
  conceptId: number;
  slug: string;
  name: string;
  level: string;
  score: number;
}

export interface MatchedConcept {
  conceptId: number;
  slug: string;
  name: string;
}

export interface FieldMatch {
  fieldId: number;
  slug: string;
  name: string;
  description: string;
  compatibility: number;
  skillMatch?: number;
  interestMatch?: number;
  matchedConcepts?: MatchedConcept[];
  chosen?: boolean;
}

export interface FitEntry {
  fieldId: number;
  slug: string;
  compatibility: number;
  fit: number | null;
  complete: boolean;
  parts: { skill: number; enjoyment?: number; performance?: number };
}

export interface CertificationProgress {
  slug: string;
  title: string;
  field: string | null;
  eligible: boolean;
  missingConcepts: string[];
  needsTaster: boolean;
  needsInterviews: number;
}

export interface EarnedCertification {
  slug: string;
  title: string;
  awardedAt: string;
}

export interface ProjectSuggestion {
  slug: string;
  title: string;
  description: string;
  field: string | null;
  level: string;
  estHours: number;
  deliverableHint: string | null;
  ready: boolean;
  mastered: number;
  total: number;
  missing: string[];
}

export interface Taster {
  id: number;
  slug: string;
  title: string;
  description: string;
  level: string;
  estHours: number;
  deliverableType: string;
  rubric: Array<{ id: string; criterion: string; weight: number; required?: boolean }>;
  status: string;
  resources?: Array<{ title: string; url: string }>;
}

export interface ClubEventItem {
  id: number;
  title: string;
  type: string;
  city: string | null;
  country: string;
  location: string | null;
  description: string | null;
  startsAt: string;
  endsAt: string | null;
  url: string | null;
  status: 'draft' | 'approved';
  clubId: number | null;
  fieldId: number | null;
  club?: { id: number; name: string };
}

export interface LeaderboardRow {
  id: number;
  display_name: string;
  total_points: number;
}

export interface QuizQuestion {
  id: number;
  stem: string;
  difficulty: string;
  options: Array<{ id: number; text: string }>;
}

export interface RoadmapStep {
  position: number;
  concept: { slug: string; name: string };
  resource: { title: string; url: string } | null;
  status: string;
}
