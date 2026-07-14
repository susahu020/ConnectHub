import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: null, // Required by BullMQ
  lazyConnect: true,
});

redis.on('error', (err) => {
  console.error('Redis connection error:', err);
});

redis.on('connect', () => {
  console.log('Successfully connected to Redis');
});

// Gracefully attempt connection
redis.connect().catch((err) => {
  console.warn('Could not connect to Redis. Some caching/queue features will be limited.', err.message);
});

export default redis;
