import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import type { Merchant } from '@night-market/shared';
import type { NextFunction, Request, Response } from 'express';
import { nowIso, queryOne, execute } from './db.ts';
import { HttpError } from './http.ts';

declare global {
  namespace Express {
    interface Request {
      /** The signed-in merchant, attached by `loadSession`. */
      merchant?: Merchant;
    }
  }
}

const COOKIE_NAME = 'nm_session';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export const MERCHANT_COLUMNS =
  'm.id, m.email, m.contact_name AS contactName, m.business_name AS businessName, m.cuisine';

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 32);
  return `scrypt$${salt.toString('base64url')}$${hash.toString('base64url')}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, salt, hash] = stored.split('$');
  if (scheme !== 'scrypt' || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'base64url');
  const actual = scryptSync(password, Buffer.from(salt, 'base64url'), expected.length);
  return timingSafeEqual(actual, expected);
}

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

function readSessionCookie(req: Request): string | undefined {
  for (const part of (req.headers.cookie ?? '').split(';')) {
    const separator = part.indexOf('=');
    if (separator > 0 && part.slice(0, separator).trim() === COOKIE_NAME) {
      return part.slice(separator + 1).trim() || undefined;
    }
  }
  return undefined;
}

export function startSession(req: Request, res: Response, merchantId: number): void {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  execute('DELETE FROM sessions WHERE expires_at <= ?', nowIso());
  execute(
    'INSERT INTO sessions (token_hash, merchant_id, expires_at) VALUES (?, ?, ?)',
    sha256(token),
    merchantId,
    expiresAt.toISOString(),
  );
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: req.secure,
    expires: expiresAt,
    path: '/',
  });
}

export function endSession(req: Request, res: Response): void {
  const token = readSessionCookie(req);
  if (token) execute('DELETE FROM sessions WHERE token_hash = ?', sha256(token));
  res.clearCookie(COOKIE_NAME, { path: '/' });
}

/** Loads a merchant who must exist, such as one who has just registered or signed in. */
export function loadMerchant(id: number): Merchant {
  const merchant = queryOne<Merchant>(`SELECT ${MERCHANT_COLUMNS} FROM merchants m WHERE m.id = ?`, id);
  if (!merchant) throw new Error(`Merchant ${id} vanished mid-request.`);
  return merchant;
}

/** Attaches the signed-in merchant (if any) to the request. */
export function loadSession(req: Request, _res: Response, next: NextFunction): void {
  const token = readSessionCookie(req);
  if (token) {
    req.merchant = queryOne<Merchant>(
      `SELECT ${MERCHANT_COLUMNS}
         FROM sessions s
         JOIN merchants m ON m.id = s.merchant_id
        WHERE s.token_hash = ? AND s.expires_at > ?`,
      sha256(token),
      nowIso(),
    );
  }
  next();
}

export function requireMerchant(req: Request, _res: Response, next: NextFunction): void {
  currentMerchant(req);
  next();
}

export function currentMerchant(req: Request): Merchant {
  if (!req.merchant) {
    throw new HttpError(401, 'UNAUTHENTICATED', 'Please sign in to continue.');
  }
  return req.merchant;
}
