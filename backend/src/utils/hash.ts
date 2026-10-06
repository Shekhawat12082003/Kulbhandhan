import { createHash, randomInt } from 'crypto';
export const sha256 = (v: string) => createHash('sha256').update(v).digest('hex');
export const makeOtp = () => String(randomInt(100000, 1000000));
