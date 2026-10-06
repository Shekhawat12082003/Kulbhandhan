import assert from 'node:assert/strict';
import { test } from 'node:test';

process.env.MONGODB_URI ??= 'mongodb://127.0.0.1:27017/kulbandhan-test';
process.env.JWT_SECRET ??= 'test-access-secret';
process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret';
process.env.NAVAMSHA_API_KEY = 'test-key-not-for-production';
process.env.KUNDLI_DATA_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');

test('Kundli data is encrypted and round-trips without exposing plaintext', async () => {
  const { encryptKundliData, decryptKundliData, hashKundliData } = await import('../../utils/secureKundliData');
  const input = { birthTime: '08:30:00', latitude: 26.9124, longitude: 75.7873 };
  const encrypted = encryptKundliData(input);
  assert.equal(JSON.stringify(encrypted).includes('08:30:00'), false);
  assert.deepEqual(decryptKundliData<typeof input>(encrypted), input);
  assert.equal(hashKundliData(input), hashKundliData(input));
});

test('Navamsha client sends the key only in the backend request header', async () => {
  const { navamshaPost } = await import('./navamshaClient');
  const originalFetch = globalThis.fetch;
  let requestHeaders: Headers | undefined;
  try {
    globalThis.fetch = async (_input, init) => {
      requestHeaders = new Headers(init?.headers);
      return new Response(JSON.stringify({ statusCode: 200, output: { engine: 'test' } }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      });
    };
    const response = await navamshaPost('/api/v1/kundali/basic', { year: 1995 });
    assert.equal(response.statusCode, 200);
    assert.equal(requestHeaders?.get('X-API-Key'), 'test-key-not-for-production');
    assert.equal(requestHeaders?.get('Content-Type'), 'application/json');
  } finally { globalThis.fetch = originalFetch; }
});