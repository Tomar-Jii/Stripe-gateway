import React from 'react';
import { Loader2, Clock, CheckCircle } from 'lucide-react';

interface PaymentProcessingProps {
  orderNumber?: string;
  paymentIntentId?: string;
  onRefreshStatus?: () => void;
}

export const PaymentProcessing: React.FC<PaymentProcessingProps> = ({
  orderNumber,
  paymentIntentId,
  onRefreshStatus,
}) => {
  return (
    <div className="rounded-2xl border border-sky-500/30 bg-sky-950/20 p-8 text-center space-y-5" role="status" aria-live="polite">
      <div className="relative mx-auto w-16 h-16 flex items-center justify-center">
        <div className="w-16 h-16 rounded-full border-2 border-sky-500/20 animate-ping absolute" />
        <div className="w-14 h-14 rounded-full bg-sky-500/10 border border-sky-500/40 flex items-center justify-center text-sky-400">
          <Clock className="w-7 h-7 animate-pulse" />
        </div>
      </div>

      <div className="space-y-1">
        <h2 className="text-xl font-bold text-slate-100">Payment Processing</h2>
        <p className="text-sm text-slate-300">Your $1.00 payment is being confirmed. Please wait.</p>
        <p className="text-xs text-slate-400">
          We are awaiting confirmation from your card issuer. This usually takes just a few seconds.
        </p>
      </div>

      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900/90 border border-slate-800 text-xs text-slate-300">
        <Loader2 className="w-4 h-4 text-sky-400 animate-spin" />
        <span>Polling server-side payment verification...</span>
      </div>

      {(orderNumber || paymentIntentId) && (
        <div className="pt-4 border-t border-slate-800/80 grid grid-cols-2 gap-3 text-left bg-slate-900/50 p-3 rounded-xl border">
          {orderNumber && (
            <div>
              <span className="text-[11px] text-slate-500 font-mono uppercase tracking-wider block">Order</span>
              <span className="text-xs font-semibold text-slate-200 font-mono">{orderNumber}</span>
            </div>
          )}
          {paymentIntentId && (
            <div>
              <span className="text-[11px] text-slate-500 font-mono uppercase tracking-wider block">Reference</span>
              <span className="text-xs font-semibold text-slate-200 font-mono truncate block" title={paymentIntentId}>
                {paymentIntentId.slice(0, 18)}...
              </span>
            </div>
          )}
        </div>
      )}

      {onRefreshStatus && (
        <div>
          <button
            type="button"
            onClick={onRefreshStatus}
            className="text-xs text-sky-400 hover:text-sky-300 transition-colors underline underline-offset-4"
          >
            Check status again
          </button>
        </div>
      )}
    </div>
  );
};
