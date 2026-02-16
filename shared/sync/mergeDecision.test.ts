import { describe, it, expect } from 'vitest';
import { compareRevisions, canPullWithoutConflict } from './mergeDecision';

describe('compareRevisions', () => {
  it('returns same when revisions equal', () => {
    const d = compareRevisions(5, 5);
    expect(d.kind).toBe('same');
    expect(d.remoteNewer).toBe(false);
    expect(d.localNewer).toBe(false);
    expect(d.same).toBe(true);
    expect(d.summary).toContain('in sync');
  });

  it('returns remote_newer when remote > local', () => {
    const d = compareRevisions(3, 7);
    expect(d.kind).toBe('remote_newer');
    expect(d.remoteNewer).toBe(true);
    expect(d.localNewer).toBe(false);
    expect(d.same).toBe(false);
    expect(d.summary).toContain('Remote is newer');
    expect(d.summary).toContain('7');
    expect(d.summary).toContain('3');
  });

  it('returns local_newer when local > remote', () => {
    const d = compareRevisions(10, 2);
    expect(d.kind).toBe('local_newer');
    expect(d.remoteNewer).toBe(false);
    expect(d.localNewer).toBe(true);
    expect(d.same).toBe(false);
    expect(d.summary).toContain('Local is newer');
    expect(d.summary).toContain('10');
    expect(d.summary).toContain('2');
  });

  it('handles zero revisions', () => {
    const d = compareRevisions(0, 0);
    expect(d.same).toBe(true);
  });

  it('handles local 0 remote 1', () => {
    const d = compareRevisions(0, 1);
    expect(d.kind).toBe('remote_newer');
  });
});

describe('canPullWithoutConflict', () => {
  it('returns true only when same revision', () => {
    expect(canPullWithoutConflict(5, 5)).toBe(true);
  });

  it('returns false when remote newer (conflict - user must choose)', () => {
    expect(canPullWithoutConflict(3, 7)).toBe(false);
  });

  it('returns false when local newer', () => {
    expect(canPullWithoutConflict(7, 3)).toBe(false);
  });
});
