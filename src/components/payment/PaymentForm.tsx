import React, { useState, useEffect } from 'react';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { getClientStripe } from '../../lib/stripe/client';
import { Product, PaymentStateMachineState, PaymentStatusResponse } from '../../types/payment';
import { PaymentLoading } from './PaymentLoading';
import { PaymentAuthentication } from './PaymentAuthentication';
import { PaymentProcessing } from './PaymentProcessing';
import { PaymentError } from './PaymentError';
import { PaymentSuccess } from './PaymentSuccess';
import { normalizeStripeError } from '../../lib/payments/error-normalizer';
import {
  CreditCard,
  Lock,
  ShieldCheck,
  AlertCircle,
  Sparkles,
  CheckCircle,
  RefreshCw,
} from 'lucide-react';

interface PaymentFormProps {
  product: Product;
  onChooseAnotherProduct?: () => void;
  onPaymentSuccess?: (orderNumber: string) => void;
}

// Internal Real Stripe Card Sub-component
function RealStripeCardInputs({
  disabled,
  onCardChange,
}: {
  disabled: boolean;
  onCardChange: (isComplete: boolean) => void;
}) {
  return (
    <div className="p-4 rounded-xl border border-slate-700 bg-slate-900/80 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
      <CardElement
        options={{
          hidePostalCode: true,
          style: {
            base: {
              color: '#f8fafc',
              fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
              fontSmoothing: 'antialiased',
              fontSize: '15px',
              '::placeholder': {
                color: '#64748b',
              },
            },
            invalid: {
              color: '#f43f5e',
              iconColor: '#f43f5e',
            },
          },
          disabled,
        }}
        onChange={(e) => onCardChange(e.complete)}
      />
    </div>
  );
}

interface PaymentFormCoreProps extends PaymentFormProps {
  hasLiveStripe: boolean;
  publishableKey?: string;
  stripe: ReturnType<typeof useStripe> | null;
  elements: ReturnType<typeof useElements> | null;
}

// Inner Core Form executing the state machine
function PaymentFormCore({
  product,
  onChooseAnotherProduct,
  onPaymentSuccess,
  hasLiveStripe,
  publishableKey,
  stripe,
  elements,
}: PaymentFormCoreProps) {

  const [state, setState] = useState<PaymentStateMachineState>('IDLE');
  const [customerEmail, setCustomerEmail] = useState('');
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);

  // Card details state for sandbox simulator mode
  const [cardNumber, setCardNumber] = useState('4242 4242 4242 4242');
  const [cardExp, setCardExp] = useState('12/28');
  const [cardCvc, setCardCvc] = useState('123');
  const [cardComplete, setCardComplete] = useState(true);

  // Failure info
  const [failureCode, setFailureCode] = useState<string | undefined>();
  const [safeFailureMessage, setSafeFailureMessage] = useState<string | undefined>();

  // Success receipt info
  const [successData, setSuccessData] = useState<PaymentStatusResponse | null>(null);

  // Prevent multiple clicks
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1: Initialize PaymentIntent when product changes
  const initPaymentIntent = async () => {
    try {
      setState('CREATING_PAYMENT');
      setFailureCode(undefined);
      setSafeFailureMessage(undefined);

      // Generate client-side idempotency token for this session attempt
      const idempotencyKey = `idemp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

      const res = await fetch('/api/payments/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          customerEmail: customerEmail.trim() || undefined,
          idempotencyKey,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw errorData;
      }

      const data = await res.json();
      setClientSecret(data.clientSecret);
      setPaymentIntentId(data.paymentIntentId);
      setOrderNumber(data.orderNumber);
      setState('READY');
    } catch (err: any) {
      const normalized = normalizeStripeError(err);
      setFailureCode(normalized.code);
      setSafeFailureMessage(normalized.message);
      setState('FAILED');
    }
  };

  useEffect(() => {
    initPaymentIntent();
  }, [product.id]);

  // Server verification poll helper
  const verifyServerStatus = async (piId: string) => {
    try {
      const res = await fetch(`/api/payments/${piId}`);
      if (!res.ok) throw new Error('Status verification failed');
      const data: PaymentStatusResponse = await res.json();

      if (data.status === 'succeeded' || data.orderStatus === 'paid') {
        setSuccessData(data);
        setState('SUCCESS');
        if (onPaymentSuccess && data.orderNumber) {
          onPaymentSuccess(data.orderNumber);
        }
        return true;
      } else if (data.status === 'failed' || data.orderStatus === 'failed') {
        setFailureCode(data.failureCode || 'card_declined');
        setSafeFailureMessage(data.safeFailureMessage || 'Your card was declined by the card issuer.');
        setState('FAILED');
        return true;
      } else if (data.status === 'requires_action') {
        setState('REQUIRES_ACTION');
        return false;
      } else if (data.status === 'processing') {
        setState('PROCESSING');
        return false;
      }
      return false;
    } catch (e) {
      return false;
    }
  };

  // Step 2: Handle Submit Payment
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting || state === 'SUBMITTING' || !paymentIntentId) {
      return;
    }

    setIsSubmitting(true);
    setState('SUBMITTING');

    try {
      // If official Stripe is active and CardElement is mounted
      if (stripe && elements && clientSecret && !clientSecret.startsWith('pi_sim_')) {
        const cardElement = elements.getElement(CardElement);
        if (!cardElement) {
          throw new Error('Card element not ready');
        }

        const result = await stripe.confirmCardPayment(clientSecret, {
          payment_method: {
            card: cardElement,
            billing_details: {
              email: customerEmail || undefined,
            },
          },
        });

        if (result.error) {
          const normalized = normalizeStripeError(result.error);
          setFailureCode(normalized.code);
          setSafeFailureMessage(normalized.message);
          setState('FAILED');
          setIsSubmitting(false);
          return;
        }

        if (result.paymentIntent.status === 'requires_action') {
          setState('REQUIRES_ACTION');
          setIsSubmitting(false);
          return;
        }

        // Always verify final status with backend
        setState('PROCESSING');
        await new Promise((r) => setTimeout(r, 600));
        await verifyServerStatus(result.paymentIntent.id);
      } else {
        // SANDBOX / SIMULATOR MODE
        // Analyzes card number to emulate exact Stripe test card responses
        const cleanedCard = cardNumber.replace(/\s+/g, '');
        let action = 'succeed';

        if (cleanedCard.endsWith('3155')) {
          action = 'trigger_3ds';
        } else if (cleanedCard.endsWith('0002')) {
          action = 'decline_generic';
        } else if (cleanedCard.endsWith('9995')) {
          action = 'decline_insufficient_funds';
        } else if (cleanedCard.endsWith('0069')) {
          action = 'decline_expired_card';
        } else if (cleanedCard.endsWith('0127')) {
          action = 'decline_incorrect_cvc';
        }

        // Simulate network delay
        await new Promise((r) => setTimeout(r, 800));

        if (action === 'trigger_3ds') {
          setState('REQUIRES_ACTION');
          setIsSubmitting(false);
          return;
        }

        // Call server to trigger simulated webhook and process payment
        const res = await fetch('/api/payments/simulate-action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentIntentId,
            action,
          }),
        });

        const statusResponse: PaymentStatusResponse = await res.json();

        if (statusResponse.status === 'succeeded') {
          setSuccessData(statusResponse);
          setState('SUCCESS');
          if (onPaymentSuccess && statusResponse.orderNumber) {
            onPaymentSuccess(statusResponse.orderNumber);
          }
        } else {
          setFailureCode(statusResponse.failureCode || 'card_declined');
          setSafeFailureMessage(statusResponse.safeFailureMessage || 'Your card was declined.');
          setState('FAILED');
        }
      }
    } catch (err: any) {
      const normalized = normalizeStripeError(err);
      setFailureCode(normalized.code);
      setSafeFailureMessage(normalized.message);
      setState('FAILED');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle 3D Secure Simulation Challenge Response
  const handleSimulate3DSChallenge = async (passed: boolean) => {
    if (!paymentIntentId) return;
    setState('PROCESSING');

    const res = await fetch('/api/payments/simulate-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paymentIntentId,
        action: passed ? 'succeed' : 'decline_generic',
      }),
    });

    const statusResponse: PaymentStatusResponse = await res.json();
    if (statusResponse.status === 'succeeded') {
      setSuccessData(statusResponse);
      setState('SUCCESS');
      if (onPaymentSuccess && statusResponse.orderNumber) {
        onPaymentSuccess(statusResponse.orderNumber);
      }
    } else {
      setFailureCode(statusResponse.failureCode || 'authentication_required');
      setSafeFailureMessage(statusResponse.safeFailureMessage || 'Identity verification failed.');
      setState('FAILED');
    }
  };

  // Reset for a fresh attempt on the same or new product
  const handleRetry = () => {
    initPaymentIntent();
  };

  // Active view router according to the state machine
  if (state === 'CREATING_PAYMENT') {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl backdrop-blur-xl">
        <PaymentLoading
          message="Preparing $1.00 USD checkout..."
          subtext="Creating server-authoritative order and PaymentIntent"
        />
      </div>
    );
  }

  if (state === 'SUCCESS' && successData) {
    return (
      <PaymentSuccess
        orderNumber={successData.orderNumber}
        paymentIntentId={successData.paymentIntentId}
        product={product}
        cardBrand={successData.cardBrand}
        cardLast4={successData.cardLast4}
        timestamp={successData.updatedAt}
        onReset={handleRetry}
      />
    );
  }

  if (state === 'FAILED') {
    return (
      <PaymentError
        orderNumber={orderNumber || undefined}
        paymentIntentId={paymentIntentId || undefined}
        failureCode={failureCode}
        safeFailureMessage={safeFailureMessage}
        onRetry={handleRetry}
        onChooseAnotherProduct={onChooseAnotherProduct}
      />
    );
  }

  if (state === 'PROCESSING') {
    return (
      <PaymentProcessing
        orderNumber={orderNumber || undefined}
        paymentIntentId={paymentIntentId || undefined}
        onRefreshStatus={() => paymentIntentId && verifyServerStatus(paymentIntentId)}
      />
    );
  }

  // Button label according to state
  let buttonLabel = 'Pay $1.00';
  if (state === 'SUBMITTING') {
    buttonLabel = 'Processing payment...';
  } else if (state === 'REQUIRES_ACTION') {
    buttonLabel = 'Verifying payment...';
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-6">
      {/* Product Summary Header */}
      <div className="border-b border-slate-800 pb-5">
        <div className="flex items-center justify-between text-xs text-slate-400 uppercase tracking-wider font-mono mb-1">
          <span>Product</span>
          <span>Order {orderNumber || 'Pending'}</span>
        </div>
        <div className="flex items-baseline justify-between mt-1">
          <h2 className="text-xl font-bold text-slate-100">{product.name}</h2>
          <span className="text-2xl font-extrabold text-emerald-400 font-mono tracking-tight">$1.00 USD</span>
        </div>
        <p className="mt-1 text-xs text-slate-400">{product.description}</p>
      </div>

      {/* 3DS Challenge banner if needed */}
      {state === 'REQUIRES_ACTION' && (
        <PaymentAuthentication
          isSimulated={!hasLiveStripe}
          onSimulateAuthResult={handleSimulate3DSChallenge}
        />
      )}

      {/* Payment Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Customer Email (Optional) */}
        <div>
          <label htmlFor="customer-email" className="block text-xs font-semibold text-slate-300 mb-1.5">
            Email Receipt (Optional)
          </label>
          <input
            id="customer-email"
            type="email"
            value={customerEmail}
            onChange={(e) => setCustomerEmail(e.target.value)}
            placeholder="receipt@company.com"
            disabled={isSubmitting}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-950/80 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all disabled:opacity-50"
          />
        </div>

        {/* Card Component Container */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-indigo-400" />
              <span>Card Information</span>
            </label>
            <span className="text-[11px] text-emerald-400 font-medium">Pay securely by card</span>
          </div>

          {hasLiveStripe ? (
            <RealStripeCardInputs
              disabled={isSubmitting}
              onCardChange={(complete) => setCardComplete(complete)}
            />
          ) : (
            /* Premium Interactive Sandbox Card Input */
            <div className="space-y-3 p-4 rounded-xl border border-slate-800 bg-slate-950/80">
              <div className="relative">
                <input
                  type="text"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  placeholder="4242 4242 4242 4242"
                  disabled={isSubmitting}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-700/80 bg-slate-900 text-sm font-mono text-slate-100 tracking-wider placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                />
                <span className="absolute right-3 top-2.5 text-[10px] uppercase font-mono font-bold px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-500/30">
                  {cardNumber.includes('4242') ? 'VISA' : 'CARD'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  value={cardExp}
                  onChange={(e) => setCardExp(e.target.value)}
                  placeholder="MM/YY"
                  disabled={isSubmitting}
                  className="px-3.5 py-2 rounded-lg border border-slate-700/80 bg-slate-900 text-xs font-mono text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                />
                <input
                  type="text"
                  value={cardCvc}
                  onChange={(e) => setCardCvc(e.target.value)}
                  placeholder="CVC"
                  disabled={isSubmitting}
                  className="px-3.5 py-2 rounded-lg border border-slate-700/80 bg-slate-900 text-xs font-mono text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-2 border-t border-slate-800/80 flex flex-wrap gap-1.5">
                <span className="text-[10px] text-slate-500 block w-full">Quick Test Scenarios:</span>
                <button
                  type="button"
                  onClick={() => { setCardNumber('4242 4242 4242 4242'); setCardExp('12/28'); setCardCvc('123'); }}
                  className="px-2 py-0.5 rounded text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  ✓ 4242 (Pass)
                </button>
                <button
                  type="button"
                  onClick={() => { setCardNumber('4000 0000 0000 3155'); setCardExp('12/28'); setCardCvc('123'); }}
                  className="px-2 py-0.5 rounded text-[10px] bg-slate-800 hover:bg-slate-700 text-amber-300"
                >
                  ⚡ 3155 (3DS)
                </button>
                <button
                  type="button"
                  onClick={() => { setCardNumber('4000 0000 0000 0002'); setCardExp('12/28'); setCardCvc('123'); }}
                  className="px-2 py-0.5 rounded text-[10px] bg-slate-800 hover:bg-slate-700 text-rose-300"
                >
                  ✕ 0002 (Decline)
                </button>
                <button
                  type="button"
                  onClick={() => { setCardNumber('4000 0000 0000 9995'); setCardExp('12/28'); setCardCvc('123'); }}
                  className="px-2 py-0.5 rounded text-[10px] bg-slate-800 hover:bg-slate-700 text-rose-300"
                >
                  ✕ 9995 (No Funds)
                </button>
                <button
                  type="button"
                  onClick={() => { setCardNumber('4000 0000 0000 0069'); setCardExp('01/20'); setCardCvc('123'); }}
                  className="px-2 py-0.5 rounded text-[10px] bg-slate-800 hover:bg-slate-700 text-rose-300"
                >
                  ✕ 0069 (Expired)
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Security Disclaimers */}
        <div className="flex items-center gap-2 text-[11px] text-slate-400">
          <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span>Card information is encrypted and transmitted directly through Stripe.</span>
        </div>

        {/* Pay Button */}
        <button
          type="submit"
          disabled={isSubmitting || state === 'SUBMITTING' || state === 'REQUIRES_ACTION'}
          className="w-full relative overflow-hidden py-3.5 px-6 rounded-xl font-semibold text-sm text-white bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition-all shadow-xl shadow-indigo-600/30 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          <div className="flex items-center justify-center gap-2">
            {isSubmitting && <RefreshCw className="w-4 h-4 animate-spin" />}
            <span>{buttonLabel}</span>
          </div>
        </button>

        {/* Powered by Stripe & Compliance */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
            <span>256-bit TLS • PCI DSS Level 1</span>
          </div>
          <span className="font-semibold text-slate-400">Powered by Stripe</span>
        </div>
      </form>
    </div>
  );
}

// Component that safely calls useStripe() and useElements() only when mounted inside <Elements>
function LiveStripePaymentInner(
  props: PaymentFormProps & { publishableKey: string }
) {
  const stripe = useStripe();
  const elements = useElements();
  return (
    <PaymentFormCore
      {...props}
      stripe={stripe}
      elements={elements}
      hasLiveStripe={true}
    />
  );
}

// Wrapper with Stripe Elements Provider
export const PaymentForm: React.FC<PaymentFormProps> = (props) => {
  const [stripePromise, setStripePromise] = useState<Promise<any> | null>(null);
  const [hasLiveKey, setHasLiveKey] = useState(false);
  const [pubKey, setPubKey] = useState<string>('');

  useEffect(() => {
    // Check if client publishable key is available from server
    fetch('/api/config')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.publishableKey && typeof data.publishableKey === 'string' && data.publishableKey.startsWith('pk_')) {
          setPubKey(data.publishableKey);
          setHasLiveKey(true);
          setStripePromise(getClientStripe(data.publishableKey));
        }
      })
      .catch(() => {});

    // Or from build-time environment variable
    const key =
      (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY : undefined) ||
      (typeof import.meta !== 'undefined' ? (import.meta as any).env?.VITE_STRIPE_PUBLISHABLE_KEY : undefined) ||
      '';

    if (key && key.startsWith('pk_')) {
      setPubKey(key);
      setHasLiveKey(true);
      setStripePromise(getClientStripe(key));
    }
  }, []);

  if (hasLiveKey && stripePromise) {
    return (
      <Elements stripe={stripePromise}>
        <LiveStripePaymentInner
          {...props}
          publishableKey={pubKey}
        />
      </Elements>
    );
  }

  // Fallback to seamless direct sandbox simulator without Elements requirement
  return (
    <PaymentFormCore
      {...props}
      stripe={null}
      elements={null}
      hasLiveStripe={false}
    />
  );
};
