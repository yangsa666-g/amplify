/**
 * Formats a millisecond duration as a short, human-readable string.
 * Returns null for missing/invalid input so callers can omit it cleanly.
 *
 * Examples: 850 → "850ms", 31200 → "31.2s", 125000 → "2m 5s".
 */
export function formatDuration(ms: number | null | undefined): string | null {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return null;
  if (ms < 1000) return `${Math.round(ms)}ms`;

  const totalSeconds = ms / 1000;
  if (totalSeconds < 60) return `${totalSeconds.toFixed(1)}s`;

  const totalSec = Math.round(totalSeconds);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}m ${s}s`;
}
