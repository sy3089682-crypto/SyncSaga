import dotenv from 'dotenv';
dotenv.config();

import express from 'express';

const app = express();
const PORT = parseInt(process.env.PORT || '4000', 10);

// Test workspace imports
app.get('/test-imports', async (_req, res) => {
  const results: Record<string, any> = {};
  try { const m = await import('@syncsaga/config'); results.config = 'ok'; } catch(e: any) { results.config = e.message; }
  try { const m = await import('@syncsaga/shared'); results.shared = 'ok'; } catch(e: any) { results.shared = e.message; }
  try { const m = await import('@syncsaga/db'); results.db = 'ok'; } catch(e: any) { results.db = e.message; }
  res.json(results);
});

app.get('/health', (_req, res) => {
  const env = process.env;
  res.json({
    status: 'ok',
    port: PORT,
    hasSupabaseUrl: !!env.SUPABASE_URL,
    hasSupabaseKey: !!env.SUPABASE_SERVICE_KEY,
    hasJwtSecret: !!env.JWT_SECRET,
    hasRedisUrl: !!env.REDIS_URL,
  });
});

app.listen(PORT, () => {
  console.log(`listening on port ${PORT}`);
});
