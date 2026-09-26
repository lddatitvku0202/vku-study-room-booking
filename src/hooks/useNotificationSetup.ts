import { useEffect } from 'react';

import { initializeNotifications } from '@/services/local-notifications';

/**
 * Loads and configures local notifications once at app start so a reminder is
 * shown even while the app is open. Does not ask for permission — that happens
 * only when a reminder is first needed.
 */
export function useNotificationSetup(): void {
  useEffect(() => {
    void initializeNotifications();
  }, []);
}
