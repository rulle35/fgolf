import Stripe from 'stripe'

// Lazy initialization to avoid build-time errors when env vars aren't set
let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-03-31.basil',
      typescript: true,
    })
  }
  return _stripe
}

// Lazy-evaluated export for backwards compat
export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (getStripe() as any)[prop]
  },
})

export const PRICES = {
  monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_MONTHLY!,
  annual: process.env.NEXT_PUBLIC_STRIPE_PRICE_ANNUAL!,
}
