import { NextResponse } from 'next/server';
import { createPaymentIntentSchema } from '@/lib/validation/schemas';
import { paymentsService } from '@/lib/payments/payments-service';
import { getProductById } from '@/lib/payments/products';
import { normalizeStripeError } from '@/lib/payments/error-normalizer';

/**
 * Next.js App Router Route Handler (Vercel Serverless Ready)
 * POST /api/payments/create-intent
 */
export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parseResult = createPaymentIntentSchema.safeParse(json);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Validation Error', details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { productId, customerEmail, idempotencyKey } = parseResult.data;

    // Verify product exists on server - never trust client price!
    const product = getProductById(productId);
    if (!product) {
      return NextResponse.json({ error: 'Product not found or inactive' }, { status: 404 });
    }

    const result = await paymentsService.createPaymentIntent({
      productId,
      customerEmail,
      idempotencyKey,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    const safe = normalizeStripeError(error);
    return NextResponse.json({ error: safe.message, code: safe.code }, { status: 500 });
  }
}
