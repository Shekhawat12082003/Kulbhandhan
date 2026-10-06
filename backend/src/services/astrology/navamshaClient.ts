import { env } from '../../config/env';
import { AppError } from '../../utils/errors';

export type NavamshaResponse<T = unknown> = { statusCode: number; output: T };

let requestQueue = Promise.resolve();
let lastRequestStarted = 0;
const MIN_REQUEST_INTERVAL_MS = 320;

async function waitForRateLimit() {
  const waitMs = Math.max(0, lastRequestStarted + MIN_REQUEST_INTERVAL_MS - Date.now());
  if (waitMs > 0) await new Promise((resolve) => setTimeout(resolve, waitMs));
  lastRequestStarted = Date.now();
}

export async function navamshaPost<T = unknown>(path: string, body: unknown): Promise<NavamshaResponse<T>> {
  const apiKey = env.NAVAMSHA_API_KEY?.trim();
  if (!apiKey) throw new AppError(503, 'KUNDLI_PROVIDER_NOT_CONFIGURED', 'Add NAVAMSHA_API_KEY to the backend environment to calculate Kundli data.');

  const url = new URL(path.replace(/^\/+/, ''), `${env.NAVAMSHA_BASE_URL.replace(/\/+$/, '')}/`);
  if (url.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(url.hostname)) {
    throw new AppError(500, 'KUNDLI_PROVIDER_URL_INVALID', 'Navamsha API must use HTTPS.');
  }

  const run = requestQueue.then(async () => {
    await waitForRateLimit();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      const payload = await response.json().catch(() => null) as NavamshaResponse<T> | null;
      if (response.status === 401 || response.status === 403) {
        throw new AppError(503, 'NAVAMSHA_KEY_REJECTED', 'Navamsha rejected the backend API key. Check NAVAMSHA_API_KEY in backend/.env.');
      }
      if (response.status === 402) throw new AppError(503, 'ASTROLOGY_CREDITS_EXHAUSTED', 'The Navamsha account has no remaining calculation credits.');
      if (response.status === 429) throw new AppError(503, 'ASTROLOGY_RATE_LIMITED', 'Navamsha rate limit reached. Wait briefly, then try again.');
      if (!response.ok || !payload || payload.statusCode !== 200 || payload.output === undefined) {
        throw new AppError(502, 'ASTROLOGY_PROVIDER_ERROR', `Navamsha calculation failed (HTTP ${response.status}).`);
      }
      return payload;
    } catch (error) {
      if (error instanceof AppError) throw error;
      if (controller.signal.aborted) throw new AppError(504, 'ASTROLOGY_PROVIDER_TIMEOUT', 'Navamsha calculation timed out.');
      throw new AppError(502, 'ASTROLOGY_PROVIDER_UNAVAILABLE', 'Could not reach the Navamsha astrology service.');
    } finally { clearTimeout(timeout); }
  });
  requestQueue = run.then(() => undefined, () => undefined);
  return run;
}