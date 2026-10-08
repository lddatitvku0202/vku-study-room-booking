import { describe, expect, it } from 'vitest';

import { errorCodeOf, mapAuthErrorCode } from '@/utils/firebase-errors';

describe('errorCodeOf', () => {
  it('reads a string code', () => {
    expect(errorCodeOf({ code: 'auth/network-request-failed' })).toBe(
      'auth/network-request-failed',
    );
  });
  it('ignores anything without a string code', () => {
    expect(errorCodeOf(new Error('x'))).toBeUndefined();
    expect(errorCodeOf({ code: 42 })).toBeUndefined();
    expect(errorCodeOf(null)).toBeUndefined();
    expect(errorCodeOf('auth/x')).toBeUndefined();
  });
});

describe('mapAuthErrorCode', () => {
  it.each([
    ['auth/network-request-failed', 'NETWORK'],
    ['auth/operation-not-allowed', 'ANONYMOUS_AUTH_DISABLED'],
    ['auth/admin-restricted-operation', 'ANONYMOUS_AUTH_DISABLED'],
    ['auth/too-many-requests', 'TOO_MANY_REQUESTS'],
    ['auth/internal-error', 'UNKNOWN'],
    [undefined, 'UNKNOWN'],
  ] as const)('%s → %s', (code, expected) => {
    expect(mapAuthErrorCode(code)).toBe(expected);
  });
});
