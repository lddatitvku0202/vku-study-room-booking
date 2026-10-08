import { Alert, Platform } from 'react-native';

import type { AlertButton } from 'react-native';

/**
 * Cross-platform replacement for `Alert.alert` (AD-41).
 *
 * Native: exactly `Alert.alert` — same look, same buttons.
 * Web: react-native-web's `Alert.alert` is an empty function, so a notice would
 * silently vanish and a confirmation could never be accepted. On web this uses
 * the browser's own `alert()` / `confirm()` instead:
 * - a `cancel` button plus at least one other button → `confirm()`; OK runs the
 *   first non-cancel button, Cancel runs the cancel button;
 * - otherwise → `alert()`, then the first button's `onPress` (so an action such
 *   as "show alternatives" still happens after the notice is dismissed).
 *
 * The browser dialog cannot show custom button labels, so the web text names
 * what OK and Cancel will do.
 */
export function showDialog(
  title: string,
  message?: string,
  buttons: readonly AlertButton[] = [],
): void {
  if (Platform.OS !== 'web') {
    Alert.alert(title, message, buttons.length > 0 ? [...buttons] : undefined);
    return;
  }

  const body = message === undefined || message === '' ? title : `${title}\n\n${message}`;
  const cancel = buttons.find((button) => button.style === 'cancel');
  const action = buttons.find((button) => button.style !== 'cancel');

  if (cancel !== undefined && action !== undefined) {
    const accepted = window.confirm(
      `${body}\n\nOK: ${action.text ?? 'OK'} · Cancel: ${cancel.text ?? 'Cancel'}`,
    );
    (accepted ? action : cancel).onPress?.();
    return;
  }

  window.alert(body);
  (action ?? cancel)?.onPress?.();
}
