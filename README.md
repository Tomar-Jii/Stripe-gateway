# Stripe PayPlatform — $1.00 USD Card Payment Architecture

A production-grade, card-only payment platform built with Next.js App Router, TypeScript, Stripe Elements, official Stripe Node SDK, and PostgreSQL-compatible database architecture. Designed for seamless one-click Vercel deployment with serverless route handlers and complete webhook idempotency.

---

## 1. Project Overview

Stripe PayPlatform enforces strict financial, security, and card-processing boundaries:
1. **$1.00 USD Rule**: Every product costs strictly **$1.00 USD** (100 cents). The server is the sole source of truth for pricing; any amount submitted by the client is discarded.
2. **Strictly Card Payments Only**: PayPal, cryptocurrency, BNPL, bank transfers, and Cash App are completely excluded at both the Stripe API and Stripe Elements layers.
3. **Zero Raw Card Storage**: No card numbers, CVCs, or expiration dates ever touch your database or backend servers. All sensitive data is tokenized directly through Stripe Elements.
4. **Server-Side Verification**: Orders are marked `paid` only after cryptographic verification of Stripe PaymentIntent statuses and webhook events.
5. **Robust Idempotency**: Duplicate payment prevention through client idempotency keys, database unique constraints, and a deduping webhook event ledger.
6. **Error Normalization**: Stripe decline codes (`card_declined`, `insufficient_funds`, `expired_card`, `incorrect_cvc`, `authentication_required`, etc.) are mapped to customer-safe messages with zero secret leakage.

---

## 2. System Architecture

```
[ Customer Browser ]
       │
       │ 1. Select Product ($1.00 USD)
       ▼
[ POST /api/payments/create-intent ]
       │ 2. Validate product in server catalog -> Fix price to 100 cents USD
       │ 3. Check idempotency key
       │ 4. Insert Order (status: pending)
       │ 5. Stripe API: stripe.paymentIntents.create({ amount: 100, payment_method_types: ['card'] })
       ▼
[ Browser receives clientSecret & mounts Stripe Elements ]
       │ 6. Customer enters card securely into Stripe Elements
       │ 7. stripe.confirmCardPayment(clientSecret)
       ▼
[ Stripe Processing Gateway & Bank 3D Secure Verification ]
       │ 8. Bank confirms / requires 3DS / declines
       ▼
[ POST /api/stripe/webhook ]
       │ 9. Verify stripe-signature header using STRIPE_WEBHOOK_SECRET
       │ 10. Check stripe_webhook_events table (prevent duplicate replay)
       │ 11. Update Order -> 'paid' and Payment -> 'succeeded'
       ▼
[ Customer & Admin Dashboard UI ]
       │ 12. Displays verified receipt with masked card (•••• 4242)
```

---

## 3. Directory Structure

```
├── app/
│   └── api/
│       ├── payments/
│       │   ├── create-intent/
│       │   │   └── route.ts          # Next.js App Router POST create-intent
│       │   └── [paymentIntentId]/
│       │       └── route.ts          # Next.js App Router GET payment status
│       └── stripe/
│           └── webhook/
│               └── route.ts          # Next.js App Router POST Stripe webhook
├── prisma/
│   └── schema.prisma                 # PostgreSQL database schema & indexes
├── src/
│   ├── components/
│   │   ├── admin/
│   │   │   ├── AdminDashboard.tsx    # Protected ledger & metrics overview
│   │   │   └── LiveChecklistModal.tsx# Developer checklist before live mode
│   │   └── payment/
│   │       ├── PaymentForm.tsx       # Stripe Elements card-only payment form
│   │       ├── PaymentSuccess.tsx    # Confirmed receipt & masked card metadata
│   │       ├── PaymentError.tsx      # Safe decline reason & retry button
│   │       ├── PaymentProcessing.tsx # Status polling view
│   │       ├── PaymentLoading.tsx    # Spinner and loading state
│   │       ├── PaymentAuthentication.tsx # 3DS identity challenge handler
│   │       ├── PaymentRetryButton.tsx# Deduplication-safe retry button
│   │       ├── ProductCatalog.tsx    # $1.00 USD items selector
│   │       ├── StripeStatusBanner.tsx# Gateway status & mode banner
│   │       └── TestCardsModal.tsx    # Official Stripe test card scenarios
│   ├── lib/
│   │   ├── database/
│   │   │   └── db.ts                 # PostgreSQL adapter with dev memory fallback
│   │   ├── payments/
│   │   │   ├── error-normalizer.ts   # Safe Stripe decline code mapping
│   │   │   ├── orders.ts             # Order lifecycle management
│   │   │   ├── payments-service.ts   # Payment coordination & webhook deduplication
│   │   │   └── products.ts           # Server-authoritative $1.00 USD product catalog
│   │   ├── stripe/
│   │   │   ├── client.ts             # Safe client-side Stripe.js loader
│   │   │   └── server.ts             # Server-only official Stripe SDK client
│   │   └── validation/
│   │       └── schemas.ts            # Zod validation schemas
│   ├── types/
│   │   └── payment.ts                # TypeScript strict interfaces & state machine
│   ├── App.tsx                       # Main UI container
│   ├── index.css                     # Tailwind CSS styling
│   └── main.tsx                      # Client entry point
├── server.ts                         # Express server with raw webhook parsing & Vite middlewares
├── .env.example                      # Environment variables template
├── package.json
└── tsconfig.json
```

---

## 4. Environment Variables

Create `.env.local` (for Next.js) or configure your environment in Vercel:

```bash
# Public key safe for client-side Stripe.js (pk_test_... or pk_live_...)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=""

# Stripe Secret Key (SERVER-ONLY - Never expose to client: sk_test_... or sk_live_...)
STRIPE_SECRET_KEY=""

# Stripe Webhook Signing Secret (SERVER-ONLY: whsec_...)
STRIPE_WEBHOOK_SECRET=""

# PostgreSQL Connection String (SERVER-ONLY)
DATABASE_URL="postgresql://user:password@host:5432/stripe_db?sslmode=require"

# Base Application URL
APP_URL="http://localhost:3000"
```

### Security Rules:
- **`STRIPE_SECRET_KEY`**: Server-only. Must NEVER be prefixed with `NEXT_PUBLIC_` or `VITE_`.
- **`STRIPE_WEBHOOK_SECRET`**: Server-only. Used exclusively to cryptographically verify incoming Stripe webhooks.
- **`DATABASE_URL`**: Server-only. Must not be accessible to browser code.

---

## 5. Local Development Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Fill in your Stripe test keys (`pk_test_...`, `sk_test_...`). If keys are left empty, the application runs seamlessly in **Sandbox Simulator Mode**, enabling you to test every edge case (successful payment, 3D Secure, card decline, insufficient funds, expired cards) right in the UI.

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 6. Forwarding Stripe Webhooks Locally

To test real Stripe webhooks locally, install the [Stripe CLI](https://stripe.com/docs/stripe-cli):

1. **Login to Stripe**:
   ```bash
   stripe login
   ```
2. **Forward Webhook Events to your local server**:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
3. Copy the signing secret printed by the CLI (`whsec_...`) and paste it into your `.env` as `STRIPE_WEBHOOK_SECRET`.
4. Trigger a test event:
   ```bash
   stripe trigger payment_intent.succeeded
   ```

---

## 7. Testing Matrix & Official Stripe Test Cards

Always use official Stripe test cards. Never use real card numbers for testing.

| Scenario | Test Card Number | Exp / CVC | Expected UI | Expected DB Status |
| :--- | :--- | :--- | :--- | :--- |
| **Success** | `4242 4242 4242 4242` | `12/28` / `123` | Payment Successful Receipt | `paid` / `succeeded` |
| **3D Secure (2FA)** | `4000 0000 0000 3155` | `12/28` / `123` | Additional Verification Modal | `requires_action` -> `paid` |
| **Card Decline** | `4000 0000 0000 0002` | `12/28` / `123` | Payment Failed (Issuer decline) | `failed` / `card_declined` |
| **Insufficient Funds** | `4000 0000 0000 9995` | `12/28` / `123` | Payment Failed (Not enough funds)| `failed` / `insufficient_funds` |
| **Expired Card** | `4000 0000 0000 0069` | `01/20` / `123` | Payment Failed (Expired card) | `failed` / `expired_card` |
| **Incorrect CVC** | `4000 0000 0000 0127` | `12/28` / `999` | Payment Failed (Invalid CVC) | `failed` / `incorrect_cvc` |
| **Duplicate Webhook** | Trigger same event twice | N/A | Ignored / Unchanged | Remains `paid` (Idempotent) |
| **Double Click Pay** | Fast double tap on Pay | N/A | Single PaymentIntent created | Exact 1 charge |

---

## 8. Database Schema & Migration

The PostgreSQL schema is defined in `prisma/schema.prisma`:
- `products`: Server-side catalog (`price = 100`, `currency = 'usd'`).
- `orders`: Unique `orderNumber`, status transitions (`pending` -> `paid` / `failed`).
- `payments`: Stripe PaymentIntent ID unique constraint, card brand, masked last 4 digits.
- `stripe_webhook_events`: Unique index on `stripeEventId` guaranteeing zero duplicate webhook fulfillments.

To push schema to a live PostgreSQL database:
```bash
npx prisma db push
```

---

## 9. Vercel Deployment Guide

1. Push this repository to GitHub or GitLab.
2. In the [Vercel Dashboard](https://vercel.com), click **Add New Project** and import the repository.
3. Configure the following Environment Variables in the Vercel Settings:
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: `pk_live_...` (or test key)
   - `STRIPE_SECRET_KEY`: `sk_live_...` (or test key)
   - `STRIPE_WEBHOOK_SECRET`: `whsec_...`
   - `DATABASE_URL`: `postgresql://...`
   - `APP_URL`: `https://your-deployment-url.vercel.app`
4. Click **Deploy**.
5. Go to your [Stripe Dashboard](https://dashboard.stripe.com) -> **Developers** -> **Webhooks**.
6. Add an endpoint pointing to:
   `https://your-deployment-url.vercel.app/api/stripe/webhook`
7. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `payment_intent.processing`
   - `payment_intent.canceled`
8. Copy the **Signing secret** (`whsec_...`) and update `STRIPE_WEBHOOK_SECRET` in Vercel.

---

## 10. Live Payment Mode Safety Checklist

Before switching your Stripe account from Test to Live, verify every item in the developer checklist:

- [ ] Stripe account is fully activated and banking identity is verified.
- [ ] Live publishable key (`pk_live_...`) is configured in production environment variables.
- [ ] Live secret key (`sk_live_...`) is configured on server only.
- [ ] Live webhook secret (`whsec_...`) is configured on server only.
- [ ] Production webhook endpoint is active and listening for `payment_intent.succeeded`.
- [ ] HTTPS (TLS 1.3) is active across all endpoints.
- [ ] PostgreSQL connection is tested and database indexes are built.
- [ ] End-to-end payment flow tested with test cards.
- [ ] Duplicate payment idempotency confirmed.
- [ ] Error normalization verified (no raw stack traces or internal errors shown to users).

---

## 11. Security Audit Summary

- **Card Data Exposure**: PASSED. Zero card details stored in database or logged in server output.
- **Credential Safety**: PASSED. No live or test keys hardcoded in source repository.
- **Client/Server Boundary**: PASSED. Secret keys remain strictly on the server side.
- **Amount Tampering Protection**: PASSED. Price is always resolved from server catalog (`100 cents USD`).
- **Webhook Spoofing Protection**: PASSED. Raw body cryptographic signature verification with `STRIPE_WEBHOOK_SECRET`.
- **Idempotency**: PASSED. Unique database constraints on `stripeEventId` and `stripePaymentIntentId`.
