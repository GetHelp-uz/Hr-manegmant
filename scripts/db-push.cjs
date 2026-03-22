/**
 * Database schema push script.
 * Runs drizzle-kit push to sync the schema with the database.
 * Designed to run at app startup on DigitalOcean before the API server starts.
 */
const { execSync } = require('child_process');
const path = require('path');

const dbDir = path.resolve(__dirname, '..', 'lib', 'db');

if (!process.env.DATABASE_URL) {
  console.error('[db-push] DATABASE_URL not set, skipping schema push');
  process.exit(0);
}

console.log('[db-push] Pushing database schema...');

try {
  execSync(
    'npx drizzle-kit push --force --dialect=postgresql --schema=./src/schema/*.ts',
    {
      cwd: dbDir,
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_TLS_REJECT_UNAUTHORIZED: '0',
      },
      timeout: 60000,
    }
  );
  console.log('[db-push] Schema pushed successfully!');
} catch (err) {
  console.error('[db-push] Schema push failed:', err.message);
  // Don't exit with error - let the server try to start anyway
  // The tables might already exist from a previous push
  console.log('[db-push] Continuing with server startup...');
}
