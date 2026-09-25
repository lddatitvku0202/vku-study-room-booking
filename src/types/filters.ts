/**
 * Room discovery filter types.
 *
 * These describe *client* state (CLAUDE.md §5): what the user is currently
 * searching for. They are an input to in-memory filtering, never a data store.
 */

import type { Building, Equipment } from '@/types/room';

/**
 * Active search and filter criteria for the room list.
 *
 * `building` and `minimumCapacity` are explicitly `| undefined` rather than
 * plain optional: the project compiles with `exactOptionalPropertyTypes`, so
 * without it, clearing a filter with `{ building: undefined }` would be a type
 * error and callers would be forced to rebuild the object to omit the key.
 *
 * An empty `search` and an empty `equipment` array mean "no constraint", so
 * neither needs to be optional.
 */
export interface RoomFilters {
  readonly search: string;
  readonly building?: Building | undefined;
  readonly minimumCapacity?: number | undefined;
  readonly equipment: readonly Equipment[];
}
