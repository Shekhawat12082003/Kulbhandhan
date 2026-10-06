import { env } from '../config/env';
import { AppError } from '../utils/errors';

export interface UploadResult { url: string; publicId?: string; isMock: boolean }
export interface ImageStore {
  upload(base64DataUri: string, folder: string): Promise<UploadResult>;
  destroy(publicId: string): Promise<void>;
}

/** DEVELOPMENT ONLY: stores the image inline as a data URI. No external upload happens. */
class MockImageStore implements ImageStore {
  async upload(base64DataUri: string): Promise<UploadResult> { return { url: base64DataUri, isMock: true }; }
  async destroy(): Promise<void> { /* nothing to delete in mock mode */ }
}

class CloudinaryImageStore implements ImageStore {
  async upload(base64DataUri: string, folder: string): Promise<UploadResult> {
    const form = new URLSearchParams({ file: base64DataUri, upload_preset: env.CLOUDINARY_UPLOAD_PRESET ?? '', folder });
    const res = await fetch(`https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/upload`, { method: 'POST', body: form });
    if (!res.ok) throw new AppError(502, 'UPLOAD_FAILED', 'Could not upload image.');
    const json = await res.json();
    return { url: json.secure_url, publicId: json.public_id, isMock: false };
  }
  async destroy(publicId: string): Promise<void> {
    const ts = Math.floor(Date.now() / 1000);
    const { createHash } = await import('crypto');
    const signature = createHash('sha1').update(`public_id=${publicId}&timestamp=${ts}${env.CLOUDINARY_API_SECRET}`).digest('hex');
    await fetch(`https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/destroy`, {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ public_id: publicId, timestamp: String(ts), api_key: env.CLOUDINARY_API_KEY ?? '', signature }),
    });
  }
}

export const imageStore: ImageStore = env.CLOUDINARY_PROVIDER === 'live' ? new CloudinaryImageStore() : new MockImageStore();
