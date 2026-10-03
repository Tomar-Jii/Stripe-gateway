import React, { useState } from 'react';
import { Shield, Key, Database, CreditCard, ChevronDown, ChevronUp, CheckCircle, Info, ExternalLink } from 'lucide-react';

interface StripeStatusBannerProps {
  stripeMode: 'live' | 'test' | 'simulator';
  isPostgresConnected: boolean;
  onOpenChecklist: () => void;
  onOpenTestCardsModal: () => void;
}

export const StripeStatusBanner: React.FC<StripeStatusBannerProps> = ({
  stripeMode,
  isPostgresConnected,
  onOpenChecklist,
  onOpenTestCardsModal,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const modeBadge = {
    live: {
      label: 'Stripe LIVE Mode',
      color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      dot: 'bg-emerald-500 animate-pulse',
    },
    test: {
      label: 'Stripe TEST Mode',
      color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
      dot: 'bg-indigo-500',
    },
    simulator: {
      label: 'Sandbox Simulator Mode',
      color: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      dot: 'bg-amber-500',
    },
  }[stripeMode];

  return (
    <div className="w-full bg-slate-900/80 border-b border-slate-800 text-xs backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Status Indicators */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold ${modeBadge.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${modeBadge.dot}`} />
            <span>{modeBadge.label}</span>
          </div>

          <div className="inline-flex items-center gap-1.5 text-slate-400 text-[11px]">
            <CreditCard className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-medium text-slate-300">Card Only</span>
            <span className="text-slate-600">•</span>
            <span className="text-emerald-400 font-mono font-semibold">$1.00 USD</span>
          </div>

          <div className="hidden md:inline-flex items-center gap-1.5 text-[11px] text-slate-400">
            <Database className="w-3.5 h-3.5" />
            <span>DB: {isPostgresConnected ? 'PostgreSQL Active' : 'Relational Memory Store (Dev)'}</span>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenTestCardsModal}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors text-[11px] font-medium"
          >
            Official Test Cards
          </button>

          <button
            type="button"
            onClick={onOpenChecklist}
            className="px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 transition-colors text-[11px] font-medium"
          >
            Live Deployment Checklist
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-slate-400 hover:text-slate-200 transition-colors"
            aria-label="Toggle Details"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expandable Architecture Notes */}
      {isExpanded && (
        <div className="border-t border-slate-800/80 bg-slate-950/90 px-4 py-3 text-xs text-slate-400">
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <span className="font-semibold text-slate-200 block mb-1">Zero Secret Leakage Guarantee</span>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Stripe Secret Key and Webhook Signing Secret reside strictly on the server. Never bundled into client builds or browser bundles.
              </p>
            </div>
            <div>
              <span className="font-semibold text-slate-200 block mb-1">Server Authoritative $1.00 USD</span>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Client price inputs are rejected. The server looks up product IDs from canonical catalog and fixes the PaymentIntent amount to 100 cents.
              </p>
            </div>
            <div>
              <span className="font-semibold text-slate-200 block mb-1">Webhook Idempotency</span>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Incoming Stripe webhook events are cryptographically verified and recorded in the database to prevent duplicate fulfillment.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
