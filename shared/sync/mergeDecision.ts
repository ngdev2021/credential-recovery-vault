/**
 * Conflict / merge decision logic. Pure functions for comparing revisions.
 * No auto-overwrite - caller must prompt user for merge/replace.
 */

export type ConflictKind = 'remote_newer' | 'local_newer' | 'same' | 'unknown';

export interface MergeDecision {
  kind: ConflictKind;
  /** True if remote revision is strictly greater than local. */
  remoteNewer: boolean;
  /** True if local revision is strictly greater than remote. */
  localNewer: boolean;
  /** True if revisions are equal (no conflict). */
  same: boolean;
  /** Human-readable summary for UI. */
  summary: string;
}

/**
 * Compares local and remote revisions. Returns a MergeDecision describing
 * the relationship. Does NOT perform any merge - caller decides action.
 */
export function compareRevisions(
  localRevision: number,
  remoteRevision: number
): MergeDecision {
  if (localRevision === remoteRevision) {
    return {
      kind: 'same',
      remoteNewer: false,
      localNewer: false,
      same: true,
      summary: 'Local and remote are in sync',
    };
  }
  if (remoteRevision > localRevision) {
    return {
      kind: 'remote_newer',
      remoteNewer: true,
      localNewer: false,
      same: false,
      summary: `Remote is newer (${remoteRevision} vs local ${localRevision})`,
    };
  }
  return {
    kind: 'local_newer',
    remoteNewer: false,
    localNewer: true,
    same: false,
    summary: `Local is newer (${localRevision} vs remote ${remoteRevision})`,
  };
}

/**
 * Determine if a pull should proceed without user confirmation.
 * Returns true only when remote is same or newer and we have no local changes
 * (i.e. safe to overwrite). For any conflict, returns false - user must choose.
 */
export function canPullWithoutConflict(
  localRevision: number,
  remoteRevision: number
): boolean {
  const decision = compareRevisions(localRevision, remoteRevision);
  return decision.same;
}
