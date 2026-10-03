import React from 'react';
import { Check, ShieldCheck, Download, ArrowRight, CreditCard, CheckCircle2 } from 'lucide-react';
import { Product } from '../../types/payment';

interface PaymentSuccessProps {
  orderNumber: string;
  paymentIntentId: string;
  product: Product;
  cardBrand?: string;
  cardLast4?: string;
  timestamp?: string;
  onReset: () => void;
}

export const PaymentSuccess: React.FC<PaymentSuccessProps> = ({
  orderNumber,
  paymentIntentId,
  product,
  cardBrand = 'visa',
  cardLast4 = '4242',
  timestamp,
  onReset,
}) => {
  const formattedDate = timestamp
    ? new Date(timestamp).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : new Date().toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

  return (
    <div className="rounded-2xl border border-emerald-500/30 bg-slate-900/90 p-8 shadow-2xl shadow-emerald-950/20 backdrop-blur-xl space-y-6">
      <div className="flex flex-col items-center text-center space-y-3">
        <div className="relative flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <Check className="w-8 h-8 stroke-[2.5]" />
          </div>
          <div className="w-20 h-20 rounded-full border border-emerald-500/20 animate-ping absolute" />
        </div>
        <div className="space-y-1">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Confirmed Server-Side
          </span>
          <h2 className="text-2xl font-bold text-slate-100">Payment Successful</h2>
          <p className="text-xs text-slate-300 max-w-sm">
            Your $1.00 USD payment has been completed successfully via Stripe secure card processing.
          </p>
        </div>
      </div>

      {/* Receipt Breakdown Card */}
      <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-5 divide-y divide-slate-800/80 space-y-3 text-xs">
        <div className="flex justify-between items-center pb-2">
          <span className="text-slate-400">Product</span>
          <span className="font-semibold text-slate-100 text-right">{product.name}</span>
        </div>

        <div className="flex justify-between items-center py-2">
          <span className="text-slate-400">Amount Paid</span>
          <span className="font-bold text-emerald-400 text-sm">$1.00 USD</span>
        </div>

        <div className="flex justify-between items-center py-2">
          <span className="text-slate-400">Status</span>
          <span className="inline-flex items-center gap-1 text-emerald-300 font-semibold uppercase text-[11px] bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-500/30">
            Paid
          </span>
        </div>

        <div className="flex justify-between items-center py-2">
          <span className="text-slate-400">Order Number</span>
          <span className="font-mono font-semibold text-slate-200">{orderNumber}</span>
        </div>

        <div className="flex justify-between items-center py-2">
          <span className="text-slate-400">Payment Reference</span>
          <span className="font-mono text-slate-300 truncate max-w-[180px]" title={paymentIntentId}>
            {paymentIntentId}
          </span>
        </div>

        {cardLast4 && (
          <div className="flex justify-between items-center py-2">
            <span className="text-slate-400">Payment Method</span>
            <span className="inline-flex items-center gap-1.5 font-medium text-slate-200 uppercase">
              <CreditCard className="w-3.5 h-3.5 text-slate-400" />
              <span>{cardBrand} •••• {cardLast4}</span>
            </span>
          </div>
        )}

        <div className="flex justify-between items-center pt-2">
          <span className="text-slate-400">Date & Time</span>
          <span className="text-slate-300">{formattedDate}</span>
        </div>
      </div>

      {/* Security Verification Footer */}
      <div className="rounded-lg bg-indigo-950/20 border border-indigo-500/20 p-3 flex items-center gap-3 text-xs text-indigo-300">
        <ShieldCheck className="w-5 h-5 text-indigo-400 shrink-0" />
        <p className="text-[11px] leading-relaxed text-indigo-200/90">
          This transaction was verified through Stripe's cryptographic server signature. No raw card numbers were stored on our servers.
        </p>
      </div>

      <div className="pt-2 flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={onReset}
          className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium text-xs bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 transition-colors"
        >
          <span>Make Another Payment</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
