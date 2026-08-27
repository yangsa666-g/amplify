import { describe, expect, it } from 'vitest';
import { normalizeDatabaseUrl } from './database-url';

describe('normalizeDatabaseUrl', () => {
  it('uses the certificate-valid hostname for Azure PostgreSQL Private Endpoints', () => {
    expect(
      normalizeDatabaseUrl(
        'postgresql://user:password@dev-amplify-pg.privatelink.postgres.database.azure.com:5432/app?sslmode=require',
      ),
    ).toBe(
      'postgresql://user:password@dev-amplify-pg.postgres.database.azure.com:5432/app?sslmode=require',
    );
  });

  it('removes a trailing dot from an Azure private-link hostname', () => {
    expect(
      normalizeDatabaseUrl(
        'postgresql://user:password@dev-amplify-pg.privatelink.postgres.database.azure.com.:5432/app',
      ),
    ).toBe('postgresql://user:password@dev-amplify-pg.postgres.database.azure.com:5432/app');
  });

  it('leaves regular PostgreSQL URLs unchanged', () => {
    const databaseUrl = 'postgresql://user:password@localhost:5432/app?sslmode=require';
    expect(normalizeDatabaseUrl(databaseUrl)).toBe(databaseUrl);
  });
});
