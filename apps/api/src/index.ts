import dotenv from 'dotenv';
dotenv.config();

import express from 'express';

const app = express();
const PORT = parseInt(process.env.PORT || '4000', 10);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', env: process.env.NODE_ENV });
});
app.get('/', (_req, res) => {
  res.json({ service: 'syncsaga-api', version: '1.0.0' });
});

app.listen(PORT, () => {
  console.log(`listening on port ${PORT}`);
});
