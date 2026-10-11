import type { ErrorCode, ErrorResponse } from '@night-market/shared';
import type { ErrorRequestHandler, Request, Response } from 'express';

export class HttpError extends Error {
  readonly status: number;
  readonly code: ErrorCode;

  constructor(status: number, code: ErrorCode, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function sendError(res: Response<ErrorResponse>, status: number, code: ErrorCode, message: string): void {
  res.status(status).json({ error: message, code });
}

/** express.json() rejects a malformed body with an error of this type. */
function isMalformedJson(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'type' in error && error.type === 'entity.parse.failed';
}

export const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
  if (error instanceof HttpError) {
    sendError(res, error.status, error.code, error.message);
  } else if (isMalformedJson(error)) {
    sendError(res, 400, 'BAD_JSON', 'That request body was not valid JSON.');
  } else {
    console.error(error);
    sendError(res, 500, 'INTERNAL', 'Something went wrong on our side. Please try again.');
  }
};

/** A request body before validation: the fields of `T`, each of unknown type until it's checked. */
export type Unvalidated<T> = { [K in keyof T]?: unknown };

/**
 * The JSON body, keyed by its request type from the API contract, so reading a field
 * the contract doesn't have is a type error. Every value still has to be validated.
 */
export function bodyOf<T>(req: Request): Unvalidated<T> {
  const body: unknown = req.body;
  return (typeof body === 'object' && body !== null ? body : {}) as Unvalidated<T>;
}

interface StringRules {
  min?: number;
  max?: number;
  optional?: boolean;
  trim?: boolean;
}

export function readString(raw: unknown, label: string, rules: StringRules = {}): string {
  const { min = 1, max = 120, optional = false, trim = true } = rules;
  const value = typeof raw === 'string' ? (trim ? raw.trim() : raw) : '';

  if (value.length === 0) {
    if (optional) return '';
    throw new HttpError(400, 'INVALID_INPUT', `${label} is required.`);
  }
  if (value.length < min) {
    throw new HttpError(400, 'INVALID_INPUT', `${label} must be at least ${min} characters.`);
  }
  if (value.length > max) {
    throw new HttpError(400, 'INVALID_INPUT', `${label} must be ${max} characters or fewer.`);
  }
  return value;
}

export function readId(raw: unknown, label: string): number {
  const value = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : Number.NaN;
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new HttpError(400, 'INVALID_INPUT', `A valid ${label} is required.`);
  }
  return value;
}
