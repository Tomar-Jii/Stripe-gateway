import React from 'react';
import { X, CreditCard, Shield, ExternalLink, Check, Copy } from 'lucide-react';

interface TestCardsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTestCard?: (cardNumber: string, exp: string, cvc: string) => void;
}

const OFFICIAL_STRIPE_TEST_CARDS = [
  {
    name: 'Standard Visa (Success)',
    number: '4242 •••• •••• 4242',
    rawNumber: '4242424242424242',
    exp: '12/28',
    cvc: '123',
    outcome: 'succeeded',
    badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    description: 'Instant card payment approval without additional challenges.',
  },
  {
    name: '3D Secure / 2FA Challenge',
    number: '4000 •••• •••• 3155',
    rawNumber: '4000000000003155',
    exp: '12/28',
    cvc: '123',
    outcome: 'requires_action',
    badge: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    description: 'Triggers simulated 3D Secure bank identity authentication.',
  },
  {
    name: 'Generic Card Decline',
    number: '4000 •••• •••• 0002',
    rawNumber: '4000000000000002',
    exp: '12/28',
    cvc: '123',
    outcome: 'card_declined',
    badge: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    description: 'Issuer declines transaction with code: card_declined.',
  },
  {
    name: 'Insufficient Funds',
    number: '4000 •••• •••• 9995',
    rawNumber: '4000000000009995',
    exp: '12/28',
    cvc: '123',
    outcome: 'insufficient_funds',
    badge: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    description: 'Decline code: insufficient_funds. Safe message displayed.',
  },
  {
    name: 'Expired Card',
    number: '4000 •••• •••• 0069',
    rawNumber: '4000000000000069',
    exp: '01/20',
    cvc: '123',
    outcome: 'expired_card',
    badge: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    description: 'Card expiration failure with safe customer guidance.',
  },
  {
    name: 'Incorrect CVC Code',
    number: '4000 •••• •••• 0127',
    rawNumber: '4000000000000127',
    exp: '12/28',
    cvc: '999',
    outcome: 'incorrect_cvc',
    badge: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    description: 'CVC verification failure code: incorrect_cvc.',
  },
];

export const TestCardsModal: React.FC<TestCardsModalProps> = ({ isOpen, onClose, onSelectTestCard }) => {
  const [copiedIndex, setCopiedIndex] = React.useState<number | null>(null);

  if (!isOpen) return null;

  const handleCopy = (card: typeof OFFICIAL_STRIPE_TEST_CARDS[0], index: number) => {
    navigator.clipboard.writeText(card.rawNumber);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 1800);
    if (onSelectTestCard) {
      onSelectTestCard(card.rawNumber, card.exp, card.cvc);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Official Stripe Test Cards</h3>
              <p className="text-xs text-slate-400">Card-only testing credentials for Stripe test mode</p>
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

        {/* List of cards */}
        <div className="p-5 overflow-y-auto space-y-3">
          <div className="p-3 rounded-xl bg-indigo-950/20 border border-indigo-500/20 text-xs text-indigo-300">
            <strong>Stripe Security Rule:</strong> Never use real card numbers in test mode. These official test cards simulate real issuer decline codes and 3DS behaviors securely.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {OFFICIAL_STRIPE_TEST_CARDS.map((card, idx) => (
              <div
                key={card.name}
                className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 hover:border-slate-700 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-semibold text-xs text-slate-200">{card.name}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${card.badge}`}>
                      {card.outcome}
                    </span>
                  </div>
                  <div className="font-mono text-sm text-slate-100 font-semibold tracking-wider mb-1">
                    {card.number}
                  </div>
                  <p className="text-[11px] text-slate-400 mb-3">{card.description}</p>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-mono">Exp: {card.exp} | CVC: {card.cvc}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(card, idx)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white transition-colors text-xs"
                  >
                    {copiedIndex === idx ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/90 flex items-center justify-between text-xs text-slate-400">
          <span>Amount for all transactions is strictly fixed at $1.00 USD</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors font-medium text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
