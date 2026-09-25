/**
 * The one definition of a slot key: `roomId_date_slotId`.
 *
 * Example: `room-B205_2026-09-28_07:30-09:30`.
 * Same room + date + slot always produces the same key, so it identifies "this
 * room at this time" everywhere — duplicate checks, conflict marks, and (in the
 * production design) the `slotLocks/{slotKey}` document id. Never build the key
 * inline with a template string at a call site.
 */
export function buildSlotKey(roomId: string, date: string, slotId: string): string {
  return `${roomId}_${date}_${slotId}`;
}
