import React from 'react';
import {
  LayoutDashboard,
  Boxes,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowLeftRight,
  SlidersHorizontal,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { Badge } from '../components/common/Badge';

interface DashboardPageProps {
  onNavigate: (page: any) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  return (
    <div className="space-y-6">
      {/* Stage 1 Active Notice Banner */}
      <div className="p-6 bg-linear-to-r from-purple-900 via-indigo-900 to-slate-900 rounded-2xl text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold uppercase tracking-wider text-purple-200 mb-3">
            <span>Stage 1: Core Foundation & Catalogue Active</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white mb-2">
            Welcome to StockSense Inventory Workspace
          </h2>
          <p className="text-sm text-purple-100/90 leading-relaxed mb-6">
            Stage 1 inventory foundation is running with live database-backed Product Management and Multi-Warehouse Location hierarchies. Operational workflows (Receipts, Deliveries, Transfers, Adjustments, and Real-time Dashboard KPIs) are scheduled for Stage 2.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigate('products')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-purple-900 rounded-xl font-semibold text-xs hover:bg-purple-50 transition-all shadow-md active:scale-95"
            >
              <Boxes className="w-4 h-4 text-purple-600" />
              <span>Manage Products & Stock Levels</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onNavigate('settings')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-purple-700/60 hover:bg-purple-700/80 border border-purple-400/30 text-white rounded-xl font-semibold text-xs transition-all active:scale-95"
            >
              <span>Warehouse Settings</span>
            </button>
          </div>
        </div>

        {/* Decorative background circle */}
        <div className="absolute -right-16 -bottom-16 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Planned Stage 2 KPI Overview (Architectural Preview) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LayoutDashboard className="w-4 h-4 text-purple-600" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
              Planned Dashboard KPI Architecture (Stage 2)
            </h3>
          </div>
          <Badge variant="neutral" size="sm">Pending Stage 2 Operational Metrics</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-xs relative opacity-90">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500">Incoming Receipts</span>
              <ArrowDownToLine className="w-4 h-4 text-purple-600" />
            </div>
            <p className="text-xs text-slate-500 leading-normal">
              Real-time counter of pending vendor receipts in <em>Ready</em> or <em>Waiting</em> status.
            </p>
            <div className="mt-3 text-[11px] font-mono text-purple-600 font-semibold">
              Planned: Live aggregation via ledger
            </div>
          </div>

          <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-xs relative opacity-90">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500">Outgoing Deliveries</span>
              <ArrowUpFromLine className="w-4 h-4 text-purple-600" />
            </div>
            <p className="text-xs text-slate-500 leading-normal">
              Customer order delivery lines queued for picking, packing, and validation.
            </p>
            <div className="mt-3 text-[11px] font-mono text-purple-600 font-semibold">
              Planned: Insufficient stock check
            </div>
          </div>

          <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-xs relative opacity-90">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500">Internal Transfers</span>
              <ArrowLeftRight className="w-4 h-4 text-purple-600" />
            </div>
            <p className="text-xs text-slate-500 leading-normal">
              Scheduled inter-warehouse and inter-rack inventory movements.
            </p>
            <div className="mt-3 text-[11px] font-mono text-purple-600 font-semibold">
              Planned: Quantity-preserving ledger
            </div>
          </div>

          <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-xs relative opacity-90">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500">Inventory Adjustments</span>
              <SlidersHorizontal className="w-4 h-4 text-purple-600" />
            </div>
            <p className="text-xs text-slate-500 leading-normal">
              Cycle count reconciliation records and physical inventory variances.
            </p>
            <div className="mt-3 text-[11px] font-mono text-purple-600 font-semibold">
              Planned: Signed delta logging
            </div>
          </div>
        </div>
      </div>

      {/* Planned Dynamic Filters Architecture */}
      <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-2">
          <Layers className="w-4 h-4 text-purple-600" />
          <span>Stage 2 Dynamic Filter Matrix Specification</span>
        </h4>
        <p className="text-xs text-slate-600 leading-relaxed mb-4">
          According to the StockSense specification, the landing dashboard in Stage 2 will provide a multi-dimensional filtering engine allowing operators to slice inventory movements by:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <span className="font-semibold text-slate-900 block mb-1">1. Document Type</span>
            <span className="text-slate-500">Receipts, Deliveries, Internal Transfers, Adjustments</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <span className="font-semibold text-slate-900 block mb-1">2. Document Status</span>
            <span className="text-slate-500">Draft, Waiting, Ready, Done, Canceled</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <span className="font-semibold text-slate-900 block mb-1">3. Location Filter</span>
            <span className="text-slate-500">By Warehouse, Input Bay, Output Dock, or Storage Rack</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <span className="font-semibold text-slate-900 block mb-1">4. Product Category</span>
            <span className="text-slate-500">Raw Materials, Electronics, Hardware, Finished Goods</span>
          </div>
        </div>
      </div>
    </div>
  );
};
