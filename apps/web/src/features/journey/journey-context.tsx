import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from '../auth/auth-context';
import { fetchFieldMatches } from '../dashboard/api';
import type { FieldMatch } from '../../lib/types';

// Shared source of truth for journey phase, derived from the API rules —
// NOT re-derived per component.
//
// API rule (apps/api/.../matching/routes.ts + matching.ts):
// - GET /users/me/field-matches → 404 `not_computed` until the user computes
//   their top-3; otherwise each match carries `chosen` (set for exactly one
//   field by POST /users/me/field-choice, cleared for the rest).
// - "Taste phase" = matches computed AND none chosen: the user is comparing
//   candidates via tasters (fitScore per field, fit:null until tried).
// - A chosen match ends the taste phase (field phase begins).
//
// Header (link set) and Dashboard (phase sections) both consume this context
// so the definition lives in exactly one place.

export interface JourneyState {
  /** null = not computed (server 404) or not a person session. */
  matches: FieldMatch[] | null;
  /** True once the initial fetch has settled (success, 404, or non-person). */
  loaded: boolean;
  tastePhase: boolean;
  chosen: FieldMatch | null;
  refresh: () => Promise<void>;
}

const JourneyContext = createContext<JourneyState | null>(null);

export function JourneyProvider({ children }: { children: ReactNode }): JSX.Element {
  const { account } = useAuth();
  const [matches, setMatches] = useState<FieldMatch[] | null>(null);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    if (account !== 'person') {
      setMatches(null);
      setLoaded(true);
      return;
    }
    setLoaded(false);
    try {
      setMatches(await fetchFieldMatches());
    } catch {
      // A failed fetch must not freeze consumers on "loading": treat as
      // unknown (null) but settled, so pages fall back to safe defaults.
      setMatches(null);
    } finally {
      setLoaded(true);
    }
  }, [account]);

  useEffect(() => {
    void load();
  }, [load]);

  const refresh = useCallback(async () => {
    await load();
  }, [load]);

  const value = useMemo<JourneyState>(() => {
    const chosen = matches?.find((m) => m.chosen) ?? null;
    return {
      matches,
      loaded,
      chosen,
      tastePhase: account === 'person' && loaded && matches !== null && chosen === null,
      refresh,
    };
  }, [matches, loaded, account, refresh]);

  return <JourneyContext.Provider value={value}>{children}</JourneyContext.Provider>;
}

export function useJourney(): JourneyState {
  const ctx = useContext(JourneyContext);
  if (!ctx) throw new Error('useJourney must be used inside <JourneyProvider>');
  return ctx;
}
