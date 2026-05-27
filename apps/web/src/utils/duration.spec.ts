import { describe, it, expect } from 'vitest';
import { formatDuration } from './duration';

describe('formatDuration', () => {
  it('returns null for missing or invalid input', () => {
    expect(formatDuration(null)).toBeNull();
    expect(formatDuration(undefined)).toBeNull();
    expect(formatDuration(-5)).toBeNull();
    expect(formatDuration(NaN)).toBeNull();
  });

  it('formats sub-second durations as milliseconds', () => {
    expect(formatDuration(0)).toBe('0ms');
    expect(formatDuration(850)).toBe('850ms');
    expect(formatDuration(999)).toBe('999ms');
  });

  it('formats seconds with one decimal below a minute', () => {
    expect(formatDuration(1000)).toBe('1.0s');
    expect(formatDuration(31200)).toBe('31.2s');
    expect(formatDuration(59900)).toBe('59.9s');
  });

  it('formats minutes and seconds at/above a minute, without 60s overflow', () => {
    expect(formatDuration(60000)).toBe('1m 0s');
    expect(formatDuration(125000)).toBe('2m 5s');
    expect(formatDuration(119600)).toBe('2m 0s'); // rounds up cleanly, not "1m 60s"
  });
});
