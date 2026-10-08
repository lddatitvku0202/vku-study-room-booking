/**
 * Mapping of Firebase error codes onto the app's own typed error codes.
 *
 * Pure: it works on the `code` string only, so it imports nothing from Firebase
 * and is unit-testable. The services layer extracts the code from the SDK error.
 */

import type { SessionErrorCode } from '@/types/session';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** The `code` of a Firebase error (or any error carrying a string `code`). */
export function errorCodeOf(error: unknown): string | undefined {
  if (isRecord(error) && typeof error['code'] === 'string') {
    return error['code'];
  }
  return undefined;
}

export function mapAuthErrorCode(code: string | undefined): SessionErrorCode {
  switch (code) {
    case 'auth/network-request-failed':
      return 'NETWORK';
    case 'auth/operation-not-allowed':
    case 'auth/admin-restricted-operation':
      return 'ANONYMOUS_AUTH_DISABLED';
    case 'auth/too-many-requests':
      return 'TOO_MANY_REQUESTS';
    default:
      return 'UNKNOWN';
  }
}
