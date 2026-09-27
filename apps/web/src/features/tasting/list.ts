const KEY = 'cp_tasting_slugs';

/** Explicit per-field tasting list (dashboard toggles → roadmap minis). */
export function getTastingList(): string[] | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const arr = JSON.parse(raw) as unknown;
    return Array.isArray(arr) ? arr.filter((s): s is string => typeof s === 'string') : null;
  } catch {
    return null;
  }
}

export function setTastingList(slugs: string[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(slugs));
  } catch {
    /* storage unavailable — list simply won't persist */
  }
}

export function toggleTastingSlug(list: string[], slug: string): string[] {
  return list.includes(slug) ? list.filter((s) => s !== slug) : [...list, slug];
}
