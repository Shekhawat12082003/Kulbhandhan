import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { User } from '../models/User';
import { AppError } from '../utils/errors';

declare global {
  namespace Express { interface Request { auth?: { userId: string; role: string } } }
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) return next(new AppError(401, 'UNAUTHENTICATED', 'Please log in.'));
  let p: any;
  try {
    p = jwt.verify(h.slice(7), env.JWT_SECRET);
  } catch {
    return next(new AppError(401, 'TOKEN_EXPIRED', 'Session expired.'));
  }
  try {
    const user = await User.findById(p.sub).select('moderationState');
    if (!user || user.moderationState !== 'active') return next(new AppError(403, 'ACCOUNT_RESTRICTED', 'Account unavailable.'));
    req.auth = { userId: p.sub, role: p.role };
    next();
  } catch (error) { next(error); }
}

export const requireRole = (...roles: string[]) => (req: Request, _res: Response, next: NextFunction) =>
  req.auth && roles.includes(req.auth.role) ? next() : next(new AppError(403, 'FORBIDDEN', 'Not allowed.'));
