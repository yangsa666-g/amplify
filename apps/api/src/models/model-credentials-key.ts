import * as crypto from 'crypto';

/**
 * Convert configured Base64 key material into the fixed 32-byte key required by
 * AES-256-GCM. Values with at least 256 bits of entropy are accepted; longer
 * values are deterministically reduced with SHA-256.
 */
export function decodeModelCredentialsKey(value: unknown): Buffer | null {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw || raw.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(raw)) return null;

  const decoded = Buffer.from(raw, 'base64');
  if (decoded.length < 32 || decoded.toString('base64') !== raw) return null;
  return decoded.length === 32 ? decoded : crypto.createHash('sha256').update(decoded).digest();
}
