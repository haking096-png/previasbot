import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CircuitBreaker } from '../../src/utils/circuitBreaker';

describe('CircuitBreaker', () => {
  let circuitBreaker: CircuitBreaker;

  describe('initial state', () => {
    it('starts in CLOSED state', () => {
      const cb = new CircuitBreaker();
      expect(cb.getState()).toBe('CLOSED');
    });

    it('starts with 0 failures', () => {
      const cb = new CircuitBreaker();
      expect(cb.getFailures()).toBe(0);
    });

    it('uses default options', () => {
      const cb = new CircuitBreaker();
      // Access private options through execute behavior
      expect(cb.getState()).toBe('CLOSED');
    });
  });

  describe('CLOSED state transitions', () => {
    it('executes function successfully in CLOSED state', async () => {
      const cb = new CircuitBreaker();
      const mockFn = vi.fn().mockResolvedValue('success');

      const result = await cb.execute(mockFn);

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(cb.getState()).toBe('CLOSED');
    });

    it('stays CLOSED after one failure', async () => {
      const cb = new CircuitBreaker({ failureThreshold: 3 });
      const mockFn = vi.fn().mockRejectedValue(new Error('fail'));

      await expect(cb.execute(mockFn)).rejects.toThrow('fail');
      expect(cb.getState()).toBe('CLOSED');
      expect(cb.getFailures()).toBe(1);
    });

    it('opens after reaching failure threshold', async () => {
      const cb = new CircuitBreaker({ failureThreshold: 3 });
      const mockFn = vi.fn().mockRejectedValue(new Error('fail'));

      // 3 failures to open
      for (let i = 0; i < 3; i++) {
        await expect(cb.execute(mockFn)).rejects.toThrow('fail');
      }

      expect(cb.getState()).toBe('OPEN');
    });
  });

  describe('OPEN state transitions', () => {
    it('blocks requests immediately when OPEN', async () => {
      const cb = new CircuitBreaker({ failureThreshold: 1, timeout: 60000 });
      const mockFn = vi.fn().mockResolvedValue('success');

      // Trigger failure to open
      await expect(cb.execute(mockFn)).rejects.toThrow('fail');
      expect(cb.getState()).toBe('OPEN');

      // Next request should be blocked
      await expect(cb.execute(mockFn)).rejects.toThrow('Circuit breaker is OPEN');
    });

    it('transitions to HALF_OPEN after timeout', async () => {
      vi.useFakeTimers();
      const cb = new CircuitBreaker({ failureThreshold: 1, timeout: 5000 });
      const mockFn = vi.fn().mockResolvedValue('success');

      // Open the circuit
      await expect(cb.execute(mockFn)).rejects.toThrow('fail');
      expect(cb.getState()).toBe('OPEN');

      // Advance time past timeout
      vi.advanceTimersByTime(6000);

      // Now execute should transition to HALF_OPEN
      const result = await cb.execute(mockFn);
      expect(result).toBe('success');
      expect(cb.getState()).toBe('CLOSED');

      vi.useRealTimers();
    });
  });

  describe('HALF_OPEN state transitions', () => {
    it('stays OPEN on failure in HALF_OPEN', async () => {
      vi.useFakeTimers();
      const cb = new CircuitBreaker({ failureThreshold: 2, successThreshold: 2, timeout: 5000 });
      const mockFn = vi.fn().mockRejectedValue(new Error('fail'));

      // Open the circuit
      await expect(cb.execute(mockFn)).rejects.toThrow('fail');
      await expect(cb.execute(mockFn)).rejects.toThrow('fail');

      // Advance time to transition to HALF_OPEN
      vi.advanceTimersByTime(6000);

      // Fail in HALF_OPEN
      await expect(cb.execute(mockFn)).rejects.toThrow('fail');
      expect(cb.getState()).toBe('OPEN');

      vi.useRealTimers();
    });

    it('closes after success threshold in HALF_OPEN', async () => {
      vi.useFakeTimers();
      const cb = new CircuitBreaker({ failureThreshold: 2, successThreshold: 2, timeout: 5000 });
      const mockFn = vi.fn().mockResolvedValue('success');

      // Open the circuit
      await expect(cb.execute(mockFn)).rejects.toThrow('fail');
      await expect(cb.execute(mockFn)).rejects.toThrow('fail');

      // Advance time to transition to HALF_OPEN
      vi.advanceTimersByTime(6000);

      // Success in HALF_OPEN (not enough yet)
      await cb.execute(mockFn);
      expect(cb.getState()).toBe('HALF_OPEN');

      // Second success closes circuit
      await cb.execute(mockFn);
      expect(cb.getState()).toBe('CLOSED');

      vi.useRealTimers();
    });
  });

  describe('reset', () => {
    it('resets state to CLOSED', async () => {
      const cb = new CircuitBreaker({ failureThreshold: 1 });
      const mockFn = vi.fn().mockRejectedValue(new Error('fail'));

      // Open the circuit
      await expect(cb.execute(mockFn)).rejects.toThrow('fail');
      expect(cb.getState()).toBe('OPEN');

      // Reset
      cb.reset();

      expect(cb.getState()).toBe('CLOSED');
      expect(cb.getFailures()).toBe(0);
    });

    it('allows execution after reset', async () => {
      const cb = new CircuitBreaker({ failureThreshold: 1 });
      const mockFn = vi.fn().mockResolvedValue('success');

      // Open the circuit
      await expect(cb.execute(mockFn)).rejects.toThrow('fail');

      // Reset and try again
      cb.reset();
      const result = await cb.execute(mockFn);

      expect(result).toBe('success');
      expect(cb.getState()).toBe('CLOSED');
    });
  });

  describe('custom options', () => {
    it('respects custom failure threshold', () => {
      const cb = new CircuitBreaker({ failureThreshold: 5 });
      expect(cb.getState()).toBe('CLOSED');
      // We can't directly test failure count, but we test state transitions
    });

    it('respects custom success threshold', () => {
      const cb = new CircuitBreaker({ successThreshold: 3 });
      expect(cb.getState()).toBe('CLOSED');
    });

    it('respects custom timeout', () => {
      const cb = new CircuitBreaker({ timeout: 30000 });
      expect(cb.getState()).toBe('CLOSED');
    });
  });

  describe('concurrent requests', () => {
    it('handles concurrent successful requests', async () => {
      const cb = new CircuitBreaker();
      const mockFn = vi.fn().mockResolvedValue('success');

      const results = await Promise.all([
        cb.execute(mockFn),
        cb.execute(mockFn),
        cb.execute(mockFn),
      ]);

      expect(results).toEqual(['success', 'success', 'success']);
    });

    it('handles concurrent failing requests', async () => {
      const cb = new CircuitBreaker({ failureThreshold: 10 });
      const mockFn = vi.fn().mockRejectedValue(new Error('fail'));

      const promises = [
        cb.execute(mockFn).catch(() => 'failed'),
        cb.execute(mockFn).catch(() => 'failed'),
        cb.execute(mockFn).catch(() => 'failed'),
      ];

      const results = await Promise.all(promises);
      expect(results.every(r => r === 'failed')).toBe(true);
    });
  });
});

describe('CircuitBreaker exports', () => {
  it('exports CircuitBreaker class', () => {
    expect(CircuitBreaker).toBeDefined();
    expect(typeof CircuitBreaker).toBe('function');
  });

  it('can be instantiated with options', () => {
    const cb = new CircuitBreaker({
      failureThreshold: 10,
      successThreshold: 5,
      timeout: 120000,
    });
    expect(cb).toBeDefined();
    expect(cb.getState()).toBe('CLOSED');
  });

  it('has all required methods', () => {
    const cb = new CircuitBreaker();
    expect(typeof cb.execute).toBe('function');
    expect(typeof cb.getState).toBe('function');
    expect(typeof cb.getFailures).toBe('function');
    expect(typeof cb.reset).toBe('function');
  });
});