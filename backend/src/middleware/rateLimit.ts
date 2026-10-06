import rateLimit from 'express-rate-limit';

const opts = (windowMs: number, limit: number, message: string, code: string) => ({
  windowMs, limit, standardHeaders: true, legacyHeaders: false,
  message: { success: false, message, code },
});
export const apiLimiter = rateLimit(opts(60_000, 120, 'Too many requests.', 'RATE_LIMITED'));
export const otpLimiter = rateLimit(opts(600_000, 5, 'Too many code requests. Try again later.', 'OTP_RATE_LIMITED'));
export const authLimiter = rateLimit(opts(600_000, 20, 'Too many attempts. Try again later.', 'RATE_LIMITED'));
