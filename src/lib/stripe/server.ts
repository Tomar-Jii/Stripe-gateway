import Stripe from 'stripe';

/**
 * Centralized Server-Side Stripe Service
 * SERVER-ONLY: Never import this file into browser / client components.
 * Strict Card-Only $1.00 USD enforcement.
 */

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

export const isStripeConfigured = Boolean(stripeSecretKey && stripeSecretKey.length > 5);
export const isLiveMode = stripeSecretKey.startsWith('sk_live_');
export const isTestMode = stripeSecretKey.startsWith('sk_test_');

let stripeClient: Stripe | null = null;

if (isStripeConfigured) {
  stripeClient = new Stripe(stripeSecretKey, {
    apiVersion: '2025-02-24.acacia' as Stripe.LatestApiVersion,
    typescript: true,
    appInfo: {
      name: 'Stripe PayPlatform Card Gateway',
      version: '1.0.0',
    },
  });
}

export function getStripeClient(): Stripe {
  if (!stripeClient) {
    throw new Error(
      'Stripe Secret Key is not configured. Please set STRIPE_SECRET_KEY in environment variables.'
    );
  }
  return stripeClient;
}

export interface CreatePaymentIntentOptions {
  orderId: string;
  orderNumber: string;
  productId: string;
  customerEmail?: string;
  idempotencyKey?: string;
}

/**
 * Create PaymentIntent strictly configured for Card Payments only and exactly $1.00 USD.
 */
export async function createCardPaymentIntent(options: CreatePaymentIntentOptions) {
  const { orderId, orderNumber, productId, customerEmail, idempotencyKey } = options;

  // If Stripe key is configured, use real Stripe SDK
  if (stripeClient) {
    const params: Stripe.PaymentIntentCreateParams = {
      amount: 100, // strictly 100 cents ($1.00 USD)
      currency: 'usd',
      // CRITICAL: Strictly restrict to card payment methods only.
      payment_method_types: ['card'],
      receipt_email: customerEmail,
      metadata: {
        orderId,
        orderNumber,
        productId,
        environment: isLiveMode ? 'production' : 'test',
        rule: 'card_only_100_usd',
      },
      description: `Order ${orderNumber} - Card Payment ($1.00 USD)`,
    } as any;

    const requestOptions: Stripe.RequestOptions = {};
    if (idempotencyKey) {
      requestOptions.idempotencyKey = idempotencyKey;
    }

    const paymentIntent = await stripeClient.paymentIntents.create(params, requestOptions);

    return {
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret as string,
      status: paymentIntent.status,
      isMockSimulator: false,
    };
  }

  // Safe developer sandbox simulation mode when STRIPE_SECRET_KEY is not yet injected
  const simulatedPiId = `pi_sim_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const simulatedSecret = `${simulatedPiId}_secret_${Math.random().toString(36).substring(2, 12)}`;

  return {
    paymentIntentId: simulatedPiId,
    clientSecret: simulatedSecret,
    status: 'requires_payment_method',
    isMockSimulator: true,
  };
}

/**
 * Retrieve PaymentIntent securely from Stripe
 */
export async function retrievePaymentIntent(paymentIntentId: string) {
  if (!stripeClient) {
    return null;
  }
  return await stripeClient.paymentIntents.retrieve(paymentIntentId);
}

/**
 * Construct and verify Stripe webhook event using raw body buffer
 */
export function verifyAndConstructWebhookEvent(rawBody: string | Buffer, signature: string): Stripe.Event {
  if (!stripeClient) {
    throw new Error('Stripe client not initialized');
  }
  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is missing. Cannot verify webhook signature.');
  }

  return stripeClient.webhooks.constructEvent(rawBody, signature, webhookSecret);
}

/**
 * Safe public configuration status (Never exposes secrets)
 */
export function getStripePublicConfig() {
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || process.env.VITE_STRIPE_PUBLISHABLE_KEY || '';
  return {
    isConfigured: isStripeConfigured,
    mode: isLiveMode ? 'live' : isTestMode ? 'test' : 'simulator',
    hasPublishableKey: Boolean(publishableKey && publishableKey.length > 5),
    hasSecretKey: isStripeConfigured,
    hasWebhookSecret: Boolean(webhookSecret && webhookSecret.length > 5),
    currency: 'usd',
    amount: 100,
    acceptedPaymentMethod: 'card_only',
  };
}
