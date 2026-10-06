import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors';

export function notFound(_req: Request, res: Response) {
  res.status(404).json({ success: false, message: 'Route not found.', code: 'NOT_FOUND' });
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) return res.status(err.status).json({ success: false, message: err.message, code: err.code });
  if (err instanceof ZodError) return res.status(400).json({ success: false, message: 'Please check the details you entered.', code: 'VALIDATION_ERROR' });
  console.error(err); // never leak internals to the client
  res.status(500).json({ success: false, message: 'Something went wrong. Please try again.', code: 'INTERNAL_ERROR' });
}
