import React, { useState } from 'react';
import { X, ShieldAlert, CheckCircle2, Circle, AlertTriangle, ExternalLink, ArrowRight } from 'lucide-react';

interface LiveChecklistModalProps {
  isOpen: boolean;
  onClose: () => void;
  isStripeLive: boolean;
}

const CHECKLIST_ITEMS = [
  { id: 'item_1', title: 'Stripe account activated and identity verified', category: 'Compliance' },
  { id: 'item_2', title: 'Live publishable key configured (pk_live_...) in Vercel environment variables', category: 'Keys' },
  { id: 'item_3', title: 'Live secret key configured (sk_live_...) on server-only', category: 'Keys' },
  { id: 'item_4', title: 'Live webhook secret configured (whsec_...) on server-only', category: 'Keys' },
  { id: 'item_5', title: 'Production webhook created in Stripe Dashboard (points to /api/stripe/webhook)', category: 'Webhook' },
  { id: 'item_6', title: 'Production HTTPS enforcement active (HSTS & TLS 1.3)', category: 'Security' },
  { id: 'item_7', title: 'PostgreSQL database connection string verified and indexed', category: 'Database' },
  { id: 'item_8', title: 'Stripe test mode verified end-to-end (Test cards 4242, 3155, 0002)', category: 'Testing' },
  { id: 'item_9', title: 'Duplicate payment protection verified (Idempotency keys & DB constraints)', category: 'Reliability' },
  { id: 'item_10', title: 'Error normalization verified (No secret leakage or raw exception stacks)', category: 'Security' },
];

export const LiveChecklistModal: React.FC<LiveChecklistModalProps> = ({ isOpen, onClose, isStripeLive }) => {
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({
    item_9: true,
    item_10: true,
  });

  if (!isOpen) return null;

  const toggleItem = (id: string) => {
    setCheckedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const totalCount = CHECKLIST_ITEMS.length;
  const completedCount = Object.values(checkedItems).filter(Boolean).length;
  const isReady = completedCount === totalCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Live Payment Mode Developer Checklist</h3>
              <p className="text-xs text-slate-400">Mandatory verification gates before processing real credit cards</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Callout */}
        <div className="p-5 overflow-y-auto space-y-4">
          <div className={`p-4 rounded-xl border flex items-start gap-3 ${
            isStripeLive ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300' : 'bg-amber-950/20 border-amber-500/30 text-amber-300'
          }`}>
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed space-y-1">
              <strong className="block font-semibold">
                {isStripeLive ? 'Live Mode Detected' : 'Currently in Test/Simulator Mode'}
              </strong>
              <p className="text-slate-300 text-[11px]">
                Stripe strictly requires verifying card-only handling, SSL certificates, webhook signature verification, and database idempotency prior to live charges.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs px-1">
            <span className="text-slate-400 font-medium">Readiness Progress:</span>
            <span className="font-mono text-indigo-400 font-bold">{completedCount} / {totalCount} Requirements Verified</span>
          </div>

          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-indigo-500 h-full transition-all duration-300"
              style={{ width: `${(completedCount / totalCount) * 100}%` }}
            />
          </div>

          {/* Checklist */}
          <div className="space-y-2 pt-2">
            {CHECKLIST_ITEMS.map((item) => {
              const isChecked = Boolean(checkedItems[item.id]);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggleItem(item.id)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-start gap-3 text-xs ${
                    isChecked
                      ? 'bg-slate-950/60 border-slate-700/80 text-slate-200'
                      : 'bg-slate-950/30 border-slate-800/80 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    {isChecked ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Circle className="w-4 h-4 text-slate-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <span className={`block font-medium ${isChecked ? 'text-slate-100' : 'text-slate-300'}`}>
                      {item.title}
                    </span>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-mono mt-0.5 block">
                      {item.category}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/90 flex items-center justify-between text-xs">
          <span className="text-slate-400">
            {isReady ? 'All requirements verified for live deployment.' : 'Complete checklist items before launch.'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-lg shadow-indigo-600/20 transition-all"
          >
            Acknowledge & Close
          </button>
        </div>
      </div>
    </div>
  );
};
