import React from 'react';
import { Loader2 } from 'lucide-react';

interface PaymentLoadingProps {
  message?: string;
  subtext?: string;
}

export const PaymentLoading: React.FC<PaymentLoadingProps> = ({
  message = 'Initializing secure payment session...',
  subtext = 'Contacting payment processor and securing session token',
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center" role="status" aria-live="polite">
      <div className="relative mb-5 flex items-center justify-center">
        <div className="w-14 h-14 rounded-full border-2 border-indigo-500/20 animate-ping absolute" />
        <div className="w-12 h-12 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin flex items-center justify-center bg-slate-900/60 shadow-lg shadow-indigo-500/10">
          <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
        </div>
      </div>
      <h3 className="text-base font-semibold text-slate-100">{message}</h3>
      <p className="mt-1 text-xs text-slate-400 max-w-xs">{subtext}</p>
    </div>
  );
};
