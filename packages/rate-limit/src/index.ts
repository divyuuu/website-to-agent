export interface LimitDecision {
  allowed: boolean;
  retryAfterSec: number;
}

export interface LimiterOptions {
  maxPerMin: number;
  maxConcurrent: number;
}

export class TenantLimiter {
  private hits = new Map<string, number[]>();
  private active = new Map<string, number>();
  constructor(private options: LimiterOptions) {}

  configure(options: LimiterOptions): void {
    this.options = options;
  }

  private windowStart(now: number): number {
    return now - 60_000;
  }

  check(key: string, now = Date.now()): LimitDecision {
    if ((this.active.get(key) ?? 0) >= this.options.maxConcurrent) {
      return { allowed: false, retryAfterSec: 5 };
    }
    const start = this.windowStart(now);
    const recent = (this.hits.get(key) ?? []).filter((t) => t > start);
    if (recent.length >= this.options.maxPerMin) {
      const oldest = recent[0] ?? start;
      return { allowed: false, retryAfterSec: Math.max(1, Math.ceil((oldest - start) / 1000)) };
    }
    return { allowed: true, retryAfterSec: 0 };
  }

  begin(key: string, now = Date.now()): LimitDecision {
    const decision = this.check(key, now);
    if (!decision.allowed) return decision;
    const start = this.windowStart(now);
    const recent = (this.hits.get(key) ?? []).filter((t) => t > start);
    recent.push(now);
    this.hits.set(key, recent);
    this.active.set(key, (this.active.get(key) ?? 0) + 1);
    return { allowed: true, retryAfterSec: 0 };
  }

  end(key: string): void {
    const current = this.active.get(key) ?? 0;
    if (current <= 1) this.active.delete(key);
    else this.active.set(key, current - 1);
  }

  reset(): void {
    this.hits.clear();
    this.active.clear();
  }
}

export function limiterFromEnv(): TenantLimiter {
  const maxPerMin = Math.max(1, Number(process.env.EXEC_RATE_LIMIT_PER_MIN ?? "30"));
  const maxConcurrent = Math.max(1, Number(process.env.EXEC_MAX_CONCURRENT ?? "2"));
  return new TenantLimiter({ maxPerMin, maxConcurrent });
}
