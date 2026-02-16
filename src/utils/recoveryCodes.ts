const HEADER_PATTERNS = /^(backup codes?|recovery codes?|save these codes?|emergency codes?):?\s*$/i;

/** Parse recovery codes from file text. Handles: one per line, "1. code", "1) code", comma-separated, trims boilerplate. */
export function parseRecoveryCodesFromFile(text: string): { codes: string[]; rawCount: number; duplicateCount: number } {
  const seen = new Set<string>();
  const codes: string[] = [];
  const lines = text.split(/[\r\n]+/);
  let rawCount = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    if (HEADER_PATTERNS.test(trimmed)) continue;
    const withoutNumber = trimmed.replace(/^\d+[.\)]\s*/, '');
    const parts = withoutNumber.split(/[,\t]+/).map((s) => s.trim());
    for (const part of parts) {
      const code = part.replace(/\s+/g, '');
      if (code.length >= 4 && /^[A-Za-z0-9\-]+$/.test(code)) {
        rawCount++;
        if (!seen.has(code)) {
          seen.add(code);
          codes.push(code);
        }
      }
    }
  }
  return { codes, rawCount, duplicateCount: rawCount - codes.length };
}
