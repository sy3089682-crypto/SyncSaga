// Ensure required environment variables are set before any tests run
// This prevents module-level getEnv() calls from failing

const REQUIRED_ENV_VARS: Record<string, string> = {
  NODE_ENV: 'test',
  SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_SERVICE_KEY: 'test-service-key',
  JWT_SECRET: 'test-jwt-secret-with-at-least-32-chars!!',
  JWT_REFRESH_SECRET: 'test-refresh-secret-with-at-least-32-chars!!',
};

for (const [key, value] of Object.entries(REQUIRED_ENV_VARS)) {
  if (!process.env[key]) {
    process.env[key] = value;
  }
}
