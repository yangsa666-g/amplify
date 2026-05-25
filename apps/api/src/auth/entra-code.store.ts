import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; name: string; role: string; authProvider: string };
}

const TTL_MS = 60_000;

/**
 * Short-lived, single-use codes that hand the app's session tokens to the SPA
 * after the Entra callback, keeping tokens out of the redirect URL/history.
 *
 * In-memory by design: the API runs as a single process behind nginx
 * (Dockerfile.azure). Codes do not survive a restart and won't work across
 * multiple API instances — switch to a DB table or Redis if scaling out.
 */
@Injectable()
export class EntraCodeStore {
  private readonly store = new Map<string, { tokens: IssuedTokens; expiresAt: number }>();

  issue(tokens: IssuedTokens): string {
    this.evictExpired();
    const code = crypto.randomBytes(32).toString('hex');
    this.store.set(this.hash(code), { tokens, expiresAt: Date.now() + TTL_MS });
    return code;
  }

  consume(code: string): IssuedTokens | null {
    if (!code) return null;
    const key = this.hash(code);
    const entry = this.store.get(key);
    if (!entry) return null;
    this.store.delete(key); // single-use
    if (entry.expiresAt < Date.now()) return null;
    return entry.tokens;
  }

  private evictExpired() {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (entry.expiresAt < now) this.store.delete(key);
    }
  }

  private hash(code: string): string {
    return crypto.createHash('sha256').update(code).digest('hex');
  }
}
