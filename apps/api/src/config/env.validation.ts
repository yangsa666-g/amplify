/**
 * Fail-fast environment validation, run by ConfigModule at boot.
 *
 * The goal is to never silently fall back to an insecure default in a deployed
 * environment. Secrets that previously defaulted to `'dev-secret'` are now
 * required, and known weak/placeholder values are rejected in production.
 */

/** Placeholder/example values that must never be used as real secrets. */
const WEAK_SECRETS = new Set([
  'dev-secret',
  'change-me-in-production',
  'changeme',
  'secret',
  'password',
]);

const MIN_PROD_SECRET_LENGTH = 16;

function isProduction(env: Record<string, unknown>): boolean {
  return String(env.NODE_ENV ?? '').toLowerCase() === 'production';
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function validateEnv(env: Record<string, unknown>): Record<string, unknown> {
  const errors: string[] = [];
  const prod = isProduction(env);

  // ─── Always required ───────────────────────────────────────────────────────
  const databaseUrl = asString(env.DATABASE_URL);
  if (!databaseUrl) {
    errors.push('DATABASE_URL is required.');
  }

  const jwtSecret = asString(env.JWT_SECRET);
  if (!jwtSecret) {
    errors.push('JWT_SECRET is required (no insecure default is provided).');
  }

  const auditRetentionDays = asString(env.AUDIT_LOG_RETENTION_DAYS);
  if (auditRetentionDays) {
    const parsed = Number(auditRetentionDays);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 3650) {
      errors.push('AUDIT_LOG_RETENTION_DAYS must be an integer between 1 and 3650.');
    }
  }

  const modelCredentialsKey = asString(env.MODEL_CREDENTIALS_ENCRYPTION_KEY);
  if (modelCredentialsKey) {
    const validBase64 = /^[A-Za-z0-9+/]{43}=$/.test(modelCredentialsKey);
    if (!validBase64 || Buffer.from(modelCredentialsKey, 'base64').length !== 32) {
      errors.push('MODEL_CREDENTIALS_ENCRYPTION_KEY must be a Base64-encoded 32-byte key.');
    }
  }

  // ─── Stricter checks in production ───────────────────────────────────────────
  if (prod) {
    if (jwtSecret && WEAK_SECRETS.has(jwtSecret.toLowerCase())) {
      errors.push('JWT_SECRET must not be a placeholder/default value in production.');
    }
    if (jwtSecret && jwtSecret.length < MIN_PROD_SECRET_LENGTH) {
      errors.push(
        `JWT_SECRET must be at least ${MIN_PROD_SECRET_LENGTH} characters in production.`,
      );
    }

    const cookieSecret = asString(env.COOKIE_SECRET);
    if (cookieSecret && WEAK_SECRETS.has(cookieSecret.toLowerCase())) {
      errors.push('COOKIE_SECRET must not be a placeholder/default value in production.');
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `Invalid environment configuration:\n  - ${errors.join('\n  - ')}\n` +
        `See .env.example for the expected variables.`,
    );
  }

  return env;
}
