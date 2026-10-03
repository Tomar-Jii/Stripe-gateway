import React from 'react';
import { Product } from '../../types/payment';
import { Check, CreditCard, ShieldCheck } from 'lucide-react';

interface ProductCatalogProps {
  products: Product[];
  selectedProduct: Product | null;
  onSelectProduct: (product: Product) => void;
  disabled?: boolean;
}

export const ProductCatalog: React.FC<ProductCatalogProps> = ({
  products,
  selectedProduct,
  onSelectProduct,
  disabled = false,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
          Select Product ($1.00 USD)
        </h3>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-900 border border-slate-800 text-indigo-300">
          <CreditCard className="w-3.5 h-3.5" />
          Card Only
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {products.map((product) => {
          const isSelected = selectedProduct?.id === product.id;
          return (
            <button
              key={product.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelectProduct(product)}
              className={`text-left p-4 rounded-xl border transition-all relative flex flex-col justify-between focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                isSelected
                  ? 'border-indigo-500 bg-indigo-950/20 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500'
                  : 'border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900/90'
              } ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              {isSelected && (
                <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
              )}

              <div>
                <div className="flex items-center justify-between pr-6">
                  <h4 className="font-semibold text-slate-100 text-sm">{product.name}</h4>
                </div>
                <p className="mt-1 text-xs text-slate-400 leading-relaxed line-clamp-2">
                  {product.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-emerald-400">$1.00 USD</span>
                <span className="text-[11px] text-slate-500">100 cents</span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="rounded-xl bg-slate-900/40 border border-slate-800/60 p-3 flex items-center gap-2.5 text-xs text-slate-400">
        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
        <span>All transactions strictly fixed at $1.00 USD enforced by server-side catalog.</span>
      </div>
    </div>
  );
};
