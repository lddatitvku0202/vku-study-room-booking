/**
 * Errors about the data-source switch (AD-37). Pure: no React, no Firebase.
 */

/** A firebase-mode code path was reached in a build that is not in firebase mode. */
export class FirebaseModeRequiredError extends Error {
  public override readonly name = 'FirebaseModeRequiredError';

  constructor() {
    super('This operation needs DATA_SOURCE=firebase; the app is running in mock mode.');
  }
}
