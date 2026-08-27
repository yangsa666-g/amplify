import { defineConfig } from 'prisma/config';
import { normalizeDatabaseUrl } from './src/config/database-url';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'node prisma/seed-runner.js',
  },
  datasource: {
    url: normalizeDatabaseUrl(process.env['DATABASE_URL'] ?? ''),
  },
});
