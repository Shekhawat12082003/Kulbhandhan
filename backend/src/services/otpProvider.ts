import { env } from '../config/env';

export interface OtpProvider {
  send(identifier: string, code: string): Promise<void>;
}

/** Development only: logs the OTP to the server console. No SMS is sent. */
class MockOtpProvider implements OtpProvider {
  async send(identifier: string, code: string) {
    console.log(`[MOCK OTP] ${identifier} -> ${code}`);
  }
}

/** Replace with your SMS/email vendor (MSG91, Twilio, etc.) using OTP_PROVIDER_KEY. */
class LiveOtpProvider implements OtpProvider {
  async send(_identifier: string, _code: string): Promise<void> {
    throw new Error('Live OTP provider not configured');
  }
}

export const otpProvider: OtpProvider =
  env.OTP_PROVIDER === 'live' ? new LiveOtpProvider() : new MockOtpProvider();
