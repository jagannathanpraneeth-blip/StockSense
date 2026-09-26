import React, { useState, useEffect, useCallback } from 'react';
import {
  History,
  Search,
  ArrowDownLeft,
  RefreshCw,
  MapPin,
  Boxes,
} from 'lucide-react';
import { StockLedger } from '../types';
import * as api from '../api/client';
import { useToast } from '../components/common/Toast';

export const MoveHistoryPage: React.FC = () => {
  const { showError } = useToast();
  const [entries, setEntries] = useState<StockLedger[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  const fetchLedger = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getLedgerEntries({
        search: searchQuery,
        referenceType: typeFilter !== 'ALL' ? typeFilter : undefined,
      });
      setEntries(data);
    } catch (err: any) {
      showError(err.message || 'Failed to load stock movements');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, typeFilter, showError]);

  useEffect(() => {
    fetchLedger();
  }, [fetchLedger]);

  // Derived KPIs
  const totalMoves = entries.length;
  const receiptsCount = entries.filter((e) => e.referenceType === 'RECEIPT').length;
  const totalPositiveDelta = entries
    .filter((e) => e.deltaQty > 0)
    .reduce((acc, e) => acc + e.deltaQty, 0);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Stock Ledger & Move History
            </h1>
            <span className="px-2 py-0.5 text-xs font-bold bg-purple-100 text-purple-700 rounded-full">
              {entries.length} Ledger Records
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Immutable audit log of all validated stock adjustments, incoming receipts, and inventory changes.
          </p>
        </div>

        <button
          onClick={fetchLedger}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold shadow-xs transition-colors shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-purple-600 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Ledger</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Movements</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{totalMoves}</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <History className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Receipt Moves</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{receiptsCount}</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <ArrowDownLeft className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Units Received</p>
            <p className="text-2xl font-bold text-indigo-600 mt-1">
              +{Number(totalPositiveDelta).toFixed(4)}
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Boxes className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Type Filter */}
        <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
          {['ALL', 'RECEIPT', 'ADJUSTMENT', 'INTERNAL_TRANSFER'].map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`flex-1 sm:flex-initial px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                typeFilter === t
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {t === 'ALL' ? 'All Types' : t.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by doc ref, product SKU, or location..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all text-slate-900"
          />
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-7 h-7 animate-spin text-purple-600" />
            <p className="text-xs font-medium">Loading immutable move history...</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="py-20 text-center px-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <History className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-800">No Move History Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              Stock ledger entries will automatically appear here once incoming stock receipts or movements are validated.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-5">Date & Time</th>
                  <th className="py-3.5 px-5">Reference Doc</th>
                  <th className="py-3.5 px-5">Type</th>
                  <th className="py-3.5 px-5">Product</th>
                  <th className="py-3.5 px-5">Location</th>
                  <th className="py-3.5 px-5 text-right">Delta Qty</th>
                  <th className="py-3.5 px-5 text-right">Balance After</th>
                  <th className="py-3.5 px-5">Actor / User</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {entries.map((entry) => {
                  const isPositive = entry.deltaQty > 0;
                  return (
                    <tr key={entry.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-4 px-5 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                        {new Date(entry.createdAt).toLocaleString()}
                      </td>

                      <td className="py-4 px-5 whitespace-nowrap">
                        <span className="font-mono font-bold text-purple-700 bg-purple-50 px-2 py-1 rounded-lg border border-purple-200">
                          {entry.referenceDoc}
                        </span>
                      </td>

                      <td className="py-4 px-5 whitespace-nowrap">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                          {entry.referenceType}
                        </span>
                      </td>

                      <td className="py-4 px-5">
                        <p className="font-bold text-slate-900">{entry.product?.name}</p>
                        <p className="font-mono text-[11px] text-purple-700">{entry.product?.sku}</p>
                      </td>

                      <td className="py-4 px-5">
                        <div className="flex items-center gap-1 text-slate-700">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">
                            {entry.location?.name} ({entry.location?.code})
                          </span>
                        </div>
                      </td>

                      <td className="py-4 px-5 text-right whitespace-nowrap">
                        <span
                          className={`font-mono font-bold text-sm ${
                            isPositive ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {isPositive ? `+${Number(entry.deltaQty).toFixed(4)}` : Number(entry.deltaQty).toFixed(4)}
                        </span>{' '}
                        <span className="text-[10px] text-slate-400">{entry.product?.uom}</span>
                      </td>

                      <td className="py-4 px-5 text-right whitespace-nowrap">
                        <span className="font-mono font-bold text-slate-900">
                          {Number(entry.balanceAfter).toFixed(4)}
                        </span>{' '}
                        <span className="text-[10px] text-slate-400">{entry.product?.uom}</span>
                      </td>

                      <td className="py-4 px-5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-[10px] shrink-0">
                            {entry.actor?.name ? entry.actor.name.charAt(0) : 'U'}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800">{entry.actor?.name || 'System'}</p>
                            <p className="text-[10px] text-slate-400">{entry.actor?.role || 'Staff'}</p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
