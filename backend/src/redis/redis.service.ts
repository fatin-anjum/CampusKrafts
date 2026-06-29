import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * Shared Redis connection used for caching, rate-limiting, and live mock-test
 * leaderboards (sorted sets).
 *
 * Redis is OPTIONAL for development: if it is unreachable the service logs a
 * single warning, keeps retrying quietly in the background, and every helper
 * degrades gracefully (no-op / empty result) so the rest of the app is
 * unaffected. Features that rely on Redis fall back to PostgreSQL.
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  public client: Redis | null = null;
  private ready = false;
  private warned = false;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const url = this.config.get<string>('redis.url')!;
    this.client = new Redis(url, {
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      // Keep trying to reconnect (up to 5s backoff) so it self-heals if Redis
      // starts later — but we only log the first failure to avoid spam.
      retryStrategy: (times) => Math.min(times * 500, 5000),
    });

    this.client.on('ready', () => {
      this.ready = true;
      this.warned = false;
      this.logger.log('Redis connected');
    });
    this.client.on('end', () => (this.ready = false));
    this.client.on('error', (e) => {
      this.ready = false;
      if (!this.warned) {
        this.warned = true;
        this.logger.warn(
          `Redis unavailable (${e.message || 'connection refused'}). ` +
            'Caching & live leaderboards are disabled until Redis is reachable — the app runs fine without it.',
        );
      }
    });

    // Attempt the initial connection without blocking app startup.
    this.client.connect().catch(() => {});
  }

  async onModuleDestroy() {
    await this.client?.quit().catch(() => {});
  }

  isReady(): boolean {
    return this.ready;
  }

  /** Liveness check for /health. Returns true only when a PING round-trips. */
  async ping(): Promise<boolean> {
    if (!this.client || !this.ready) return false;
    try {
      return (await this.client.ping()) === 'PONG';
    } catch {
      return false;
    }
  }

  // ── Generic cache helpers (all no-op safely when Redis is down) ─────────
  async get<T>(key: string): Promise<T | null> {
    if (!this.ready || !this.client) return null;
    try {
      const raw = await this.client.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSec?: number): Promise<void> {
    if (!this.ready || !this.client) return;
    try {
      const raw = JSON.stringify(value);
      if (ttlSec) await this.client.set(key, raw, 'EX', ttlSec);
      else await this.client.set(key, raw);
    } catch {
      /* ignore */
    }
  }

  async del(key: string): Promise<void> {
    if (!this.ready || !this.client) return;
    try {
      await this.client.del(key);
    } catch {
      /* ignore */
    }
  }

  // ── Leaderboard helpers (mock tests) ───────────────────────────────────
  async zaddScore(key: string, score: number, member: string): Promise<void> {
    if (!this.ready || !this.client) return;
    try {
      await this.client.zadd(key, score, member);
    } catch {
      /* ignore */
    }
  }

  async zcard(key: string): Promise<number> {
    if (!this.ready || !this.client) return 0;
    try {
      return await this.client.zcard(key);
    } catch {
      return 0;
    }
  }

  /** Returns members ranked high→low with their scores. Empty when Redis is down. */
  async leaderboard(key: string, start = 0, stop = 49): Promise<{ member: string; score: number }[]> {
    if (!this.ready || !this.client) return [];
    try {
      const flat = await this.client.zrevrange(key, start, stop, 'WITHSCORES');
      const out: { member: string; score: number }[] = [];
      for (let i = 0; i < flat.length; i += 2) out.push({ member: flat[i], score: Number(flat[i + 1]) });
      return out;
    } catch {
      return [];
    }
  }

  async rank(key: string, member: string): Promise<number | null> {
    if (!this.ready || !this.client) return null;
    try {
      const r = await this.client.zrevrank(key, member);
      return r === null ? null : r + 1; // 1-based
    } catch {
      return null;
    }
  }
}
