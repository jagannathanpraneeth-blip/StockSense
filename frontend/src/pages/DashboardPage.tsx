import React, { useState, useEffect } from 'react';
import {
  Boxes,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowRightLeft,
  SlidersHorizontal,
  History,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import * as api from '../api/client';
import { DashboardStats } from '../types';

interface DashboardPageProps {
  onNavigate: (page: any) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const data = await api.getDashboardStats();
      setStats(data);
    } catch {
      // Fallback in case of temporary error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="p-6 sm:p-8 bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-950 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold uppercase tracking-wider text-purple-200 mb-3">
            <span>Stage 3: Full Inventory Movement Engine</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-2">
            Welcome back, {user?.name || 'Operator'}
          </h2>
          <p className="text-sm text-purple-100/90 leading-relaxed mb-6">
            StockSense is actively managing your end-to-end supply chain with incoming receipts, customer deliveries, internal transfers, and physical count reconciliations.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigate('receipts')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-purple-900 rounded-xl font-bold text-xs hover:bg-purple-50 transition-all shadow-md active:scale-95"
            >
              <ArrowDownToLine className="w-4 h-4 text-purple-600" />
              <span>Receipts</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onNavigate('deliveries')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-purple-600/80 hover:bg-purple-600 border border-purple-400/30 text-white rounded-xl font-bold text-xs transition-all active:scale-95"
            >
              <ArrowUpFromLine className="w-4 h-4 text-purple-200" />
              <span>Deliveries</span>
            </button>
            <button
              onClick={() => onNavigate('transfers')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600/80 hover:bg-indigo-600 border border-indigo-400/30 text-white rounded-xl font-bold text-xs transition-all active:scale-95"
            >
              <ArrowRightLeft className="w-4 h-4 text-indigo-200" />
              <span>Transfers</span>
            </button>
            <button
              onClick={() => onNavigate('adjustments')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl font-semibold text-xs transition-all active:scale-95"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>Physical Count</span>
            </button>
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute -right-16 -bottom-16 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Primary KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Products in Stock */}
        <div
          onClick={() => onNavigate('products')}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs cursor-pointer hover:border-purple-300 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Products in Stock
            </span>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Boxes className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-slate-900">
              {loading ? '...' : stats?.products.inStock ?? 0}
            </span>
            <span className="text-xs text-slate-400 font-medium">
              of {stats?.products.total ?? 0} SKUs
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs">
            {stats && stats.products.lowStock > 0 ? (
              <span className="text-amber-600 font-semibold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                {stats.products.lowStock} item(s) below reorder threshold
              </span>
            ) : (
              <span className="text-emerald-600 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                All stock levels healthy
              </span>
            )}
          </div>
        </div>

        {/* Deliveries */}
        <div
          onClick={() => onNavigate('deliveries')}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs cursor-pointer hover:border-purple-300 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Customer Deliveries
            </span>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <ArrowUpFromLine className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-slate-900">
              {loading ? '...' : stats?.operations.deliveries.total ?? 0}
            </span>
            <span className="text-xs text-slate-400 font-medium">Total Orders</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-purple-600 font-semibold">
            <Clock className="w-3.5 h-3.5" />
            <span>{stats?.operations.deliveries.pending ?? 0} pending fulfillment</span>
          </div>
        </div>

        {/* Internal Transfers */}
        <div
          onClick={() => onNavigate('transfers')}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs cursor-pointer hover:border-purple-300 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Internal Transfers
            </span>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-slate-900">
              {loading ? '...' : stats?.operations.transfers.total ?? 0}
            </span>
            <span className="text-xs text-slate-400 font-medium">Total Relocations</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-indigo-600 font-semibold">
            <Clock className="w-3.5 h-3.5" />
            <span>{stats?.operations.transfers.pending ?? 0} draft movements</span>
          </div>
        </div>

        {/* Physical Adjustments */}
        <div
          onClick={() => onNavigate('adjustments')}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs cursor-pointer hover:border-purple-300 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Cycle Adjustments
            </span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-slate-900">
              {loading ? '...' : stats?.operations.adjustments.total ?? 0}
            </span>
            <span className="text-xs text-slate-400 font-medium">Audits Recorded</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-600 font-semibold">
            <Clock className="w-3.5 h-3.5" />
            <span>{stats?.operations.adjustments.pending ?? 0} pending review</span>
          </div>
        </div>
      </div>

      {/* Operational Modules & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Core Capabilities */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Operational Workflows
          </h3>

          <div className="space-y-3">
            <div
              onClick={() => onNavigate('receipts')}
              className="p-3.5 bg-purple-50/50 hover:bg-purple-50 border border-purple-100/80 rounded-2xl cursor-pointer transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                  <ArrowDownToLine className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Incoming Receipts</h4>
                  <p className="text-[11px] text-slate-500">Receive supplier shipments with 4-decimal precision</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-purple-500 group-hover:translate-x-1 transition-transform" />
            </div>

            <div
              onClick={() => onNavigate('deliveries')}
              className="p-3.5 bg-purple-50/50 hover:bg-purple-50 border border-purple-100/80 rounded-2xl cursor-pointer transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                  <ArrowUpFromLine className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Delivery Orders</h4>
                  <p className="text-[11px] text-slate-500">Pick, pack, and validate customer shipments</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-purple-500 group-hover:translate-x-1 transition-transform" />
            </div>

            <div
              onClick={() => onNavigate('transfers')}
              className="p-3.5 bg-indigo-50/50 hover:bg-indigo-50 border border-indigo-100/80 rounded-2xl cursor-pointer transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <ArrowRightLeft className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Internal Transfers</h4>
                  <p className="text-[11px] text-slate-500">Relocate stock between warehouses and bins</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-indigo-500 group-hover:translate-x-1 transition-transform" />
            </div>

            <div
              onClick={() => onNavigate('adjustments')}
              className="p-3.5 bg-amber-50/50 hover:bg-amber-50 border border-amber-100/80 rounded-2xl cursor-pointer transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Inventory Adjustments</h4>
                  <p className="text-[11px] text-slate-500">Cycle counts & stale-count guarded reconciliations</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-amber-500 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>

        {/* Live Stock Ledger Audit Feed */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-purple-600" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Live Stock Ledger Activity
                </h3>
              </div>
              <button
                onClick={() => onNavigate('history')}
                className="text-xs text-purple-600 hover:text-purple-700 font-bold flex items-center gap-1"
              >
                <span>View Full Audit</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400 text-xs">
                <RefreshCw className="w-5 h-5 animate-spin text-purple-600 mb-2" />
                <span>Loading latest stock movements...</span>
              </div>
            ) : !stats?.recentMoves || stats.recentMoves.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No stock transactions logged yet. Complete a receipt or adjustment to record entries.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 mt-2">
                {stats.recentMoves.slice(0, 5).map((move) => (
                  <div key={move.id} className="py-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                          move.deltaQty > 0
                            ? 'bg-emerald-50 text-emerald-700'
                            : move.deltaQty < 0
                            ? 'bg-rose-50 text-rose-700'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {move.deltaQty > 0 ? '+' : move.deltaQty < 0 ? '−' : '='}
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 block">{move.product?.name}</span>
                        <span className="text-[11px] text-slate-400">
                          {move.referenceDoc} • {move.location?.warehouse?.name} - {move.location?.name}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span
                        className={`font-mono font-bold block ${
                          move.deltaQty > 0
                            ? 'text-emerald-600'
                            : move.deltaQty < 0
                            ? 'text-rose-600'
                            : 'text-slate-600'
                        }`}
                      >
                        {move.deltaQty > 0 ? `+${Number(move.deltaQty).toFixed(4)}` : Number(move.deltaQty).toFixed(4)}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Bal: {Number(move.balanceAfter).toFixed(4)} {move.product?.uom}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Total Logged Movements: {stats?.ledgerMoves ?? 0}</span>
            <span className="text-[11px] text-purple-600 font-semibold">Cryptographically Auditable</span>
          </div>
        </div>
      </div>
    </div>
  );
};
