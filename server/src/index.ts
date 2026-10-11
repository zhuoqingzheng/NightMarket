import { existsSync } from 'node:fs';
import { join } from 'node:path';
import express from 'express';
import { loadSession, requireMerchant } from './auth.ts';
import { CLIENT_DIST, PORT } from './config.ts';
import { errorHandler, HttpError } from './http.ts';
import { authRouter } from './routes/auth.ts';
import { bookingsRouter } from './routes/bookings.ts';
import { eventsRouter } from './routes/events.ts';
import { seedIfEmpty } from './seed.ts';

if (seedIfEmpty()) console.log('Seeded demo data.');

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '50kb' }));
app.use(loadSession);

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});
app.use('/api/auth', authRouter);
app.use('/api/events', requireMerchant, eventsRouter);
app.use('/api/bookings', requireMerchant, bookingsRouter);
app.use('/api', () => {
  throw new HttpError(404, 'NOT_FOUND', 'That endpoint doesn’t exist.');
});

// In production the API also serves the built React app (run `npm run build` first).
const indexHtml = join(CLIENT_DIST, 'index.html');
if (existsSync(indexHtml)) {
  app.use(express.static(CLIENT_DIST));
  app.use((req, res, next) => {
    if (req.method === 'GET' && req.accepts('html')) res.sendFile(indexHtml);
    else next();
  });
}

app.use(errorHandler);

app.listen(PORT, (error) => {
  if (error) throw error;
  console.log(`Night Market API ready on http://localhost:${PORT}`);
});
