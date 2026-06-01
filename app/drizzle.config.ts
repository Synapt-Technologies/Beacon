import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/database/schema.ts',
  out: './db/migrations',
  dialect: 'sqlite',
  dbCredentials: { url: './db/beacon.db' },
});