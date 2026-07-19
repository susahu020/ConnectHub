import redis from '../config/redis';

/**
 * Minimal distributed lock built on Redis SET NX PX.
 *
 * Why this exists: index.ts runs two setInterval loops (scheduled message
 * delivery, due-date reminders) directly inside the Express process. That's
 * fine for one instance. The moment you run 2+ backend instances (e.g. for
 * uptime or load), every instance runs its own copy of the same interval,
 * so scheduled messages get delivered twice and reminder notifications get
 * sent twice. This lock makes each interval tick a no-op on every instance
 * except whichever one wins the race to acquire the lock, without needing a
 * separate worker process or job scheduler.
 *
 * This is deliberately simple (not Redlock/quorum-based) — good enough to
 * prevent duplicate sends across a handful of instances of the same app.
 * If Redis is unreachable, we fail open (run the job anyway) so a single
 * local dev instance without Redis still works exactly as before.
 */
export const withLock = async (
  lockKey: string,
  ttlMs: number,
  fn: () => Promise<void>
): Promise<void> => {
  const key = `lock:${lockKey}`;
  const token = `${process.pid}-${Date.now()}-${Math.random()}`;

  let acquired = false;
  try {
    const result = await redis.set(key, token, 'PX', ttlMs, 'NX');
    acquired = result === 'OK';
  } catch (err) {
    // Redis unreachable — fail open so single-instance/local dev still runs.
    console.warn(`[lock:${lockKey}] Redis unavailable, running job without a lock.`, err);
    acquired = true;
  }

  if (!acquired) {
    // Another instance already holds the lock for this tick — skip.
    return;
  }

  try {
    await fn();
  } finally {
    // Best-effort release; if this fails the TTL still expires the lock.
    try {
      const current = await redis.get(key);
      if (current === token) {
        await redis.del(key);
      }
    } catch {
      // ignore — TTL will clean it up
    }
  }
};
