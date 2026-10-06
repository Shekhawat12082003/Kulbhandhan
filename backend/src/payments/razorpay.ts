import { createHmac } from 'crypto';
import { env } from '../config/env';
import { AppError } from '../utils/errors';

export interface RazorpayGateway {
  createOrder(amountPaise: number, currency: string, receipt: string): Promise<{ id: string }>;
  verifySignature(orderId: string, paymentId: string, signature: string): boolean;
  verifyWebhookSignature(rawBody: string, signature: string): boolean;
}

/** DEVELOPMENT ONLY. Creates local order ids; never confirms a real payment. */
class MockRazorpayGateway implements RazorpayGateway {
  async createOrder(_amountPaise: number, _currency: string, receipt: string) {
    return { id: `order_mock_${receipt}_${Date.now()}` };
  }
  verifySignature() { return false; } // force explicit dev-confirm endpoint instead of pretending success
  verifyWebhookSignature() { return false; }
}

class LiveRazorpayGateway implements RazorpayGateway {
  private base = 'https://api.razorpay.com/v1';
  private auth() {
    const token = Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString('base64');
    return { Authorization: `Basic ${token}`, 'Content-Type': 'application/json' };
  }
  async createOrder(amountPaise: number, currency: string, receipt: string) {
    const res = await fetch(`${this.base}/orders`, { method: 'POST', headers: this.auth(), body: JSON.stringify({ amount: amountPaise, currency, receipt }) });
    if (!res.ok) throw new AppError(502, 'PAYMENT_GATEWAY_ERROR', 'Could not create payment order.');
    return res.json();
  }
  verifySignature(orderId: string, paymentId: string, signature: string) {
    const expected = createHmac('sha256', env.RAZORPAY_KEY_SECRET!).update(`${orderId}|${paymentId}`).digest('hex');
    return expected === signature;
  }
  verifyWebhookSignature(rawBody: string, signature: string) {
    const expected = createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET!).update(rawBody).digest('hex');
    return expected === signature;
  }
}

export const razorpay: RazorpayGateway = env.RAZORPAY_PROVIDER === 'live' ? new LiveRazorpayGateway() : new MockRazorpayGateway();
