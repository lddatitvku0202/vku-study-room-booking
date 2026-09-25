/**
 * Room catalogue domain types.
 *
 * Pure TypeScript — no Firebase, no React, no I/O. Firestore documents are
 * mapped onto these types inside `src/services`, never the other way around.
 */

/** VKU building a room belongs to. */
export type Building = 'A' | 'B' | 'C' | 'V';

/** Equipment a room can provide. Used for filtering. */
export type Equipment = 'Projector' | 'Whiteboard' | 'High-spec PC' | 'AC';

/**
 * A bookable study room or computer lab.
 *
 * Rooms are static catalogue data owned by the server, so every field is
 * `readonly`: the client renders a room, it never mutates one.
 *
 * A room carries **no** availability field. Whether a room is free right now is
 * derived from active slot locks at render time (see CLAUDE.md §7).
 */
export interface Room {
  readonly id: string;
  readonly name: string;
  readonly building: Building;
  readonly floor: number;
  readonly capacity: number;
  readonly equipment: readonly Equipment[];
  readonly image: string;
}
