import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';

import { config } from './config.js';
import { db } from './db.js';
import { initWs } from './ws.js';
import { authRouter } from './routes/auth.js';
import { profileRouter } from './routes/profile.js';
import { feedRouter } from './routes/feed.js';
import { matchesRouter } from './routes/matches.js';
import { mockRouter } from './routes/mock.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (req, res) =>
  res.json({ ok: true, users: db.data.users.length, mode: 'mock' })
);

app.use('/api/auth', authRouter);
app.use('/api/profile', profileRouter);
app.use('/api/feed', feedRouter);
app.use('/api/matches', matchesRouter);
app.use('/api/mock', mockRouter);
app.use('/mock', mockRouter);

// Прод-режим: сервер отдаёт собранный фронтенд.
const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^(?!\/api|\/mock).*/, (req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'server_error', message: 'Внутренняя ошибка сервера' });
});

const server = http.createServer(app);
initWs(server);

server.listen(config.port, () => {
  console.log(`\n  Сервер: http://localhost:${config.port}`);
  console.log(`  Профилей в демо-базе: ${db.data.users.length}`);
  console.log('  Режим: имитация SberBusiness ID и GigaChat (внешних вызовов нет)\n');
});
