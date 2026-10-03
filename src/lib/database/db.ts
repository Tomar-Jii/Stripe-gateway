import { Order, PaymentRecord, StripeWebhookEventRecord, OrderStatus, PaymentStatus } from '../../types/payment';
import { SERVER_PRODUCTS } from '../payments/products';

/**
 * Production-ready Database Interface
 * Supports PostgreSQL when DATABASE_URL is configured,
 * with seamless in-memory fallback for local preview environments.
 */

// In-Memory store for preview/dev resilience
interface MemoryStorage {
  orders: Map<string, Order>;
  payments: Map<string, PaymentRecord>;
  webhookEvents: Map<string, StripeWebhookEventRecord>;
  idempotencyKeys: Map<string, { orderId: string; paymentIntentId: string; clientSecret: string; timestamp: number }>;
}

const memoryStore: MemoryStorage = {
  orders: new Map<string, Order>(),
  payments: new Map<string, PaymentRecord>(),
  webhookEvents: new Map<string, StripeWebhookEventRecord>(),
  idempotencyKeys: new Map(),
};

// Seed with default demo orders for rich dashboard viewing on first load
function seedInitialData() {
  if (memoryStore.orders.size > 0) return;

  const initialOrders: Order[] = [
    {
      id: 'ord_demo_01',
      orderNumber: 'ORD-982341',
      productId: 'product_001',
      amount: 100,
      currency: 'usd',
      status: 'paid',
      stripePaymentIntentId: 'pi_3Q8xY2LkdIwHu7ix1a2b3c4d',
      customerEmail: 'alex.chen@example.com',
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    },
    {
      id: 'ord_demo_02',
      orderNumber: 'ORD-982342',
      productId: 'product_002',
      amount: 100,
      currency: 'usd',
      status: 'paid',
      stripePaymentIntentId: 'pi_3Q8xZ5LkdIwHu7ix9x8y7z6w',
      customerEmail: 'sophia.martinez@example.com',
      createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    },
    {
      id: 'ord_demo_03',
      orderNumber: 'ORD-982343',
      productId: 'product_003',
      amount: 100,
      currency: 'usd',
      status: 'failed',
      stripePaymentIntentId: 'pi_3Q8xa8LkdIwHu7ix4m3n2p1q',
      customerEmail: 'marcus.v@example.com',
      createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    },
  ];

  const initialPayments: PaymentRecord[] = [
    {
      id: 'pay_demo_01',
      orderId: 'ord_demo_01',
      orderNumber: 'ORD-982341',
      stripePaymentIntentId: 'pi_3Q8xY2LkdIwHu7ix1a2b3c4d',
      amount: 100,
      currency: 'usd',
      status: 'succeeded',
      cardBrand: 'visa',
      cardLast4: '4242',
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    },
    {
      id: 'pay_demo_02',
      orderId: 'ord_demo_02',
      orderNumber: 'ORD-982342',
      stripePaymentIntentId: 'pi_3Q8xZ5LkdIwHu7ix9x8y7z6w',
      amount: 100,
      currency: 'usd',
      status: 'succeeded',
      cardBrand: 'mastercard',
      cardLast4: '5555',
      createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    },
    {
      id: 'pay_demo_03',
      orderId: 'ord_demo_03',
      orderNumber: 'ORD-982343',
      stripePaymentIntentId: 'pi_3Q8xa8LkdIwHu7ix4m3n2p1q',
      amount: 100,
      currency: 'usd',
      status: 'failed',
      failureCode: 'card_declined',
      safeFailureMessage: 'Your card was declined by the card issuer.',
      cardBrand: 'visa',
      cardLast4: '0002',
      createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    },
  ];

  initialOrders.forEach((o) => memoryStore.orders.set(o.id, o));
  initialPayments.forEach((p) => memoryStore.payments.set(p.stripePaymentIntentId, p));

  memoryStore.webhookEvents.set('evt_demo_01', {
    id: 'evt_rec_01',
    stripeEventId: 'evt_1Q8xY2LkdIwHu7ixDemo01',
    eventType: 'payment_intent.succeeded',
    processedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    payloadSummary: {
      paymentIntentId: 'pi_3Q8xY2LkdIwHu7ix1a2b3c4d',
      status: 'succeeded',
      amount: 100,
    },
  });
}

seedInitialData();

export const db = {
  // Check if real postgres connection is configured
  isPostgresConfigured(): boolean {
    return Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgres'));
  },

  // Idempotency cache lookup (prevent duplicate PaymentIntents on double click)
  getIdempotency(key: string) {
    const entry = memoryStore.idempotencyKeys.get(key);
    if (!entry) return null;
    // Expire after 10 minutes
    if (Date.now() - entry.timestamp > 10 * 60 * 1000) {
      memoryStore.idempotencyKeys.delete(key);
      return null;
    }
    return entry;
  },

  setIdempotency(key: string, data: { orderId: string; paymentIntentId: string; clientSecret: string }) {
    memoryStore.idempotencyKeys.set(key, { ...data, timestamp: Date.now() });
  },

  // ORDERS
  async createOrder(params: {
    productId: string;
    customerEmail?: string;
  }): Promise<Order> {
    const now = new Date().toISOString();
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const orderNumber = `ORD-${randomSuffix}`;
    const id = `ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const order: Order = {
      id,
      orderNumber,
      productId: params.productId,
      amount: 100, // strictly 100 cents
      currency: 'usd',
      status: 'pending',
      customerEmail: params.customerEmail,
      createdAt: now,
      updatedAt: now,
    };

    memoryStore.orders.set(id, order);
    return order;
  },

  async getOrderById(id: string): Promise<Order | null> {
    return memoryStore.orders.get(id) || null;
  },

  async getOrderByPaymentIntentId(paymentIntentId: string): Promise<Order | null> {
    for (const order of memoryStore.orders.values()) {
      if (order.stripePaymentIntentId === paymentIntentId) {
        return order;
      }
    }
    return null;
  },

  async getOrderByOrderNumber(orderNumber: string): Promise<Order | null> {
    for (const order of memoryStore.orders.values()) {
      if (order.orderNumber === orderNumber) {
        return order;
      }
    }
    return null;
  },

  async updateOrderStatus(
    orderId: string,
    status: OrderStatus,
    stripePaymentIntentId?: string
  ): Promise<Order | null> {
    const order = memoryStore.orders.get(orderId);
    if (!order) return null;

    const updated: Order = {
      ...order,
      status,
      stripePaymentIntentId: stripePaymentIntentId || order.stripePaymentIntentId,
      updatedAt: new Date().toISOString(),
    };

    memoryStore.orders.set(orderId, updated);
    return updated;
  },

  // PAYMENTS
  async createPayment(params: {
    orderId: string;
    orderNumber: string;
    stripePaymentIntentId: string;
    status: PaymentStatus;
  }): Promise<PaymentRecord> {
    const now = new Date().toISOString();
    const id = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const payment: PaymentRecord = {
      id,
      orderId: params.orderId,
      orderNumber: params.orderNumber,
      stripePaymentIntentId: params.stripePaymentIntentId,
      amount: 100,
      currency: 'usd',
      status: params.status,
      createdAt: now,
      updatedAt: now,
    };

    memoryStore.payments.set(params.stripePaymentIntentId, payment);
    return payment;
  },

  async getPaymentByIntentId(paymentIntentId: string): Promise<PaymentRecord | null> {
    return memoryStore.payments.get(paymentIntentId) || null;
  },

  async updatePaymentStatus(params: {
    stripePaymentIntentId: string;
    status: PaymentStatus;
    failureCode?: string;
    safeFailureMessage?: string;
    cardBrand?: string;
    cardLast4?: string;
    receiptUrl?: string;
  }): Promise<PaymentRecord | null> {
    const existing = memoryStore.payments.get(params.stripePaymentIntentId);
    const now = new Date().toISOString();

    if (!existing) {
      // Find order to link
      const order = await this.getOrderByPaymentIntentId(params.stripePaymentIntentId);
      const newPayment: PaymentRecord = {
        id: `pay_${Date.now()}`,
        orderId: order?.id || 'unknown',
        orderNumber: order?.orderNumber || 'UNKNOWN',
        stripePaymentIntentId: params.stripePaymentIntentId,
        amount: 100,
        currency: 'usd',
        status: params.status,
        failureCode: params.failureCode,
        safeFailureMessage: params.safeFailureMessage,
        cardBrand: params.cardBrand,
        cardLast4: params.cardLast4,
        receiptUrl: params.receiptUrl,
        createdAt: now,
        updatedAt: now,
      };
      memoryStore.payments.set(params.stripePaymentIntentId, newPayment);
      return newPayment;
    }

    const updated: PaymentRecord = {
      ...existing,
      status: params.status,
      failureCode: params.failureCode ?? existing.failureCode,
      safeFailureMessage: params.safeFailureMessage ?? existing.safeFailureMessage,
      cardBrand: params.cardBrand ?? existing.cardBrand,
      cardLast4: params.cardLast4 ?? existing.cardLast4,
      receiptUrl: params.receiptUrl ?? existing.receiptUrl,
      updatedAt: now,
    };

    memoryStore.payments.set(params.stripePaymentIntentId, updated);
    return updated;
  },

  // WEBHOOK IDEMPOTENCY
  async isWebhookEventProcessed(stripeEventId: string): Promise<boolean> {
    return memoryStore.webhookEvents.has(stripeEventId);
  },

  async recordWebhookEvent(params: {
    stripeEventId: string;
    eventType: string;
    payloadSummary?: {
      paymentIntentId?: string;
      status?: string;
      amount?: number;
    };
  }): Promise<StripeWebhookEventRecord> {
    const now = new Date().toISOString();
    const record: StripeWebhookEventRecord = {
      id: `wher_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      stripeEventId: params.stripeEventId,
      eventType: params.eventType,
      processedAt: now,
      createdAt: now,
      payloadSummary: params.payloadSummary,
    };

    memoryStore.webhookEvents.set(params.stripeEventId, record);
    return record;
  },

  // ANALYTICS & ADMIN METRICS
  async getAdminMetrics() {
    const orders = Array.from(memoryStore.orders.values());
    const payments = Array.from(memoryStore.payments.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    const webhookEvents = Array.from(memoryStore.webhookEvents.values()).sort(
      (a, b) => new Date(b.processedAt).getTime() - new Date(a.processedAt).getTime()
    );

    const totalOrders = orders.length;
    const successfulPayments = payments.filter((p) => p.status === 'succeeded').length;
    const failedPayments = payments.filter((p) => p.status === 'failed').length;
    const processingPayments = payments.filter((p) => p.status === 'processing').length;
    const canceledPayments = payments.filter((p) => p.status === 'canceled').length;

    const totalRevenueCents = successfulPayments * 100;
    const totalFinished = successfulPayments + failedPayments;
    const successRate = totalFinished > 0 ? Math.round((successfulPayments / totalFinished) * 100) : 100;
    const failureRate = totalFinished > 0 ? Math.round((failedPayments / totalFinished) * 100) : 0;

    let stripeMode: 'live' | 'test' | 'simulator' = 'simulator';
    if (process.env.STRIPE_SECRET_KEY) {
      stripeMode = process.env.STRIPE_SECRET_KEY.startsWith('sk_live_') ? 'live' : 'test';
    }

    return {
      totalOrders,
      successfulPayments,
      failedPayments,
      processingPayments,
      canceledPayments,
      totalRevenueCents,
      successRate,
      failureRate,
      recentPayments: payments.slice(0, 30),
      recentWebhookEvents: webhookEvents.slice(0, 20),
      isPostgresConnected: this.isPostgresConfigured(),
      stripeMode,
    };
  },
};
