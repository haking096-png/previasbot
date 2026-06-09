/**
 * Distributed Lock using Redis for BullMQ
 * Prevents race conditions in workers running on multiple instances
 */

import { connection } from './queue';
import logger from './logger';

interface LockOptions {
  ttl: number;        // Lock TTL in milliseconds
  retryCount: number; // Number of retries
  retryDelay: number; // Delay between retries in milliseconds
}

const DEFAULT_LOCK_OPTIONS: LockOptions = {
  ttl: 30000,        // 30 seconds default
  retryCount: 3,
  retryDelay: 1000,  // 1 second
};

export class DistributedLock {
  private redis = connection;
  private readonly lockPrefix = 'lock:';

  /**
   * Acquire a distributed lock
   * @param key Lock key (will be prefixed with 'lock:')
   * @param options Lock options
   * @returns Lock ID if acquired, null if not
   */
  async acquire(key: string, options: Partial<LockOptions> = {}): Promise<string | null> {
    const opts = { ...DEFAULT_LOCK_OPTIONS, ...options };
    const lockKey = `${this.lockPrefix}${key}`;
    const lockId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    for (let attempt = 0; attempt < opts.retryCount; attempt++) {
      // Try to set the lock using SET NX EX (atomic operation)
      const result = await this.redis.set(lockKey, lockId, 'PX', opts.ttl, 'NX');

      if (result === 'OK') {
        logger.debug('Lock acquired', { key, lockId, attempt });
        return lockId;
      }

      if (attempt < opts.retryCount - 1) {
        await this.sleep(opts.retryDelay);
      }
    }

    logger.debug('Failed to acquire lock', { key, attempts: opts.retryCount });
    return null;
  }

  /**
   * Release a distributed lock
   * @param key Lock key
   * @param lockId Lock ID returned from acquire()
   * @returns true if released, false if lock was not held
   */
  async release(key: string, lockId: string): Promise<boolean> {
    const lockKey = `${this.lockPrefix}${key}`;

    // Use Lua script for atomic check-and-delete
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;

    const result = await this.redis.eval(script, 1, lockKey, lockId);

    if (result === 1) {
      logger.debug('Lock released', { key, lockId });
      return true;
    }

    logger.debug('Lock release failed - not held', { key, lockId });
    return false;
  }

  /**
   * Execute a function with a distributed lock
   * @param key Lock key
   * @param fn Function to execute
   * @param options Lock options
   * @returns Function result or null if lock not acquired
   */
  async withLock<T>(
    key: string,
    fn: () => Promise<T>,
    options: Partial<LockOptions> = {}
  ): Promise<T | null> {
    const lockId = await this.acquire(key, options);

    if (!lockId) {
      logger.debug('Could not acquire lock, skipping', { key });
      return null;
    }

    try {
      return await fn();
    } finally {
      await this.release(key, lockId);
    }
  }

  /**
   * Check if a lock is currently held
   * @param key Lock key
   * @returns true if locked
   */
  async isLocked(key: string): Promise<boolean> {
    const lockKey = `${this.lockPrefix}${key}`;
    const exists = await this.redis.exists(lockKey);
    return exists === 1;
  }

  /**
   * Get remaining TTL for a lock
   * @param key Lock key
   * @returns TTL in ms, or -1 if not locked, -2 if key doesn't exist
   */
  async getTTL(key: string): Promise<number> {
    const lockKey = `${this.lockPrefix}${key}`;
    return await this.redis.pttl(lockKey);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance
export const distributedLock = new DistributedLock();
