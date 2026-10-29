const PATTERNS: RegExp[] = [
  /w2a_[A-Za-z0-9]+/g,
  /w2a_session=[^;\s]*/gi,
  /Authorization:\s*\S+/gi,
  /"password"\s*:\s*"[^"]*"/gi,
  /password=[^&\s]*/gi,
  /api[_-]?key[=:]\s*[^\s&;]+/gi,
];

export function redactText(input: string): string {
  let out = input;
  for (const re of PATTERNS) {
    re.lastIndex = 0;
    out = out.replace(re, "[redacted]");
  }
  return out;
}

export function redactError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  return redactText(msg).slice(0, 500);
}
