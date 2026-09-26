import React, { useState, useEffect } from 'react';
import {
  Boxes,
  ArrowDownToLine,
  History,
  ArrowRight,
  Building2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import * as api from '../api/client';

interface DashboardPageProps {
  onNavigate: (page: any) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [productCount, setProductCount] = useState(0);
  const [receiptCount, setReceiptCount] = useState(0);
  const [ledgerCount, setLedgerCount] = useState(0);
  const [warehouseCount, setWarehouseCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [prods, receipts, ledger, whs] = await Promise.all([
          api.getProducts(),
          api.getReceipts(),
          api.getLedgerEntries(),
          api.getWarehouses(),
        ]);
        setProductCount(prods.length);
        setReceiptCount(receipts.length);
        setLedgerCount(ledger.length);
        setWarehouseCount(whs.length);
      } catch {
        // ignore in case of unauth or error
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, []);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="p-6 sm:p-8 bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-950 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold uppercase tracking-wider text-purple-200 mb-3">
            <span>Stage 2: Auth & Stock Receipts Live</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-2">
            Welcome back, {user?.name || 'Operator'}
          </h2>
          <p className="text-sm text-purple-100/90 leading-relaxed mb-6">
            StockSense is operating with authenticated session security, incoming stock receipt validation, 4-decimal precision arithmetic, and immutable stock ledger auditing.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigate('receipts')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-purple-900 rounded-xl font-bold text-xs hover:bg-purple-50 transition-all shadow-md active:scale-95"
            >
              <ArrowDownToLine className="w-4 h-4 text-purple-600" />
              <span>Process Incoming Receipts</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onNavigate('history')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-purple-700/60 hover:bg-purple-700/80 border border-purple-400/30 text-white rounded-xl font-semibold text-xs transition-all active:scale-95"
            >
              <History className="w-4 h-4" />
              <span>View Stock Ledger</span>
            </button>
            <button
              onClick={() => onNavigate('products')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl font-semibold text-xs transition-all active:scale-95"
            >
              <Boxes className="w-4 h-4" />
              <span>Product Catalog</span>
            </button>
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute -right-16 -bottom-16 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Live System Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => onNavigate('receipts')}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs cursor-pointer hover:border-purple-300 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Incoming Receipts
            </span>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <ArrowDownToLine className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{loading ? '-' : receiptCount}</p>
          <p className="text-[11px] text-purple-600 font-semibold mt-1">Stage 2 Active &bull; Click to view</p>
        </div>

        <div
          onClick={() => onNavigate('products')}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs cursor-pointer hover:border-purple-300 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Active Products
            </span>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Boxes className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{loading ? '-' : productCount}</p>
          <p className="text-[11px] text-indigo-600 font-semibold mt-1">4-Decimal Precision &bull; View</p>
        </div>

        <div
          onClick={() => onNavigate('history')}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs cursor-pointer hover:border-purple-300 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Stock Ledger Moves
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <History className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{loading ? '-' : ledgerCount}</p>
          <p className="text-[11px] text-emerald-600 font-semibold mt-1">Immutable Audit Log &bull; View</p>
        </div>

        <div
          onClick={() => onNavigate('settings')}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs cursor-pointer hover:border-purple-300 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Warehouses & Hubs
            </span>
            <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{loading ? '-' : warehouseCount}</p>
          <p className="text-[11px] text-slate-500 font-semibold mt-1">Multi-Warehouse Hierarchy</p>
        </div>
      </div>
    </div>
  );
};
