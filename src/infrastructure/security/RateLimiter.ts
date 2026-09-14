import { IRateLimiter, RateLimitResult } from '../../core/ports';

interface BucketEntry {
  timestamps: number[];
}

export class InMemoryRateLimiter implements IRateLimiter {
  private buckets: Map<string, BucketEntry>;

  constructor() {
    this.buckets = new Map();
  }

  public async checkLimit(
    key: string,
    maxRequests: number = 60,
    windowMs: number = 60 * 1000
  ): Promise<RateLimitResult> {
    const now = Date.now();
    let entry = this.buckets.get(key);

    if (!entry) {
      entry = { timestamps: [] };
      this.buckets.set(key, entry);
    }

    // Filter out timestamps outside window
    const windowStart = now - windowMs;
    entry.timestamps = entry.timestamps.filter((ts) => ts > windowStart);

    if (entry.timestamps.length >= maxRequests) {
      const oldest = entry.timestamps[0];
      const resetTime = Math.ceil((oldest + windowMs - now) / 1000);
      return {
        allowed: false,
        remaining: 0,
        resetTime: Math.max(1, resetTime),
      };
    }

    entry.timestamps.push(now);
    return {
      allowed: true,
      remaining: maxRequests - entry.timestamps.length,
      resetTime: Math.ceil(windowMs / 1000),
    };
  }

  public reset(): void {
    this.buckets.clear();
  }
}
