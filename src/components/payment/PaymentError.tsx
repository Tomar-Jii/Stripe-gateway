import React from 'react';
import { AlertCircle, ArrowLeft, ShieldAlert } from 'lucide-react';
import { PaymentRetryButton } from './PaymentRetryButton';

interface PaymentErrorProps {
  orderNumber?: string;
  paymentIntentId?: string;
  failureCode?: string;
  safeFailureMessage?: string;
  onRetry: () => void;
  onChooseAnotherProduct?: () => void;
}

export const PaymentError: React.FC<PaymentErrorProps> = ({
  orderNumber,
  paymentIntentId,
  failureCode = 'card_declined',
  safeFailureMessage,
  onRetry,
  onChooseAnotherProduct,
}) => {
  const displayMessage =
    safeFailureMessage || "We couldn't complete the payment. Please try again or use another card.";

  return (
    <div
      className="rounded-2xl border border-rose-500/30 bg-slate-900/90 p-8 shadow-2xl shadow-rose-950/20 backdrop-blur-xl space-y-6"
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-100">Payment Failed</h2>
          <p className="text-xs text-slate-400">We couldn't complete your $1.00 USD card payment.</p>
        </div>
      </div>

      <div className="rounded-xl border border-rose-500/20 bg-rose-950/20 p-4 space-y-2">
        <div className="flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="text-[11px] font-mono uppercase tracking-wider text-rose-300 font-semibold block">
              Reason
            </span>
            <p className="text-sm font-medium text-rose-100">{displayMessage}</p>
          </div>
        </div>

        {failureCode && (
          <div className="pt-2 border-t border-rose-500/15 flex items-center justify-between text-xs">
            <span className="text-slate-400 font-mono">Error Code:</span>
            <span className="font-mono text-rose-300 bg-rose-900/40 px-2 py-0.5 rounded border border-rose-500/20">
              {failureCode}
            </span>
          </div>
        )}
      </div>

      <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-4 grid grid-cols-2 gap-3 text-xs">
        {orderNumber && (
          <div>
            <span className="text-slate-500 font-mono block text-[11px] uppercase">Order Number</span>
            <span className="font-mono font-semibold text-slate-200">{orderNumber}</span>
          </div>
        )}
        {paymentIntentId && (
          <div>
            <span className="text-slate-500 font-mono block text-[11px] uppercase">Payment Ref</span>
            <span className="font-mono font-semibold text-slate-300 truncate block" title={paymentIntentId}>
              {paymentIntentId.slice(0, 16)}...
            </span>
          </div>
        )}
      </div>

      <div className="space-y-3 pt-2">
        <PaymentRetryButton onRetry={onRetry} label="Try Again" className="w-full" />

        {onChooseAnotherProduct && (
          <button
            type="button"
            onClick={onChooseAnotherProduct}
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Select a different item</span>
          </button>
        )}
      </div>

      <div className="text-center pt-2 border-t border-slate-800">
        <p className="text-[11px] text-slate-500">
          Your card was not charged. Card security standards ensure no sensitive payment data was stored on our servers.
        </p>
      </div>
    </div>
  );
};
