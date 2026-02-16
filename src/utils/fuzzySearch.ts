/**
 * Lightweight fuzzy match: query chars must appear in order in str (case-insensitive).
 * Returns a score: higher = better match. Uses simple position-based scoring.
 */
export function fuzzyMatch(query: string, str: string): number {
  if (!query.trim()) return 1;
  const q = query.toLowerCase().trim();
  const s = str.toLowerCase();
  let score = 0;
  let lastIdx = -1;
  for (let i = 0; i < q.length; i++) {
    const idx = s.indexOf(q[i], lastIdx + 1);
    if (idx === -1) return -1;
    // Prefer matches at word boundaries and consecutive chars
    if (lastIdx >= 0 && idx === lastIdx + 1) score += 2;
    else if (idx === 0 || s[idx - 1] === ' ' || s[idx - 1] === '.') score += 1;
    lastIdx = idx;
  }
  return score;
}

/**
 * Check if any of the haystack strings fuzzy-match the query.
 */
export function fuzzyMatchAny(query: string, haystack: string[]): number {
  if (!query.trim()) return 1;
  let best = -1;
  for (const s of haystack) {
    if (!s) continue;
    const score = fuzzyMatch(query, s);
    if (score > best) best = score;
  }
  return best;
}
