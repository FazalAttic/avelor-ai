import type Redis from "ioredis";

export interface TokenBucketOptions {
  /** Maximum burst capacity of the bucket */
  readonly capacity: number;
  /** Tokens added to the bucket per second */
  readonly refillRatePerSecond: number;
  /** Redis key prefix, defaults to "ratelimit:" */
  readonly keyPrefix?: string;
}

export interface TokenBucketResult {
  /** Whether the request was permitted under the rate limit */
  readonly allowed: boolean;
  /** Number of tokens remaining in the bucket after this operation */
  readonly remaining: number;
  /** Total bucket capacity */
  readonly capacity: number;
  /** Seconds to wait until sufficient tokens have refilled (0 if allowed) */
  readonly retryAfterSeconds: number;
}

const TOKEN_BUCKET_LUA = `
local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local refill_rate_ms = tonumber(ARGV[2])
local cost = tonumber(ARGV[3])
local now = tonumber(ARGV[4])

local data = redis.call('HMGET', key, 'tokens', 'last_refill')
local tokens = tonumber(data[1])
local last_refill = tonumber(data[2])

if tokens == nil or last_refill == nil then
  tokens = capacity
  last_refill = now
else
  local elapsed = math.max(0, now - last_refill)
  tokens = math.min(capacity, tokens + (elapsed * refill_rate_ms))
end

if tokens >= cost then
  tokens = tokens - cost
  redis.call('HMSET', key, 'tokens', tokens, 'last_refill', now)
  local ttl_sec = math.ceil((capacity / refill_rate_ms) / 1000) + 60
  redis.call('EXPIRE', key, math.max(ttl_sec, 60))
  return { 1, math.floor(tokens), 0 }
else
  local needed = cost - tokens
  local retry_after_ms = math.ceil(needed / refill_rate_ms)
  local retry_after_sec = math.max(1, math.ceil(retry_after_ms / 1000))
  return { 0, math.floor(tokens), retry_after_sec }
end
`;

/**
 * Production-grade distributed Token Bucket rate limiter backed by Redis.
 * Executes atomically in Redis via Lua script (zero race conditions, O(1) space/time).
 */
export class RedisTokenBucket {
  private readonly keyPrefix: string;
  private readonly capacity: number;
  private readonly refillRatePerMs: number;

  constructor(
    private readonly redis: Redis,
    options: TokenBucketOptions
  ) {
    this.capacity = Math.max(1, options.capacity);
    this.refillRatePerMs = Math.max(0.0001, options.refillRatePerSecond / 1000);
    this.keyPrefix = options.keyPrefix ?? "ratelimit:";
  }

  /**
   * Evaluates and consumes tokens atomically from the bucket.
   *
   * @param identifier Unique key (e.g. IP address, user ID, API client token)
   * @param cost Number of tokens to consume (defaults to 1; heavy routes like LLM can consume more)
   */
  async consume(identifier: string, cost = 1): Promise<TokenBucketResult> {
    const key = `${this.keyPrefix}${identifier}`;
    const now = Date.now();

    try {
      // Execute the Lua script atomically
      const res = (await this.redis.eval(
        TOKEN_BUCKET_LUA,
        1,
        key,
        this.capacity.toString(),
        this.refillRatePerMs.toString(),
        cost.toString(),
        now.toString()
      )) as [number, number, number];

      const allowed = res[0] === 1;
      const remaining = res[1];
      const retryAfterSeconds = res[2];

      return {
        allowed,
        remaining,
        capacity: this.capacity,
        retryAfterSeconds,
      };
    } catch {
      // Fail-open: if Redis is temporarily unreachable, do not hard-crash production traffic
      return {
        allowed: true,
        remaining: this.capacity,
        capacity: this.capacity,
        retryAfterSeconds: 0,
      };
    }
  }

  /**
   * Resets the bucket for a given identifier (e.g. on successful admin login or test cleanup).
   */
  async reset(identifier: string): Promise<void> {
    const key = `${this.keyPrefix}${identifier}`;
    await this.redis.del(key).catch(() => {});
  }
}
