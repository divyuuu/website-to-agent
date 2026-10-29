import { redactText } from "@website-to-agent/secrets";

export type MetricEvent =
  | "execution.succeeded"
  | "execution.failed"
  | "auth.failure"
  | "rate_limited";

const counters = new Map<string, number>();

export function logEvent(event: string, fields: Record<string, unknown> = {}): void {
  const safe: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) {
    safe[k] = typeof v === "string" ? redactText(v) : v;
  }
  console.log(JSON.stringify({ ts: new Date().toISOString(), event, ...safe }));
}

export function countEvent(event: MetricEvent, key = "global"): void {
  counters.set(`${event}:${key}`, (counters.get(`${event}:${key}`) ?? 0) + 1);
}

export function eventCount(event: MetricEvent, key = "global"): number {
  return counters.get(`${event}:${key}`) ?? 0;
}

export function resetMetrics(): void {
  counters.clear();
}

export function percentile(sorted: number[], p: number): number | null {
  if (sorted.length === 0) return null;
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, idx)];
}
