import "server-only";

import EventEmitter from "node:events";
import Redis from "ioredis";

const CHANNEL = "unitrak:events";

type LiveEvent = {
  type: string;
  at: string;
  payload?: unknown;
};

const globalLive = globalThis as unknown as {
  unitrakBus?: EventEmitter;
  unitrakRedis?: Redis;
  unitrakCache?: Map<string, string>;
};

const bus = globalLive.unitrakBus ?? new EventEmitter();
bus.setMaxListeners(100);
globalLive.unitrakBus = bus;

const memoryCache = globalLive.unitrakCache ?? new Map<string, string>();
globalLive.unitrakCache = memoryCache;

function makeRedis() {
  const url = process.env.REDIS_URL;

  if (!url) {
    return null;
  }

  if (!globalLive.unitrakRedis) {
    globalLive.unitrakRedis = new Redis(url, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });

    globalLive.unitrakRedis.on("error", () => {
      // The app still works without Redis during local development.
    });
  }

  return globalLive.unitrakRedis;
}

async function connect(redis: Redis) {
  if (redis.status === "wait" || redis.status === "close") {
    await redis.connect();
  }
}

export async function publishLiveEvent(type: string, payload?: unknown) {
  const event: LiveEvent = { type, payload, at: new Date().toISOString() };
  bus.emit(CHANNEL, event);

  const redis = makeRedis();

  if (!redis) {
    return;
  }

  try {
    await connect(redis);
    await redis.publish(CHANNEL, JSON.stringify(event));
  } catch {
    // In rough local mode we silently fall back to the in-memory event bus.
  }
}

export async function subscribeLiveEvents(handler: (event: LiveEvent) => void) {
  const redisUrl = process.env.REDIS_URL;

  if (redisUrl) {
    const subscriber = new Redis(redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });
    subscriber.on("error", () => {
      // Redis is optional for this project. If it is down, SSE uses memory events.
    });

    try {
      await connect(subscriber);
      await subscriber.subscribe(CHANNEL);
      subscriber.on("message", (_channel, message) => {
        try {
          handler(JSON.parse(message) as LiveEvent);
        } catch {
          // Ignore malformed pub/sub messages.
        }
      });

      return () => {
        void subscriber.quit();
      };
    } catch {
      void subscriber.disconnect();
    }
  }

  const memoryHandler = (event: LiveEvent) => handler(event);
  bus.on(CHANNEL, memoryHandler);

  return () => {
    bus.off(CHANNEL, memoryHandler);
  };
}

export async function cacheGetJson<T>(key: string) {
  const redis = makeRedis();

  if (redis) {
    try {
      await connect(redis);
      const value = await redis.get(key);
      return value ? (JSON.parse(value) as T) : null;
    } catch {
      // Fall through to memory cache.
    }
  }

  const memoryValue = memoryCache.get(key);
  return memoryValue ? (JSON.parse(memoryValue) as T) : null;
}

export async function cacheSetJson(key: string, value: unknown, seconds = 300) {
  const text = JSON.stringify(value);
  memoryCache.set(key, text);

  const redis = makeRedis();

  if (!redis) {
    return;
  }

  try {
    await connect(redis);
    await redis.set(key, text, "EX", seconds);
  } catch {
    // Memory cache is enough for local development.
  }
}
