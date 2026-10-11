import type { LoginRequest, MeResponse, MerchantResponse, RegisterRequest } from '@night-market/shared';
import { type Request, type Response, Router } from 'express';
import { endSession, hashPassword, loadMerchant, startSession, verifyPassword } from '../auth.ts';
import { one, run, uniqueViolation } from '../db.ts';
import { bodyOf, HttpError, readString } from '../http.ts';

export const authRouter = Router();

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function readRegistration(req: Request): RegisterRequest {
  const body = bodyOf<RegisterRequest>(req);
  const registration: RegisterRequest = {
    contactName: readString(body.contactName, 'Your name', { max: 80 }),
    businessName: readString(body.businessName, 'Business name', { max: 80 }),
    cuisine: readString(body.cuisine, 'Cuisine', { max: 60, optional: true }),
    email: readString(body.email, 'Email', { max: 254 }).toLowerCase(),
    password: readString(body.password, 'Password', { min: 8, max: 200, trim: false }),
  };
  if (!EMAIL_PATTERN.test(registration.email)) {
    throw new HttpError(400, 'INVALID_INPUT', 'Please enter a valid email address.');
  }
  return registration;
}

function readCredentials(req: Request): LoginRequest {
  const body = bodyOf<LoginRequest>(req);
  return {
    email: readString(body.email, 'Email', { max: 254 }).toLowerCase(),
    password: readString(body.password, 'Password', { max: 200, trim: false }),
  };
}

authRouter.get('/me', (req, res: Response<MeResponse>) => {
  res.json({ merchant: req.merchant ?? null });
});

authRouter.post('/register', (req, res: Response<MerchantResponse>) => {
  const { contactName, businessName, cuisine, email, password } = readRegistration(req);

  let merchantId: number;
  try {
    const result = run(
      `INSERT INTO merchants (email, password_hash, contact_name, business_name, cuisine)
       VALUES (?, ?, ?, ?, ?)`,
      email,
      hashPassword(password),
      contactName,
      businessName,
      cuisine,
    );
    merchantId = Number(result.lastInsertRowid);
  } catch (error) {
    if (uniqueViolation(error)) {
      throw new HttpError(409, 'EMAIL_TAKEN', 'An account with that email already exists. Try signing in.');
    }
    throw error;
  }

  startSession(req, res, merchantId);
  res.status(201).json({ merchant: loadMerchant(merchantId) });
});

authRouter.post('/login', (req, res: Response<MerchantResponse>) => {
  const { email, password } = readCredentials(req);

  const account = one<{ id: number; passwordHash: string }>(
    'SELECT id, password_hash AS passwordHash FROM merchants WHERE email = ?',
    email,
  );
  if (!account || !verifyPassword(password, account.passwordHash)) {
    throw new HttpError(401, 'INVALID_CREDENTIALS', 'That email and password don’t match our records.');
  }

  startSession(req, res, account.id);
  res.json({ merchant: loadMerchant(account.id) });
});

authRouter.post('/logout', (req, res) => {
  endSession(req, res);
  res.status(204).end();
});
