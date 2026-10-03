import { loadStripe, Stripe } from '@stripe/stripe-js';

/**
 * Client-Side Stripe Initializer
 * Uses only the public publishable key.
 * NEVER imports or exposes secret keys.
 */

let stripePromise: Promise<Stripe | null> | null = null;

export function getClientStripe(customPublishableKey?: string): Promise<Stripe | null> {
  const publishableKey =
    customPublishableKey ||
    (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY : undefined) ||
    (typeof import.meta !== 'undefined' ? (import.meta as any).env?.VITE_STRIPE_PUBLISHABLE_KEY : undefined) ||
    '';

  if (!publishableKey || !publishableKey.startsWith('pk_')) {
    return Promise.resolve(null);
  }

  if (!stripePromise) {
    stripePromise = loadStripe(publishableKey);
  }

  return stripePromise;
}
