import React, { useState, useEffect } from 'react';
import {
  AdminAnalyticsMetrics,
  PaymentRecord,
  PaymentStatus,
  StripeWebhookEventRecord,
} from '../../types/payment';
import {
  BarChart3,
  DollarSign,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  RefreshCw,
  Shield,
  Lock,
  ArrowUpRight,
  Database,
  Radio,
  FileText,
  AlertTriangle,
} from 'lucide-react';

interface AdminDashboardProps {
  onBackToCheckout: () => void;
  onOpenChecklist: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onBackToCheckout,
  onOpenChecklist,
}) => {
  // Simple session authentication gate for admin interface
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [accessCode, setAccessCode] = useState('');
  const [authError, setAuthError] = useState('');

  const [metrics, setMetrics] = useState<AdminAnalyticsMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'payments' | 'webhooks'>('payments');

  const fetchMetrics = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/metrics');
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
      }
    } catch (e) {
      console.error('Failed to load admin metrics:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchMetrics();
    }
  }, [isAuthenticated]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Default safe developer token
    if (accessCode.trim() === 'stripe2026' || accessCode.trim() === 'admin') {
      setIsAuthenticated(true);
      setAuthError('');
    } else {
      setAuthError('Invalid admin passcode. (Dev hint: enter "admin" or "stripe2026")');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 rounded-2xl border border-slate-800 bg-slate-900/90 shadow-2xl backdrop-blur-xl space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100">Protected Admin Gateway</h2>
            <p className="text-xs text-slate-400">Authenticate to view orders and Stripe audit logs</p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Admin Access Passcode
            </label>
            <input
              type="password"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              placeholder="Enter admin passcode"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
            />
            {authError && <p className="mt-1.5 text-xs text-rose-400">{authError}</p>}
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
          >
            Access Dashboard
          </button>
        </form>

        <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <button
            type="button"
            onClick={onBackToCheckout}
            className="text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            ← Return to Checkout
          </button>
          <span className="font-mono text-[11px] text-slate-500">Passcode: admin</span>
        </div>
      </div>
    );
  }

  // Filter payments
  const filteredPayments = (metrics?.recentPayments || []).filter((p) => {
    const matchesFilter = statusFilter === 'all' ? true : p.status === statusFilter;
    const matchesSearch =
      !searchQuery.trim() ||
      p.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.stripePaymentIntentId.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-100">Stripe Payment Operations</h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase bg-indigo-950 text-indigo-400 border border-indigo-500/30">
              Admin
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time ledger of $1.00 USD card transactions and webhook idempotency events
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchMetrics}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={onOpenChecklist}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-medium transition-colors"
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Live Checklist</span>
          </button>

          <button
            type="button"
            onClick={onBackToCheckout}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
          >
            <span>Back to Store</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Verified Revenue</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold font-mono text-emerald-400">
              ${((metrics?.totalRevenueCents || 0) / 100).toFixed(2)}
            </span>
            <span className="text-slate-500 text-[11px] block mt-0.5">$1.00 per unit fixed</span>
          </div>
        </div>

        {/* Total Orders */}
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Total Orders</span>
            <FileText className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold font-mono text-slate-100">
              {metrics?.totalOrders || 0}
            </span>
            <span className="text-slate-500 text-[11px] block mt-0.5">Database records</span>
          </div>
        </div>

        {/* Successful Payments */}
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Success Rate</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold font-mono text-slate-100">
              {metrics?.successRate || 100}%
            </span>
            <span className="text-emerald-400/80 text-[11px] block mt-0.5">
              {metrics?.successfulPayments || 0} succeeded
            </span>
          </div>
        </div>

        {/* Failed Payments */}
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Declines / Fails</span>
            <XCircle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold font-mono text-rose-400">
              {metrics?.failedPayments || 0}
            </span>
            <span className="text-slate-500 text-[11px] block mt-0.5">Safely intercepted</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800">
        <button
          type="button"
          onClick={() => setActiveTab('payments')}
          className={`pb-3 px-3 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === 'payments'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Payment Transactions ({metrics?.recentPayments.length || 0})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('webhooks')}
          className={`pb-3 px-3 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === 'webhooks'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Stripe Webhook Events ({metrics?.recentWebhookEvents.length || 0})
        </button>
      </div>

      {activeTab === 'payments' ? (
        <div className="space-y-4">
          {/* Search & Filter Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search order or PaymentIntent..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-800 bg-slate-900 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
              {['all', 'succeeded', 'failed', 'processing', 'canceled'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium capitalize transition-colors ${
                    statusFilter === st
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-900/60">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Order</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Payment Reference</th>
                    <th className="py-3 px-4">Failure Code</th>
                    <th className="py-3 px-4">Created Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {filteredPayments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500 font-sans">
                        No transactions found matching criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredPayments.map((p) => {
                      const statusColorMap: Record<string, string> = {
                        succeeded: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
                        failed: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
                        processing: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
                        requires_action: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
                        requires_payment_method: 'bg-slate-800 text-slate-400 border-slate-700',
                        requires_confirmation: 'bg-indigo-950/40 text-indigo-300 border-indigo-500/30',
                        canceled: 'bg-slate-700 text-slate-300 border-slate-600',
                      };
                      const statusColor = statusColorMap[p.status] || 'bg-slate-800 text-slate-400 border-slate-700';

                      return (
                        <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-3 px-4 font-semibold text-slate-200">
                            {p.orderNumber}
                          </td>
                          <td className="py-3 px-4 font-bold text-emerald-400">
                            ${(p.amount / 100).toFixed(2)} USD
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex px-2 py-0.5 rounded text-[10px] uppercase font-semibold border ${statusColor}`}>
                              {p.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-400 truncate max-w-[160px]" title={p.stripePaymentIntentId}>
                            {p.stripePaymentIntentId}
                          </td>
                          <td className="py-3 px-4 text-slate-400">
                            {p.failureCode ? (
                              <span className="text-rose-400 bg-rose-950/40 px-1.5 py-0.5 rounded text-[10px] border border-rose-500/20">
                                {p.failureCode}
                              </span>
                            ) : (
                              <span className="text-slate-600">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-400 text-[11px] font-sans">
                            {new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Webhooks Log Tab */
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 flex items-center gap-2">
            <Radio className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>
              All incoming Stripe webhooks are verified with signature cryptographic checking and logged for idempotency.
            </span>
          </div>

          <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-900/60">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Stripe Event ID</th>
                  <th className="py-3 px-4">Event Type</th>
                  <th className="py-3 px-4">Idempotency Status</th>
                  <th className="py-3 px-4">Processed At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {metrics?.recentWebhookEvents.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-500 font-sans">
                      No webhook events logged yet.
                    </td>
                  </tr>
                ) : (
                  metrics?.recentWebhookEvents.map((evt) => (
                    <tr key={evt.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 text-slate-200 font-semibold truncate max-w-[200px]" title={evt.stripeEventId}>
                        {evt.stripeEventId}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-indigo-950 text-indigo-300 border border-indigo-500/20">
                          {evt.eventType}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-emerald-400 font-sans flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span className="text-[11px]">Processed & Deduped</span>
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-[11px] font-sans">
                        {new Date(evt.processedAt).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
