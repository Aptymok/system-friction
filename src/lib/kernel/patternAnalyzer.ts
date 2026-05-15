let patterns: any[] = [];

export function recordPattern(p: any) {
  patterns.push({ ...p, ts: Date.now() });

  if (patterns.length > 1000) {
    patterns = patterns.slice(-500);
  }
}

export function getPatterns() {
  return patterns;
}