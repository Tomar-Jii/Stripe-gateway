/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Product } from './types/payment';
import { SERVER_PRODUCTS } from './lib/payments/products';
import { StripeStatusBanner } from './components/payment/StripeStatusBanner';
import { ProductCatalog } from './components/payment/ProductCatalog';
import { PaymentForm } from './components/payment/PaymentForm';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { TestCardsModal } from './components/payment/TestCardsModal';
import { LiveChecklistModal } from './components/admin/LiveChecklistModal';
import {
  CreditCard,
  ShieldCheck,
  Lock,
  ArrowRight,
  ExternalLink,
  Layers,
  Sparkles,
  Server,
  Zap,
} from 'lucide-react';

export default function App() {
  const [products, setProducts] = useState<Product[]>(Object.values(SERVER_PRODUCTS));
  const [selectedProduct, setSelectedProduct] = useState<Product>(
    Object.values(SERVER_PRODUCTS)[0]
  );

  const [activeView, setActiveView] = useState<'checkout' | 'admin'>('checkout');
  const [isTestCardsModalOpen, setIsTestCardsModalOpen] = useState(false);
  const [isLiveChecklistOpen, setIsLiveChecklistOpen] = useState(false);

  const [systemConfig, setSystemConfig] = useState<{
    stripeMode: 'live' | 'test' | 'simulator';
    isPostgresConnected: boolean;
  }>({
    stripeMode: 'simulator',
    isPostgresConnected: false,
  });

  useEffect(() => {
    // Fetch live system configuration from server
    fetch('/api/config')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setSystemConfig({
            stripeMode: data.mode || 'simulator',
            isPostgresConnected: Boolean(data.postgresConfigured),
          });
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Top Stripe Status Bar */}
      <StripeStatusBanner
        stripeMode={systemConfig.stripeMode}
        isPostgresConnected={systemConfig.isPostgresConnected}
        onOpenChecklist={() => setIsLiveChecklistOpen(true)}
        onOpenTestCardsModal={() => setIsTestCardsModalOpen(true)}
      />

      {/* Main Navbar */}
      <header className="border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-white">
                  PayPlatform
                </span>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                  $1.00 USD
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Strict Card-Only Stripe Payment Gateway</p>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveView('checkout')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeView === 'checkout'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              Checkout ($1.00)
            </button>

            <button
              type="button"
              onClick={() => setActiveView('admin')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeView === 'admin'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              Admin Dashboard
            </button>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
        {activeView === 'checkout' ? (
          <div className="space-y-8">
            {/* Hero / Value Guarantee Banner */}
            <div className="relative rounded-3xl border border-indigo-500/20 bg-gradient-to-r from-slate-900 via-indigo-950/20 to-slate-900 p-6 sm:p-8 overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="max-w-2xl relative z-10 space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Production-Grade Stripe Architecture</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  Secure $1.00 USD Card Payment Gateway
                </h1>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Every product is strictly fixed at $1.00 USD. All transactions are created server-side,
                  isolated to card payments only, and verified through Stripe PaymentIntents with webhook idempotency.
                </p>
              </div>

              {/* Guarantees Grid */}
              <div className="mt-6 pt-6 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div className="flex items-center gap-2 text-slate-300">
                  <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Zero raw card data stored</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <CreditCard className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span>Card payments only</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <Server className="w-4 h-4 text-sky-400 shrink-0" />
                  <span>Server-authoritative $1.00</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Vercel serverless ready</span>
                </div>
              </div>
            </div>

            {/* Split Checkout Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column: Product Selection & Architectural Notes */}
              <div className="lg:col-span-6 space-y-6">
                <ProductCatalog
                  products={products}
                  selectedProduct={selectedProduct}
                  onSelectProduct={(p) => setSelectedProduct(p)}
                />

                {/* Core Business Rules Card */}
                <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-400" />
                    <span>Core Security & Pricing Policies</span>
                  </h4>
                  <ul className="text-xs text-slate-400 space-y-2 leading-relaxed">
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-400 font-bold">•</span>
                      <span><strong>$1.00 USD Guarantee:</strong> Price amounts sent by browsers are strictly ignored. The server fixes all PaymentIntents to 100 cents USD.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-indigo-400 font-bold">•</span>
                      <span><strong>Card Only:</strong> PayPal, cryptocurrency, BNPL, bank transfers, and Cash App are rejected at both API and Stripe Elements levels.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-sky-400 font-bold">•</span>
                      <span><strong>Duplicate Protection:</strong> Idempotency tokens and database unique constraints prevent double-charging on multiple clicks or network retries.</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Right Column: Premium Fintech Payment Card */}
              <div className="lg:col-span-6">
                <PaymentForm
                  product={selectedProduct}
                  onChooseAnotherProduct={() => {
                    const nextIndex = (products.findIndex((p) => p.id === selectedProduct.id) + 1) % products.length;
                    setSelectedProduct(products[nextIndex]);
                  }}
                />
              </div>
            </div>
          </div>
        ) : (
          /* Protected Admin Dashboard View */
          <AdminDashboard
            onBackToCheckout={() => setActiveView('checkout')}
            onOpenChecklist={() => setIsLiveChecklistOpen(true)}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-800 bg-slate-950/80 py-8 text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-slate-400">
            <Lock className="w-4 h-4 text-emerald-400" />
            <span>End-to-End Encrypted • Powered by Stripe Elements & Node SDK</span>
          </div>

          <div className="flex items-center gap-4 text-slate-400 text-xs">
            <button
              type="button"
              onClick={() => setIsTestCardsModalOpen(true)}
              className="hover:text-slate-200 transition-colors"
            >
              Test Cards Matrix
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => setIsLiveChecklistOpen(true)}
              className="hover:text-slate-200 transition-colors"
            >
              Live Deployment Checklist
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <TestCardsModal
        isOpen={isTestCardsModalOpen}
        onClose={() => setIsTestCardsModalOpen(false)}
      />

      <LiveChecklistModal
        isOpen={isLiveChecklistOpen}
        onClose={() => setIsLiveChecklistOpen(false)}
        isStripeLive={systemConfig.stripeMode === 'live'}
      />
    </div>
  );
}
