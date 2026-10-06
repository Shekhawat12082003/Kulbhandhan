export const CATALOG = {
  premium_1m: { amountPaise: 49900, label: 'Premium — 1 month', days: 30 },
  premium_3m: { amountPaise: 129900, label: 'Premium — 3 months', days: 90 },
  profile_unlock: { amountPaise: 9900, label: 'Unlock detailed profile' },
} as const;
export type Product = keyof typeof CATALOG;
