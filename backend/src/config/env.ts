import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  MONGODB_URI: z.string().min(1),
  JWT_SECRET: z.string().min(8),
  JWT_REFRESH_SECRET: z.string().min(8),
  OTP_PROVIDER: z.enum(['mock', 'live']).default('mock'),
  OTP_PROVIDER_KEY: z.string().optional(),
  NAVAMSHA_API_KEY: z.string().optional(),
  NAVAMSHA_BASE_URL: z.string().url().default('https://api.navamsha.in'),
  KUNDLI_DATA_ENCRYPTION_KEY: z.string().optional(),
  KUNDLI_AYANAMSHA: z.string().default('lahiri'),
  KUNDLI_NODE_TYPE: z.enum(['mean', 'true']).default('mean'),
  KUNDLI_OBSERVATION_POINT: z.enum(['topocentric', 'geocentric']).default('topocentric'),
  KUNDLI_ZODIAC_SYSTEM: z.enum(['sidereal']).default('sidereal'),
  KUNDLI_HOUSE_SYSTEM: z.enum(['whole_sign']).default('whole_sign'),
  KUNDLI_CALCULATION_METHOD: z.string().default('navamsha-engine'),
  RAZORPAY_PROVIDER: z.enum(['mock', 'live']).default('mock'),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  CLOUDINARY_PROVIDER: z.enum(['mock', 'live']).default('mock'),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  CLOUDINARY_UPLOAD_PRESET: z.string().optional(),
  AI_PROVIDER: z.enum(['mock', 'live']).default('mock'),
  ANTHROPIC_API_KEY: z.string().optional(),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}
export const env = parsed.data;
