import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { db } from './src/lib/database/db';
import { getAllActiveProducts, getProductById } from './src/lib/payments/products';
import { paymentsService } from './src/lib/payments/payments-service';
import { verifyAndConstructWebhookEvent, getStripePublicConfig, isStripeConfigured } from './src/lib/stripe/server';
import { createPaymentIntentSchema, simulatePaymentActionSchema } from './src/lib/validation/schemas';
import { normalizeStripeError } from './src/lib/payments/error-normalizer';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Structured server-side logger (Never logs card numbers, cvc, or secrets)
function logServerEvent(event: string, meta: Record<string, unknown> = {}) {
  const timestamp = new Date().toISOString();
  console.log(JSON.stringify({ timestamp, event, ...meta }));
}

// -------------------------------------------------------------
// STRIPE WEBHOOK ROUTE (CRITICAL: MUST RECEIVE RAW BODY)
// -------------------------------------------------------------
app.post(
  '/api/stripe/webhook',
  express.raw({ type: 'application/json' }),
  async (req: Request, res: Response): Promise<void> => {
    const signature = req.headers['stripe-signature'] as string;

    if (!signature) {
      logServerEvent('webhook_rejected_no_signature', { ip: req.ip });
      res.status(400).json({ error: 'Missing stripe-signature header' });
      return;
    }

    try {
      let event;
      if (isStripeConfigured && process.env.STRIPE_WEBHOOK_SECRET) {
        event = verifyAndConstructWebhookEvent(req.body, signature);
      } else {
        // If developer is simulating webhooks in dev sandbox
        event = JSON.parse(req.body.toString('utf-8'));
      }

      logServerEvent('webhook_received', {
        eventId: event.id,
        eventType: event.type,
      });

      const result = await paymentsService.handleWebhookEvent(event);

      logServerEvent('webhook_processed', {
        eventId: event.id,
        eventType: event.type,
        duplicated: (result as any).duplicated || false,
      });

      res.status(200).json({ received: true });
    } catch (err: any) {
      logServerEvent('webhook_verification_failed', {
        error: err.message || 'Signature mismatch',
      });
      res.status(400).json({ error: 'Webhook signature verification failed' });
    }
  }
);

// -------------------------------------------------------------
// STANDARD JSON BODY PARSER FOR ALL OTHER API ENDPOINTS
// -------------------------------------------------------------
app.use(express.json({ limit: '100kb' }));

// Basic Security Headers
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// -------------------------------------------------------------
// API ROUTES
// -------------------------------------------------------------

// 1. Safe Public Configuration (Never returns secrets)
app.get('/api/config', (_req: Request, res: Response) => {
  const config = getStripePublicConfig();
  res.json({
    ...config,
    postgresConfigured: db.isPostgresConfigured(),
    appUrl: process.env.APP_URL || 'http://localhost:3000',
  });
});

// 2. Product Catalog (Server-authoritative $1.00 USD)
app.get('/api/products', (_req: Request, res: Response) => {
  const products = getAllActiveProducts();
  res.json({
    products,
    fixedPriceCents: 100,
    currency: 'usd',
    policy: 'Every product is strictly $1.00 USD. Card payment only.',
  });
});

// 3. Create PaymentIntent
// POST /api/payments/create-intent
app.post('/api/payments/create-intent', async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = createPaymentIntentSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation Error',
        details: parseResult.error.flatten().fieldErrors,
      });
      return;
    }

    const { productId, customerEmail, idempotencyKey } = parseResult.data;

    // Verify product exists on server
    const product = getProductById(productId);
    if (!product) {
      res.status(404).json({ error: 'Product not found or inactive' });
      return;
    }

    logServerEvent('payment_intent_create_requested', {
      productId,
      amountCents: 100,
      currency: 'usd',
    });

    const result = await paymentsService.createPaymentIntent({
      productId,
      customerEmail,
      idempotencyKey,
    });

    logServerEvent('payment_intent_created', {
      paymentIntentId: result.paymentIntentId,
      orderNumber: result.orderNumber,
      amount: 100,
      currency: 'usd',
    });

    res.status(200).json(result);
  } catch (error: any) {
    const safeError = normalizeStripeError(error);
    logServerEvent('payment_intent_create_failed', {
      code: safeError.code,
    });
    res.status(500).json({
      error: safeError.message,
      code: safeError.code,
    });
  }
});

// 4. Retrieve Payment Status
// GET /api/payments/:paymentIntentId
app.get('/api/payments/:paymentIntentId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { paymentIntentId } = req.params;
    if (!paymentIntentId || paymentIntentId.length < 3) {
      res.status(400).json({ error: 'Invalid PaymentIntent ID' });
      return;
    }

    const statusData = await paymentsService.getPaymentStatus(paymentIntentId);
    res.status(200).json(statusData);
  } catch (error: any) {
    logServerEvent('payment_status_check_failed', { error: error.message });
    res.status(500).json({
      error: "Unable to retrieve payment status. Please try again.",
    });
  }
});

// 5. Development Sandbox Simulation Trigger
// Allows full interactive verification of test matrix (declines, 3DS, success) in preview
app.post('/api/payments/simulate-action', async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = simulatePaymentActionSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: 'Invalid simulation payload' });
      return;
    }

    const { paymentIntentId, action } = parseResult.data;
    logServerEvent('payment_simulation_triggered', { paymentIntentId, action });

    const updatedStatus = await paymentsService.simulatePaymentResult(paymentIntentId, action);
    res.status(200).json(updatedStatus);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Simulation error' });
  }
});

// 6. Admin Analytics & Protected Overview
app.get('/api/admin/metrics', async (_req: Request, res: Response) => {
  try {
    const metrics = await db.getAdminMetrics();
    res.status(200).json(metrics);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to load metrics' });
  }
});

// -------------------------------------------------------------
// VITE OR STATIC ASSETS
// -------------------------------------------------------------
async function setupViteOrStatic() {
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Stripe PayPlatform Server] Ready on http://0.0.0.0:${PORT}`);
    logServerEvent('server_started', {
      port: PORT,
      isProduction,
      stripeConfigured: isStripeConfigured,
    });
  });
}

setupViteOrStatic().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
