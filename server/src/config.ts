import { join } from 'node:path';

export const PORT = Number(process.env.PORT ?? 4000);

export const DB_PATH = process.env.DB_PATH ?? join(import.meta.dirname, '..', 'data', 'nightmarket.db');

export const CLIENT_DIST = join(import.meta.dirname, '..', '..', 'client', 'dist');
