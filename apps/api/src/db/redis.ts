import { Redis } from 'ioredis';
import { env } from '../config/env.js';

let redisClient: Redis | null = null;
let isRedisAvailable = false;

// In-memory key-value store fallback when Redis is offline
const inMemoryStore = new Map<string, { value: string; expiry?: number }>();

try {
  redisClient = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 1,
    retryStrategy: (times) => {
      if (times > 2) {
        return null; // Stop retrying and fallback to in-memory mode
      }
      return 500;
    },
    lazyConnect: true,
  });

  redisClient.on('ready', () => {
    isRedisAvailable = true;
    console.log('✅ Connected to Redis cache/queue');
  });

  redisClient.on('close', () => {
    isRedisAvailable = false;
  });

  redisClient.on('error', (err) => {
    isRedisAvailable = false;
    // Suppress spammy offline logs in dev
  });

  // Attempt non-blocking connect
  redisClient.connect().catch(() => {
    isRedisAvailable = false;
  });
} catch {
  isRedisAvailable = false;
}

export const cache = {
  async get(key: string): Promise<string | null> {
    if (isRedisAvailable && redisClient) {
      try {
        return await redisClient.get(key);
      } catch {
        // Fall back to in-memory
      }
    }
    const item = inMemoryStore.get(key);
    if (!item) return null;
    if (item.expiry && Date.now() > item.expiry) {
      inMemoryStore.delete(key);
      return null;
    }
    return item.value;
  },

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (isRedisAvailable && redisClient) {
      try {
        if (ttlSeconds) {
          await redisClient.set(key, value, 'EX', ttlSeconds);
        } else {
          await redisClient.set(key, value);
        }
        return;
      } catch {
        // Fall back to in-memory
      }
    }
    inMemoryStore.set(key, {
      value,
      expiry: ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined,
    });
  },

  async del(key: string): Promise<void> {
    if (isRedisAvailable && redisClient) {
      try {
        await redisClient.del(key);
      } catch {
        // Fall back
      }
    }
    inMemoryStore.delete(key);
  },

  isAvailable(): boolean {
    return isRedisAvailable;
  },
};

export { redisClient };
