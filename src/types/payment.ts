/**
 * Core type definitions for Stripe PayPlatform
 * Strict card-only $1.00 USD architecture
 */

export type Currency = 'usd';

export type OrderStatus = 'pending' | 'processing' | 'paid' | 'failed' | 'canceled';

export type PaymentStatus =
  | 'requires_payment_method'
  | 'requires_confirmation'
  | 'requires_action'
  | 'processing'
  | 'succeeded'
  | 'canceled'
  | 'failed';

export type PaymentStateMachineState =
  | 'IDLE'
  | 'CREATING_PAYMENT'
  | 'READY'
  | 'SUBMITTING'
  | 'REQUIRES_ACTION'
  | 'PROCESSING'
  | 'SUCCESS'
  | 'FAILED'
  | 'CANCELED';

export interface Product {
  id: string;
  name: string;
  description: string;
  price: 100; // Always 100 cents ($1.00 USD)
  currency: 'usd';
  features: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  productId: string;
  amount: 100; // Always 100 cents
  currency: 'usd';
  status: OrderStatus;
  stripePaymentIntentId?: string;
  customerEmail?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentRecord {
  id: string;
  orderId: string;
  orderNumber: string;
  stripePaymentIntentId: string;
  amount: 100;
  currency: 'usd';
  status: PaymentStatus;
  failureCode?: string;
  safeFailureMessage?: string;
  cardBrand?: string;
  cardLast4?: string;
  receiptUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StripeWebhookEventRecord {
  id: string;
  stripeEventId: string;
  eventType: string;
  processedAt: string;
  createdAt: string;
  payloadSummary?: {
    paymentIntentId?: string;
    status?: string;
    amount?: number;
  };
}

export interface CreatePaymentIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
  orderNumber: string;
  amount: 100;
  currency: 'usd';
  product: {
    id: string;
    name: string;
    description: string;
  };
  isMockSimulator?: boolean;
}

export interface PaymentStatusResponse {
  paymentIntentId: string;
  orderNumber: string;
  status: PaymentStatus;
  orderStatus: OrderStatus;
  amount: 100;
  currency: 'usd';
  cardBrand?: string;
  cardLast4?: string;
  failureCode?: string;
  safeFailureMessage?: string;
  updatedAt: string;
}

export interface AdminAnalyticsMetrics {
  totalOrders: number;
  successfulPayments: number;
  failedPayments: number;
  processingPayments: number;
  canceledPayments: number;
  totalRevenueCents: number; // in cents
  successRate: number; // percentage
  failureRate: number; // percentage
  recentPayments: PaymentRecord[];
  recentWebhookEvents: StripeWebhookEventRecord[];
  isPostgresConnected: boolean;
  stripeMode: 'live' | 'test' | 'simulator';
}
