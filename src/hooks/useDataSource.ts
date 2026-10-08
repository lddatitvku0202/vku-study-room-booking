import { dataSource } from '@/services/config';

import type { DataSource } from '@/types/config';

/**
 * Which data source this build runs on (AD-37). A build-time constant, exposed as
 * a hook so screens can label data honestly without importing services.
 */
export function useDataSource(): DataSource {
  return dataSource;
}
