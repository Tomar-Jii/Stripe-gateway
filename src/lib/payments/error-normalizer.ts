/**
 * Safe Stripe Error Normalizer
 * Sanitizes Stripe and banking errors into customer-safe, actionable messages.
 * Never exposes raw exceptions, stack traces, API keys, or database errors.
 */

export interface NormalizedError {
  code: string;
  message: string;
  declineCode?: string;
  canRetry: boolean;
}

const STRIPE_ERROR_MAP: Record<string, { message: string; canRetry: boolean }> = {
  card_declined: {
    message: 'Your card was declined by the card issuer.',
    canRetry: true,
  },
  insufficient_funds: {
    message: 'Your card does not have enough available funds.',
    canRetry: true,
  },
  expired_card: {
    message: 'Your card has expired. Please use a valid card.',
    canRetry: true,
  },
  incorrect_cvc: {
    message: 'The card security code (CVC) could not be verified.',
    canRetry: true,
  },
  incorrect_number: {
    message: 'The card number could not be verified.',
    canRetry: true,
  },
  authentication_required: {
    message: 'Your bank requires additional identity verification (3D Secure).',
    canRetry: true,
  },
  processing_error: {
    message: 'A temporary payment processing error occurred. Please try again.',
    canRetry: true,
  },
  do_not_honor: {
    message: 'Your card issuer declined this transaction with code: Do Not Honor.',
    canRetry: true,
  },
  generic_decline: {
    message: 'The card issuer declined this transaction.',
    canRetry: true,
  },
  invalid_account: {
    message: 'The card account reported as invalid by the issuer.',
    canRetry: false,
  },
  lost_card: {
    message: 'This card was reported lost. Please use a different card.',
    canRetry: false,
  },
  stolen_card: {
    message: 'This card was reported stolen. Please use a different card.',
    canRetry: false,
  },
  pickup_card: {
    message: 'This card cannot be used for this transaction. Please use another card.',
    canRetry: false,
  },
  rate_limit: {
    message: 'Too many payment requests in a short period. Please wait a moment and try again.',
    canRetry: true,
  },
  idempotency_error: {
    message: 'A duplicate request was detected and safely intercepted.',
    canRetry: false,
  },
  payment_intent_unexpected_state: {
    message: 'The payment session is no longer active. Please start a fresh transaction.',
    canRetry: true,
  },
};

export function normalizeStripeError(rawError: unknown): NormalizedError {
  if (!rawError) {
    return {
      code: 'unknown_error',
      message: "We couldn't complete the payment. Please try again or use another card.",
      canRetry: true,
    };
  }

  // Handle Stripe SDK specific error shapes
  const err = rawError as {
    code?: string;
    decline_code?: string;
    type?: string;
    message?: string;
    rawType?: string;
  };

  const code = (err.decline_code || err.code || 'unknown').toLowerCase().trim();
  const declineCode = err.decline_code?.toLowerCase().trim();

  // 1. Direct decline code match
  if (declineCode && STRIPE_ERROR_MAP[declineCode]) {
    return {
      code: declineCode,
      message: STRIPE_ERROR_MAP[declineCode].message,
      declineCode,
      canRetry: STRIPE_ERROR_MAP[declineCode].canRetry,
    };
  }

  // 2. Direct code match
  if (STRIPE_ERROR_MAP[code]) {
    return {
      code,
      message: STRIPE_ERROR_MAP[code].message,
      declineCode,
      canRetry: STRIPE_ERROR_MAP[code].canRetry,
    };
  }

  // 3. Fallback for card errors with known message patterns
  if (err.type === 'StripeCardError' || err.rawType === 'card_error') {
    return {
      code: code || 'card_declined',
      message: 'Your card was declined. Please try another card or check card details.',
      declineCode,
      canRetry: true,
    };
  }

  if (err.type === 'StripeRateLimitError') {
    return {
      code: 'rate_limit',
      message: STRIPE_ERROR_MAP.rate_limit.message,
      canRetry: true,
    };
  }

  // Default safe generic error (Never leaks stacks, keys, or internal details)
  return {
    code: 'generic_error',
    message: "We couldn't complete your $1.00 payment. Please try again or use another card.",
    canRetry: true,
  };
}
