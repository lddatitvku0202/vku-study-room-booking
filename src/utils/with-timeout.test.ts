import { describe, expect, it } from 'vitest';

import { withTimeout } from '@/utils/with-timeout';

const after = <T>(ms: number, value: T): Promise<T> =>
  new Promise((resolve) => {
    setTimeout(() => resolve(value), ms);
  });

describe('withTimeout', () => {
  it('passes a fast result through', async () => {
    expect(await withTimeout(after(5, 'done'), 200, () => 'late')).toBe('done');
  });

  it('reports the fallback when the promise is too slow', async () => {
    expect(await withTimeout(after(200, 'done'), 10, () => 'late')).toBe('late');
  });

  it('passes a fast rejection through', async () => {
    await expect(withTimeout(Promise.reject(new Error('boom')), 200, () => 'late')).rejects.toThrow(
      'boom',
    );
  });
});
