import { describe, expect, it, vi } from 'vitest';

import { acquireRealtime, activeRealtimeListenerCount } from '@/hooks/realtime-registry';

describe('realtime registry', () => {
  it('shares one listener per key and stops it after the last release', () => {
    const stop = vi.fn();
    const start = vi.fn(() => stop);
    const releaseA = acquireRealtime('k1', start);
    const releaseB = acquireRealtime('k1', start);
    expect(start).toHaveBeenCalledTimes(1);
    expect(activeRealtimeListenerCount()).toBe(1);
    releaseA();
    expect(stop).not.toHaveBeenCalled();
    releaseB();
    expect(stop).toHaveBeenCalledTimes(1);
    expect(activeRealtimeListenerCount()).toBe(0);
  });

  it('a double release is harmless', () => {
    const stop = vi.fn();
    const releaseA = acquireRealtime('k2', () => stop);
    const releaseB = acquireRealtime('k2', () => stop);
    releaseA();
    releaseA();
    expect(stop).not.toHaveBeenCalled();
    releaseB();
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it('different keys get different listeners', () => {
    const releases = [
      acquireRealtime('a', () => () => undefined),
      acquireRealtime('b', () => () => undefined),
    ];
    expect(activeRealtimeListenerCount()).toBe(2);
    releases.forEach((release) => release());
    expect(activeRealtimeListenerCount()).toBe(0);
  });

  it('reports errors to current and late subscribers', () => {
    let report: (error: unknown) => void = () => undefined;
    const early = vi.fn();
    const late = vi.fn();
    const release1 = acquireRealtime(
      'k3',
      (reportError) => {
        report = reportError;
        return () => undefined;
      },
      early,
    );
    report('boom');
    const release2 = acquireRealtime('k3', () => () => undefined, late);
    expect(early).toHaveBeenCalledWith('boom');
    expect(late).toHaveBeenCalledWith('boom');
    release1();
    release2();
  });

  it('restarts a fresh listener after full release', () => {
    const start = vi.fn(() => () => undefined);
    acquireRealtime('k4', start)();
    acquireRealtime('k4', start)();
    expect(start).toHaveBeenCalledTimes(2);
  });
});
