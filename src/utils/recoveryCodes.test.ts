import { describe, it, expect } from 'vitest';
import { parseRecoveryCodesFromFile } from './recoveryCodes';

describe('parseRecoveryCodesFromFile', () => {
  it('parses one code per line', () => {
    const text = 'abc123\nxyz789\ndef456';
    const { codes, rawCount, duplicateCount } = parseRecoveryCodesFromFile(text);
    expect(codes).toEqual(['abc123', 'xyz789', 'def456']);
    expect(rawCount).toBe(3);
    expect(duplicateCount).toBe(0);
  });

  it('skips header lines', () => {
    const text = 'Recovery codes:\nabc123\nBackup codes:\ndef456';
    const { codes } = parseRecoveryCodesFromFile(text);
    expect(codes).toEqual(['abc123', 'def456']);
  });

  it('strips numbered prefixes (1. and 1))', () => {
    const text = '1. abc123\n2) xyz789';
    const { codes } = parseRecoveryCodesFromFile(text);
    expect(codes).toEqual(['abc123', 'xyz789']);
  });

  it('handles comma-separated codes', () => {
    const text = 'abc123, xyz789, def456';
    const { codes } = parseRecoveryCodesFromFile(text);
    expect(codes).toEqual(['abc123', 'xyz789', 'def456']);
  });

  it('skips duplicates', () => {
    const text = 'abc123\nabc123\nabc123';
    const { codes, rawCount, duplicateCount } = parseRecoveryCodesFromFile(text);
    expect(codes).toEqual(['abc123']);
    expect(rawCount).toBe(3);
    expect(duplicateCount).toBe(2);
  });

  it('skips lines shorter than 4 chars', () => {
    const text = 'abc\nab12';
    const { codes } = parseRecoveryCodesFromFile(text);
    expect(codes).toEqual(['ab12']);
  });

  it('skips comment lines', () => {
    const text = '# comment\nabc123';
    const { codes } = parseRecoveryCodesFromFile(text);
    expect(codes).toEqual(['abc123']);
  });

  it('normalizes whitespace in codes', () => {
    const text = 'ab c1 23';
    const { codes } = parseRecoveryCodesFromFile(text);
    expect(codes).toEqual(['abc123']);
  });

  it('allows alphanumeric and hyphen', () => {
    const text = 'abcd-1234\nXYZ9-wxyz';
    const { codes } = parseRecoveryCodesFromFile(text);
    expect(codes).toEqual(['abcd-1234', 'XYZ9-wxyz']);
  });
});
