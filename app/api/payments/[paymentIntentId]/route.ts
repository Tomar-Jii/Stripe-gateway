import { NextResponse } from 'next/server';
import { paymentsService } from '@/lib/payments/payments-service';

/**
 * Next.js App Router Route Handler (Vercel Serverless Ready)
 * GET /api/payments/[paymentIntentId]
 */
export async function GET(
  _req: Request,
  props: { params: Promise<{ paymentIntentId: string }> }
) {
  try {
    const { paymentIntentId } = await props.params;
    if (!paymentIntentId) {
      return NextResponse.json({ error: 'PaymentIntent ID required' }, { status: 400 });
    }

    const data = await paymentsService.getPaymentStatus(paymentIntentId);
    return NextResponse.json(data, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Unable to retrieve payment status' },
      { status: 500 }
    );
  }
}
