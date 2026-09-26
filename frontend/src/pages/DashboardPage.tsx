import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Building2,
  Tag,
  Calendar,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import * as api from '../api/client';
import { DashboardStats, Warehouse, Category, Location } from '../types';

interface DashboardPageProps {
  onNavigate: (page: any) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const requestId = useRef(0);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [error, setError] = useState('');

  // Dynamic Dashboard Filters
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');

  useEffect(() => {
    const loadMetadata = async () => {
      try {
        const [whList, catList, locList] = await Promise.all([
          api.getWarehouses(),
          api.getCategories(),
          api.getLocations(),
        ]);
        setWarehouses(whList);
        setLocations(locList);
        setCategories(catList);
      } catch {
        // ignore
      }
    };
    loadMetadata();
  }, []);

  const loadDashboardData = useCallback(async (background = false) => {
    const current = ++requestId.current;
    if (!background) setLoading(true);
    setError('');
    try {
      const data = await api.getDashboardStats(
        selectedWarehouseId || undefined,
        selectedCategoryId || undefined,
        { locationId: selectedLocationId, type: selectedType, status: selectedStatus }
      );
      if (current !== requestId.current) return;
      setStats(data);
      setUpdatedAt(new Date());
    } catch (e: any) {
      if (current !== requestId.current) return;
      setStats(null);
      setError(e.message || 'Dashboard could not load. Please retry.');
    } finally {
      if (current === requestId.current) setLoading(false);
    }
  }, [selectedWarehouseId, selectedCategoryId, selectedLocationId, selectedType, selectedStatus]);

  useEffect(() => {
    loadDashboardData();
    const timer = setInterval(() => { if (document.visibilityState === 'visible') loadDashboardData(true); }, 15000);
    return () => { clearInterval(timer); requestId.current++; };
  }, [loadDashboardData]);

  return (
    <div className="space-y-6">
      {error && <div role="alert" className="p-4 bg-rose-50 text-rose-700 rounded-xl">{error}</div>}
      <p className="text-xs text-slate-500">Updates every 15 seconds{updatedAt ? ` · Last updated ${updatedAt.toLocaleTimeString()}` : ''}</p>
      {/* Welcome Banner */}
      <div className="p-6 sm:p-8 bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-950 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold uppercase tracking-wider text-purple-200 mb-3">
            <span>Inventory Overview</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-2">
            Welcome back, {user?.name || 'Operator'}
          </h2>
          <p className="text-sm text-purple-100/90 leading-relaxed mb-6">
            Track stock across your warehouses, manage daily operations, and spot items that need replenishment.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigate('receipts')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-purple-900 rounded-xl font-bold text-xs hover:bg-purple-50 transition-all shadow-md active:scale-95"
            >
              <ArrowDownToLine className="w-4 h-4 text-purple-600" />
              <span>Incoming Receipts</span>
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

      {/* Dynamic Dashboard Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Warehouse Filter */}
          <div className="flex items-center gap-2 min-w-[200px]">
            <Building2 className="w-4 h-4 text-purple-600 shrink-0" />
            <select
              value={selectedWarehouseId}
              onChange={(e) => { setSelectedWarehouseId(e.target.value); setSelectedLocationId(''); }}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
            >
              <option value="">All Warehouses (Global)</option>
              {warehouses.map((wh) => (
                <option key={wh.id} value={wh.id}>
                  {wh.name} ({wh.code})
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2 min-w-[200px]">
            <Tag className="w-4 h-4 text-purple-600 shrink-0" />
            <select
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <select aria-label="Location filter" value={selectedLocationId} onChange={e => setSelectedLocationId(e.target.value)} className="px-3 py-2 border rounded-lg text-xs">
            <option value="">All locations</option>
            {locations.filter(l => !selectedWarehouseId || l.warehouseId === selectedWarehouseId).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          <select aria-label="Document type filter" value={selectedType} onChange={e => setSelectedType(e.target.value)} className="px-3 py-2 border rounded-lg text-xs">
            <option value="">All document types</option>
            {['RECEIPT','DELIVERY','INTERNAL_TRANSFER','ADJUSTMENT'].map(t => <option key={t} value={t}>{t.replace(/_/g,' ')}</option>)}
          </select>
          <select aria-label="Status filter" value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)} className="px-3 py-2 border rounded-lg text-xs">
            <option value="">All statuses</option>
            {['DRAFT','WAITING','READY','DONE','CANCELED'].map(t => <option key={t}>{t}</option>)}
          </select>
          {(selectedWarehouseId || selectedCategoryId || selectedLocationId || selectedType || selectedStatus) && (
            <button
              onClick={() => {
                setSelectedWarehouseId('');
                setSelectedCategoryId('');
                setSelectedLocationId(''); setSelectedType(''); setSelectedStatus('');
              }}
              className="text-xs text-purple-600 hover:text-purple-800 font-semibold px-2 py-1"
            >
              Reset Filters
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 shrink-0">
          <button
            onClick={() => loadDashboardData()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 text-slate-700 font-semibold transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-purple-600' : ''}`} />
            <span>Refresh Stats</span>
          </button>
        </div>
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
              Distinct SKUs In Stock
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
              of {stats?.products.total ?? 0} SKUs; {stats?.products.outOfStock ?? 0} out of stock
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs">
            {stats && stats.products.lowStock > 0 ? (
              <span className="text-amber-600 font-semibold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                {stats.products.lowStock} item(s) at or below reorder threshold
              </span>
            ) : (
              <span className="text-emerald-600 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                No company-wide reorder alerts
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
            <span className="text-xs text-slate-400 font-medium">Total Moves</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs font-semibold">
            <span className="text-indigo-600 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {stats?.operations.transfers.pending ?? 0} pending
            </span>
            <span className="text-purple-600 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {stats?.operations.transfers.scheduled ?? 0} scheduled
            </span>
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

      <section className="bg-white rounded-2xl border p-4">
        <h3 className="font-semibold mb-2">Operations matching your filters</h3>
        <p className="text-xs text-slate-500 mb-3">Showing the latest 50 documents. Type and status filter operations and movement history; stock counts use warehouse, location, and category. Reorder alerts use company-wide product thresholds.</p>
        <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead><tr><th className="p-2">Reference</th><th>Type</th><th>Status</th><th>Partner</th><th>Scheduled</th></tr></thead>
        <tbody>{stats?.filteredOperations?.map(op => <tr key={op.id} className="border-t"><td className="p-2"><button className="text-purple-700" onClick={() => onNavigate(({RECEIPT:'receipts',DELIVERY:'deliveries',INTERNAL_TRANSFER:'transfers',ADJUSTMENT:'adjustments'} as Record<string,string>)[op.type])}>{op.reference}</button></td><td>{op.type.replace(/_/g,' ')}</td><td>{op.status}</td><td>{op.partner || '—'}</td><td>{op.expectedDate ? new Date(op.expectedDate).toLocaleDateString() : '—'}</td></tr>)}</tbody></table></div>
        {!loading && !stats?.filteredOperations?.length && <p className="text-sm text-slate-500 py-4">No operations match these filters.</p>}
      </section>
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
                  <p className="text-[11px] text-slate-500">
                    {stats?.operations.receipts.pending ?? 0} orders awaiting validation
                  </p>
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
                  <p className="text-[11px] text-slate-500">Reconcile recorded stock with physical counts</p>
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
                No stock transactions logged for the selected filter.
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
                          {move.referenceDoc} • {move.location?.warehouse?.name || 'Warehouse'} - {move.location?.name}
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
            <span className="text-[11px] text-purple-600 font-semibold">Stock movement history</span>
          </div>
        </div>
      </div>
    </div>
  );
};
