import { Router, Request, Response, NextFunction } from 'express';
import * as c from '../controllers/authController';
import { requireAuth } from '../middleware/auth';
import { authLimiter, otpLimiter } from '../middleware/rateLimit';

const wrap = (fn: (req: Request, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req, res).catch(next);

const r = Router();
r.post('/otp/request', otpLimiter, wrap(c.requestOtp));
r.post('/register', authLimiter, wrap(c.register));
r.post('/login', authLimiter, wrap(c.login));
r.post('/refresh', authLimiter, wrap(c.refresh));
r.post('/logout', wrap(c.logout));
r.get('/me', requireAuth, wrap(c.me));
export default r;
