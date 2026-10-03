import { db } from '../database/db';
import { getProductById } from './products';
import { createCardPaymentIntent, retrievePaymentIntent, isStripeConfigured } from '../stripe/server';
import { normalizeStripeError } from './error-normalizer';
import { OrderStatus, PaymentStatus } from '../../types/payment';

export interface CreateIntentServiceParams {
  productId: string;
  customerEmail?: string;
  idempotencyKey?: string;
}

export const paymentsService = {
  /**
   * 1. Validate request and product.
   * 2. Load price from server-side catalog (enforcing 100 cents USD).
   * 3. Idempotency check.
   * 4. Create Order in database.
   * 5. Create PaymentIntent with Stripe (strictly card-only).
   * 6. Save Payment record in database.
   * 7. Return safe client secret and identifiers.
   */
  async createPaymentIntent(params: CreateIntentServiceParams) {
    const { productId, customerEmail, idempotencyKey } = params;

    // Server-side product lookup - NEVER trust client amounts!
    const product = getProductById(productId);
    if (!product) {
      throw new Error(`Product not found or inactive: ${productId}`);
    }

    // Idempotency check to prevent duplicate charges
    if (idempotencyKey) {
      const cached = db.getIdempotency(idempotencyKey);
      if (cached) {
        return {
          clientSecret: cached.clientSecret,
          paymentIntentId: cached.paymentIntentId,
          orderNumber: (await db.getOrderById(cached.orderId))?.orderNumber || 'ORD-CACHED',
          amount: 100 as const,
          currency: 'usd' as const,
          product: {
            id: product.id,
            name: product.name,
            description: product.description,
          },
          isCached: true,
        };
      }
    }

    // Create database Order (Status: pending)
    const order = await db.createOrder({
      productId: product.id,
      customerEmail,
    });

    // Create Stripe PaymentIntent with card-only configuration
    const stripeIntent = await createCardPaymentIntent({
      orderId: order.id,
      orderNumber: order.orderNumber,
      productId: product.id,
      customerEmail,
      idempotencyKey,
    });

    // Link payment intent to order
    await db.updateOrderStatus(order.id, 'pending', stripeIntent.paymentIntentId);

    // Create initial Payment Record
    await db.createPayment({
      orderId: order.id,
      orderNumber: order.orderNumber,
      stripePaymentIntentId: stripeIntent.paymentIntentId,
      status: 'requires_payment_method',
    });

    // Store idempotency token
    if (idempotencyKey) {
      db.setIdempotency(idempotencyKey, {
        orderId: order.id,
        paymentIntentId: stripeIntent.paymentIntentId,
        clientSecret: stripeIntent.clientSecret,
      });
    }

    return {
      clientSecret: stripeIntent.clientSecret,
      paymentIntentId: stripeIntent.paymentIntentId,
      orderNumber: order.orderNumber,
      amount: 100 as const,
      currency: 'usd' as const,
      product: {
        id: product.id,
        name: product.name,
        description: product.description,
      },
      isMockSimulator: stripeIntent.isMockSimulator,
    };
  },

  /**
   * Safe status check: Verifies server-side with Stripe and Database.
   * Never exposes raw secrets or sensitive payment details.
   */
  async getPaymentStatus(paymentIntentId: string) {
    let payment = await db.getPaymentByIntentId(paymentIntentId);
    let order = await db.getOrderByPaymentIntentId(paymentIntentId);

    // If Stripe is configured and payment is not already in a terminal state, sync with Stripe
    if (isStripeConfigured && (!payment || payment.status === 'processing' || payment.status === 'requires_action')) {
      try {
        const liveIntent = await retrievePaymentIntent(paymentIntentId);
        if (liveIntent) {
          const mapStatus: Record<string, PaymentStatus> = {
            succeeded: 'succeeded',
            processing: 'processing',
            requires_action: 'requires_action',
            requires_payment_method: 'requires_payment_method',
            requires_confirmation: 'requires_confirmation',
            canceled: 'canceled',
          };

          const newStatus = mapStatus[liveIntent.status] || 'processing';
          const cardDetails = (liveIntent as any).charges?.data?.[0]?.payment_method_details?.card;

          payment = await db.updatePaymentStatus({
            stripePaymentIntentId: paymentIntentId,
            status: newStatus,
            cardBrand: cardDetails?.brand,
            cardLast4: cardDetails?.last4,
          });

          if (order) {
            const orderStatus: OrderStatus = newStatus === 'succeeded' ? 'paid' : newStatus === 'canceled' ? 'canceled' : 'processing';
            order = await db.updateOrderStatus(order.id, orderStatus);
          }
        }
      } catch (err) {
        // Silently handle and fallback to DB state
      }
    }

    return {
      paymentIntentId,
      orderNumber: order?.orderNumber || payment?.orderNumber || 'UNKNOWN',
      status: payment?.status || 'processing',
      orderStatus: order?.status || 'pending',
      amount: 100 as const,
      currency: 'usd' as const,
      cardBrand: payment?.cardBrand,
      cardLast4: payment?.cardLast4,
      failureCode: payment?.failureCode,
      safeFailureMessage: payment?.safeFailureMessage,
      updatedAt: payment?.updatedAt || new Date().toISOString(),
    };
  },

  /**
   * Handle Webhook Event safely and idempotently
   */
  async handleWebhookEvent(event: {
    id: string;
    type: string;
    data: { object: any };
  }) {
    // 1. Webhook Deduplication / Idempotency Check
    const alreadyProcessed = await db.isWebhookEventProcessed(event.id);
    if (alreadyProcessed) {
      return { success: true, duplicated: true };
    }

    const paymentIntent = event.data.object;
    const paymentIntentId = paymentIntent?.id;

    if (!paymentIntentId) {
      await db.recordWebhookEvent({
        stripeEventId: event.id,
        eventType: event.type,
      });
      return { success: true, ignored: true };
    }

    // 2. Process based on Stripe Event Type
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const card = paymentIntent.charges?.data?.[0]?.payment_method_details?.card;
        const receiptUrl = paymentIntent.charges?.data?.[0]?.receipt_url;

        await db.updatePaymentStatus({
          stripePaymentIntentId: paymentIntentId,
          status: 'succeeded',
          cardBrand: card?.brand || 'visa',
          cardLast4: card?.last4 || '4242',
          receiptUrl,
        });

        const order = await db.getOrderByPaymentIntentId(paymentIntentId);
        if (order) {
          await db.updateOrderStatus(order.id, 'paid');
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const lastError = paymentIntent.last_payment_error;
        const normalized = normalizeStripeError(lastError);
        const card = lastError?.payment_method?.card;

        await db.updatePaymentStatus({
          stripePaymentIntentId: paymentIntentId,
          status: 'failed',
          failureCode: normalized.code,
          safeFailureMessage: normalized.message,
          cardBrand: card?.brand,
          cardLast4: card?.last4,
        });

        const order = await db.getOrderByPaymentIntentId(paymentIntentId);
        if (order) {
          await db.updateOrderStatus(order.id, 'failed');
        }
        break;
      }

      case 'payment_intent.processing': {
        await db.updatePaymentStatus({
          stripePaymentIntentId: paymentIntentId,
          status: 'processing',
        });
        const order = await db.getOrderByPaymentIntentId(paymentIntentId);
        if (order) {
          await db.updateOrderStatus(order.id, 'processing');
        }
        break;
      }

      case 'payment_intent.canceled': {
        await db.updatePaymentStatus({
          stripePaymentIntentId: paymentIntentId,
          status: 'canceled',
        });
        const order = await db.getOrderByPaymentIntentId(paymentIntentId);
        if (order) {
          await db.updateOrderStatus(order.id, 'canceled');
        }
        break;
      }

      default:
        // Ignore unhandled events safely
        break;
    }

    // 3. Mark webhook as processed in database
    await db.recordWebhookEvent({
      stripeEventId: event.id,
      eventType: event.type,
      payloadSummary: {
        paymentIntentId,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
      },
    });

    return { success: true, processed: true };
  },

  /**
   * Development sandbox simulation helper:
   * Enables realistic testing of test cards (4242, 3155, 0002, 9995, 0069, etc.)
   * without needing external API keys during dev review.
   */
  async simulatePaymentResult(paymentIntentId: string, action: string) {
    const order = await db.getOrderByPaymentIntentId(paymentIntentId);
    if (!order) {
      throw new Error(`Order not found for PaymentIntent: ${paymentIntentId}`);
    }

    switch (action) {
      case 'succeed': {
        await this.handleWebhookEvent({
          id: `evt_sim_${Date.now()}_succ`,
          type: 'payment_intent.succeeded',
          data: {
            object: {
              id: paymentIntentId,
              status: 'succeeded',
              amount: 100,
              charges: {
                data: [
                  {
                    payment_method_details: {
                      card: { brand: 'visa', last4: '4242' },
                    },
                    receipt_url: `https://pay.stripe.com/receipts/sim_${paymentIntentId}`,
                  },
                ],
              },
            },
          },
        });
        break;
      }

      case 'decline_generic': {
        await this.handleWebhookEvent({
          id: `evt_sim_${Date.now()}_fail`,
          type: 'payment_intent.payment_failed',
          data: {
            object: {
              id: paymentIntentId,
              status: 'failed',
              amount: 100,
              last_payment_error: {
                code: 'card_declined',
                decline_code: 'generic_decline',
                payment_method: { card: { brand: 'visa', last4: '0002' } },
              },
            },
          },
        });
        break;
      }

      case 'decline_insufficient_funds': {
        await this.handleWebhookEvent({
          id: `evt_sim_${Date.now()}_funds`,
          type: 'payment_intent.payment_failed',
          data: {
            object: {
              id: paymentIntentId,
              status: 'failed',
              amount: 100,
              last_payment_error: {
                code: 'card_declined',
                decline_code: 'insufficient_funds',
                payment_method: { card: { brand: 'visa', last4: '9995' } },
              },
            },
          },
        });
        break;
      }

      case 'decline_expired_card': {
        await this.handleWebhookEvent({
          id: `evt_sim_${Date.now()}_exp`,
          type: 'payment_intent.payment_failed',
          data: {
            object: {
              id: paymentIntentId,
              status: 'failed',
              amount: 100,
              last_payment_error: {
                code: 'expired_card',
                payment_method: { card: { brand: 'visa', last4: '0069' } },
              },
            },
          },
        });
        break;
      }

      case 'decline_incorrect_cvc': {
        await this.handleWebhookEvent({
          id: `evt_sim_${Date.now()}_cvc`,
          type: 'payment_intent.payment_failed',
          data: {
            object: {
              id: paymentIntentId,
              status: 'failed',
              amount: 100,
              last_payment_error: {
                code: 'incorrect_cvc',
                payment_method: { card: { brand: 'visa', last4: '0127' } },
              },
            },
          },
        });
        break;
      }

      case 'trigger_3ds': {
        await db.updatePaymentStatus({
          stripePaymentIntentId: paymentIntentId,
          status: 'requires_action',
        });
        await db.updateOrderStatus(order.id, 'processing');
        break;
      }

      case 'processing': {
        await this.handleWebhookEvent({
          id: `evt_sim_${Date.now()}_proc`,
          type: 'payment_intent.processing',
          data: {
            object: {
              id: paymentIntentId,
              status: 'processing',
              amount: 100,
            },
          },
        });
        break;
      }

      case 'cancel': {
        await this.handleWebhookEvent({
          id: `evt_sim_${Date.now()}_canc`,
          type: 'payment_intent.canceled',
          data: {
            object: {
              id: paymentIntentId,
              status: 'canceled',
              amount: 100,
            },
          },
        });
        break;
      }
    }

    return await this.getPaymentStatus(paymentIntentId);
  },
};
