import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'crypto';
import { env } from '../config/env';
import { AppError } from './errors';

export type EncryptedPayload = { ciphertext: string; iv: string; authTag: string };

function encryptionKey() {
  const configured = env.KUNDLI_DATA_ENCRYPTION_KEY;
  if (!configured) throw new AppError(503, 'KUNDLI_STORAGE_NOT_CONFIGURED', 'Set KUNDLI_DATA_ENCRYPTION_KEY in the backend environment before saving Kundli data.');
  const key = Buffer.from(configured, 'base64');
  if (key.length !== 32) throw new AppError(500, 'KUNDLI_ENCRYPTION_KEY_INVALID', 'KUNDLI_DATA_ENCRYPTION_KEY must be a base64-encoded 32-byte key.');
  return key;
}

export function encryptKundliData(value: unknown): EncryptedPayload {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return { ciphertext: ciphertext.toString('base64'), iv: iv.toString('base64'), authTag: cipher.getAuthTag().toString('base64') };
}

export function decryptKundliData<T>(payload: EncryptedPayload): T {
  try {
    const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(payload.iv, 'base64'));
    decipher.setAuthTag(Buffer.from(payload.authTag, 'base64'));
    const clear = Buffer.concat([decipher.update(Buffer.from(payload.ciphertext, 'base64')), decipher.final()]).toString('utf8');
    return JSON.parse(clear) as T;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(500, 'KUNDLI_DATA_UNREADABLE', 'Stored Kundli data could not be decrypted. Check the backend encryption key.');
  }
}

export function hashKundliData(value: unknown) {
  return createHmac('sha256', encryptionKey()).update(JSON.stringify(value)).digest('hex');
}