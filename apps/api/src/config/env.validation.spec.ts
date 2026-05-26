import { describe, it, expect } from 'vitest';
import { validateEnv } from './env.validation';

const base = {
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
  JWT_SECRET: 'a-sufficiently-long-secret-value',
};

describe('validateEnv', () => {
  it('passes with required vars present', () => {
    expect(() => validateEnv({ ...base, NODE_ENV: 'development' })).not.toThrow();
  });

  it('throws when DATABASE_URL is missing', () => {
    expect(() => validateEnv({ JWT_SECRET: base.JWT_SECRET })).toThrow(/DATABASE_URL/);
  });

  it('throws when JWT_SECRET is missing (no insecure default)', () => {
    expect(() => validateEnv({ DATABASE_URL: base.DATABASE_URL })).toThrow(/JWT_SECRET/);
  });

  it('rejects placeholder JWT_SECRET in production', () => {
    expect(() =>
      validateEnv({ ...base, JWT_SECRET: 'change-me-in-production', NODE_ENV: 'production' }),
    ).toThrow(/placeholder|default/i);
  });

  it('rejects too-short JWT_SECRET in production', () => {
    expect(() =>
      validateEnv({ DATABASE_URL: base.DATABASE_URL, JWT_SECRET: 'short', NODE_ENV: 'production' }),
    ).toThrow(/at least/i);
  });

  it('allows a weak-but-nonempty secret in development', () => {
    expect(() =>
      validateEnv({
        DATABASE_URL: base.DATABASE_URL,
        JWT_SECRET: 'dev-secret',
        NODE_ENV: 'development',
      }),
    ).not.toThrow();
  });
});
