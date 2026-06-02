import dotenv from 'dotenv';
dotenv.config();

import express from 'express';

const app = express();
const PORT = parseInt(process.env.PORT || '4000', 10);

app.get('/test-dynamic', async (_req, res) => {
  const results: Record<string, any> = {};
  try { const m = await import('@syncsaga/config'); results.config = 'ok'; } catch(e: any) { results.config = e.message; }
  try { const m = await import('@syncsaga/shared'); results.shared = 'ok'; } catch(e: any) { results.shared = e.message; }
  try { const m = await import('@syncsaga/db'); results.db = 'ok'; } catch(e: any) { results.db = e.message; }
  res.json(results);
});

app.get('/test-static', (_req, res) => {
  let config: any, shared: any, db: any;
  const results: Record<string, any> = {};
  try { config = require('@syncsaga/config'); results.config = 'ok'; } catch(e: any) { results.config = e.message; }
  try { shared = require('@syncsaga/shared'); results.shared = 'ok'; } catch(e: any) { results.shared = e.message; }
  try { db = require('@syncsaga/db'); results.db = 'ok'; } catch(e: any) { results.db = e.message; }
  res.json(results);
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', port: PORT });
});

app.listen(PORT, () => {
  console.log(`listening on port ${PORT}`);
});
