import { defineConfig } from 'prisma/config';
import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';

for (const envPath of ['.env', '../../.env']) {
  if (existsSync(envPath)) {
    loadEnvFile(envPath);
  }
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'node prisma/seed-runner.js',
  },
  datasource: {
    url: process.env['DATABASE_URL'] ?? '',
  },
});
