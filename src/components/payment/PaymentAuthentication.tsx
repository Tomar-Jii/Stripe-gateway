import React from 'react';
import { ShieldCheck, ExternalLink, Loader2 } from 'lucide-react';

interface PaymentAuthenticationProps {
  onCompleteAuth?: () => void;
  isSimulated?: boolean;
  onSimulateAuthResult?: (success: boolean) => void;
}

export const PaymentAuthentication: React.FC<PaymentAuthenticationProps> = ({
  onCompleteAuth,
  isSimulated = false,
  onSimulateAuthResult,
}) => {
  return (
    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 text-center space-y-4" role="alert" aria-live="assertive">
      <div className="mx-auto w-12 h-12 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
        <ShieldCheck className="w-6 h-6" />
      </div>
      <div>
        <h3 className="text-base font-semibold text-amber-200">Additional verification required</h3>
        <p className="mt-1 text-xs text-slate-300 max-w-sm mx-auto">
          Your card issuer requires 3D Secure authentication to confirm your identity for this $1.00 USD transaction.
        </p>
      </div>

      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-700/60 text-xs text-slate-300">
        <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
        <span>Waiting for bank confirmation...</span>
      </div>

      {isSimulated && onSimulateAuthResult && (
        <div className="pt-3 border-t border-amber-500/20 space-y-2">
          <p className="text-[11px] text-slate-400 font-mono">Sandbox 3D Secure Simulation Challenge</p>
          <div className="flex justify-center gap-2">
            <button
              type="button"
              onClick={() => onSimulateAuthResult(true)}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors"
            >
              Simulate Bank Approval (Pass 3DS)
            </button>
            <button
              type="button"
              onClick={() => onSimulateAuthResult(false)}
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium transition-colors"
            >
              Simulate Bank Decline (Fail 3DS)
            </button>
          </div>
        </div>
      )}

      {onCompleteAuth && !isSimulated && (
        <button
          type="button"
          onClick={onCompleteAuth}
          className="inline-flex items-center gap-2 text-xs font-medium text-amber-400 hover:text-amber-300 underline underline-offset-4"
        >
          <span>Open bank verification popup</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
