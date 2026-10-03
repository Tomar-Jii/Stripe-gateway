import { NextResponse } from 'next/server';
import { verifyAndConstructWebhookEvent, isStripeConfigured } from '@/lib/stripe/server';
import { paymentsService } from '@/lib/payments/payments-service';

/**
 * Next.js App Router Stripe Webhook Handler (Vercel Serverless Ready)
 * POST /api/stripe/webhook
 *
 * CRITICAL: Uses req.text() to extract the exact raw body string
 * for cryptographic signature verification.
 */
export async function POST(req: Request) {
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  try {
    const rawBody = await req.text();

    let event;
    if (isStripeConfigured && process.env.STRIPE_WEBHOOK_SECRET) {
      event = verifyAndConstructWebhookEvent(rawBody, signature);
    } else {
      event = JSON.parse(rawBody);
    }

    await paymentsService.handleWebhookEvent(event);

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    );
  }
}
