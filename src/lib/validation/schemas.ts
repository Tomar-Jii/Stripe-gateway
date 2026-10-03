import { z } from 'zod';

export const createPaymentIntentSchema = z.object({
  productId: z.string().min(1, 'Product ID is required').max(100),
  customerEmail: z.string().email('Invalid email address').optional(),
  idempotencyKey: z.string().min(8).max(128).optional(),
});

export type CreatePaymentIntentInput = z.infer<typeof createPaymentIntentSchema>;

export const paymentIdParamSchema = z.object({
  paymentIntentId: z.string().min(4, 'Invalid PaymentIntent ID').max(255),
});

export const simulatePaymentActionSchema = z.object({
  paymentIntentId: z.string().min(4),
  action: z.enum([
    'succeed',
    'decline_generic',
    'decline_insufficient_funds',
    'decline_expired_card',
    'decline_incorrect_cvc',
    'decline_incorrect_number',
    'trigger_3ds',
    'processing',
    'cancel',
  ]),
});

export type SimulatePaymentActionInput = z.infer<typeof simulatePaymentActionSchema>;
