import React from 'react';
import { RefreshCw } from 'lucide-react';

interface PaymentRetryButtonProps {
  onRetry: () => void;
  isRetrying?: boolean;
  label?: string;
  className?: string;
}

export const PaymentRetryButton: React.FC<PaymentRetryButtonProps> = ({
  onRetry,
  isRetrying = false,
  label = 'Try Again',
  className = '',
}) => {
  return (
    <button
      type="button"
      onClick={onRetry}
      disabled={isRetrying}
      className={`inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-medium text-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white shadow-lg shadow-indigo-600/25 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      aria-label={label}
    >
      <RefreshCw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
      <span>{isRetrying ? 'Resetting payment...' : label}</span>
    </button>
  );
};
