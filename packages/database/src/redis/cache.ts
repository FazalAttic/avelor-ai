import type Redis from "ioredis";

export interface CacheOptions {
  readonly defaultTtlSeconds?: number | undefined;
  readonly keyPrefix?: string | undefined;
}

export class RedisCache {
  private readonly defaultTtl: number;
  private readonly prefix: string;

  constructor(
    private readonly redis: Redis,
    options: CacheOptions = {}
  ) {
    this.defaultTtl = options.defaultTtlSeconds ?? 3600; // 1 hour default
    this.prefix = options.keyPrefix ?? "avelor:cache:";
  }

  private resolveKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  async get<T>(key: string): Promise<T | null> {
    const raw = await this.redis.get(this.resolveKey(key));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const ttl = ttlSeconds ?? this.defaultTtl;
    const serialized = JSON.stringify(value);
    const resolvedKey = this.resolveKey(key);
    if (ttl > 0) {
      await this.redis.set(resolvedKey, serialized, "EX", ttl);
    } else {
      await this.redis.set(resolvedKey, serialized);
    }
  }

  async getOrSet<T>(key: string, fetcher: () => Promise<T>, ttlSeconds?: number): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }
    const fresh = await fetcher();
    await this.set(key, fresh, ttlSeconds);
    return fresh;
  }

  async delete(key: string): Promise<boolean> {
    const deleted = await this.redis.del(this.resolveKey(key));
    return deleted > 0;
  }

  async deletePrefix(prefix: string): Promise<number> {
    const pattern = `${this.resolveKey(prefix)}*`;
    const keys = await this.redis.keys(pattern);
    if (keys.length === 0) return 0;
    return this.redis.del(...keys);
  }

  async has(key: string): Promise<boolean> {
    const exists = await this.redis.exists(this.resolveKey(key));
    return exists === 1;
  }
}
