import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import http from 'http';

const app = express();
const server = http.createServer(app);
const PORT = parseInt(process.env.PORT || '4000', 10);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', port: PORT, env: process.env.NODE_ENV });
});
app.get('/', (_req, res) => {
  res.json({ message: 'SyncSaga API', version: '1.0.0' });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
