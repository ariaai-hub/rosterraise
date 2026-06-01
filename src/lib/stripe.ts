import Stripe from 'stripe';

let _stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    _stripe = new Stripe(key, {
      apiVersion: '2026-05-27.dahlia',
    });
  }
  return _stripe;
}

// Export a lazy-loading proxy that forwards all property access to the actual stripe instance
export default new Proxy({} as Stripe, {
  get(_target, prop) {
    const stripe = getStripe();
    const value = (stripe as any)[prop as string];
    if (typeof value === 'function') {
      return value.bind(stripe);
    }
    return value;
  },
});
