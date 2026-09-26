import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  History,
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  RefreshCw,
  MapPin,
} from 'lucide-react';
import { StockLedger, Product, Location } from '../types';
import * as api from '../api/client';
import { useToast } from '../components/common/Toast';
import { Badge } from '../components/common/Badge';

export const MoveHistoryPage: React.FC = () => {
  const { showError } = useToast();
  const [entries, setEntries] = useState<StockLedger[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(0);
  const [meta, setMeta] = useState({ total: 0, hasMore: false });
  const requestId = useRef(0);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  useEffect(() => {
    const loadMetadata = async () => {
      try {
        const [prods, locs] = await Promise.all([
          api.getProducts(),
          api.getLocations(),
        ]);
        setProducts(prods);
        setLocations(locs);
      } catch {
        // ignore
      }
    };
    loadMetadata();
  }, []);

  const fetchLedger = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    try {
      const data = await api.getLedgerEntries({
        search: searchQuery || undefined,
        referenceType: typeFilter !== 'ALL' ? typeFilter : undefined,
        productId: selectedProductId || undefined,
        locationId: selectedLocationId || undefined,
        dateFrom: dateFrom ? new Date(`${dateFrom}T00:00:00`).toISOString() : undefined,
        dateTo: dateTo ? new Date(`${dateTo}T23:59:59.999`).toISOString() : undefined,
        offset: page * 50,
      });
      if (id === requestId.current) { setEntries(data.data); setMeta(data.meta); }
    } catch (err: any) {
      if (id === requestId.current) showError(err.message || 'Failed to load stock movements');
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [searchQuery, typeFilter, selectedProductId, selectedLocationId, dateFrom, dateTo, page, showError]);

  useEffect(() => {
    fetchLedger();
  }, [fetchLedger]);

  // Derived KPIs
  const totalMoves = entries.length;
  const receiptsCount = entries.filter((e) => e.referenceType === 'RECEIPT').length;
  const deliveriesCount = entries.filter((e) => e.referenceType === 'DELIVERY').length;
  const transfersCount = entries.filter((e) => e.referenceType === 'INTERNAL_TRANSFER').length;
  const adjustmentsCount = entries.filter((e) => e.referenceType === 'ADJUSTMENT').length;

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'RECEIPT':
        return <Badge variant="success">Receipt (WH/IN)</Badge>;
      case 'DELIVERY':
        return <Badge variant="purple">Delivery (WH/OUT)</Badge>;
      case 'INTERNAL_TRANSFER':
        return <Badge variant="info">Transfer (WH/INT)</Badge>;
      case 'ADJUSTMENT':
        return <Badge variant="warning">Adjustment (WH/ADJ)</Badge>;
      default:
        return <Badge variant="neutral">{type}</Badge>;
    }
  };

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
              {meta.total} Ledger Records
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Stock movement history of all receipts, deliveries, internal transfers, and physical count reconciliations.
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Records on this page</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{totalMoves}</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <History className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Receipts on this page</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{receiptsCount}</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <ArrowDownLeft className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Deliveries on this page</p>
            <p className="text-2xl font-bold text-purple-600 mt-1">{deliveriesCount}</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <ArrowUpRight className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Other records on this page</p>
            <p className="text-2xl font-bold text-indigo-600 mt-1">{transfersCount + adjustmentsCount}</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <ArrowRightLeft className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        {/* Top bar: Type tabs & text search */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl overflow-x-auto w-full sm:w-auto">
            {['ALL', 'RECEIPT', 'DELIVERY', 'INTERNAL_TRANSFER', 'ADJUSTMENT'].map((tab) => (
              <button
                key={tab}
                onClick={() => { setPage(0); setTypeFilter(tab); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                  typeFilter === tab
                    ? 'bg-white text-purple-700 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab === 'ALL'
                  ? 'All Transactions'
                  : tab === 'INTERNAL_TRANSFER'
                  ? 'Transfers'
                  : tab.charAt(0) + tab.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          <div className="relative flex-1 sm:w-72">
            <input
              type="text"
              placeholder="Search reference doc, notes..."
              value={searchQuery}
              onChange={(e) => { setPage(0); setSearchQuery(e.target.value); }}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2" />
          </div>
        </div>

        {/* Secondary filters: Product, Location, Date Range */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-slate-100">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Filter Product
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => { setPage(0); setSelectedProductId(e.target.value); }}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
            >
              <option value="">All Products</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  [{p.sku}] {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Filter Location
            </label>
            <select
              value={selectedLocationId}
              onChange={(e) => { setPage(0); setSelectedLocationId(e.target.value); }}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
            >
              <option value="">All Locations</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.warehouse?.name} - {loc.name} ({loc.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Date From
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setPage(0); setDateFrom(e.target.value); }}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Date To
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setPage(0); setDateTo(e.target.value); }}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span>{meta.total ? page * 50 + 1 : 0}–{Math.min(page * 50 + entries.length, meta.total)} of {meta.total} matching records</span>
        <div className="flex gap-4">
          <button disabled={loading || page === 0} className="disabled:opacity-40" onClick={() => setPage(p => p - 1)}>Previous page</button>
          <button disabled={loading || !meta.hasMore} className="disabled:opacity-40" onClick={() => setPage(p => p + 1)}>Next page</button>
        </div>
      </div>
      {/* Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading && entries.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs flex flex-col items-center justify-center">
            <RefreshCw className="w-6 h-6 animate-spin text-purple-600 mb-2" />
            <span>Loading ledger entries...</span>
          </div>
        ) : entries.length === 0 ? (
          <div className="py-16 text-center text-slate-500 flex flex-col items-center justify-center p-6">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mb-3">
              <History className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No stock ledger records found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              Try broadening your search or date filters. Validating any warehouse operation will automatically create an immutable entry here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Reference Doc</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Product SKU & Name</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4 text-right">Delta Quantity</th>
                  <th className="py-3 px-4 text-right">Balance After</th>
                  <th className="py-3 px-4">Operator / Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                      {new Date(entry.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-purple-700">
                      {entry.referenceDoc}
                    </td>
                    <td className="py-3.5 px-4">
                      {getTypeBadge(entry.referenceType)}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{entry.product?.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        SKU: {entry.product?.sku}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <MapPin className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                        <span>{entry.location?.warehouse?.name} - {entry.location?.name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span
                        className={`font-mono font-bold text-xs ${
                          entry.deltaQty > 0
                            ? 'text-emerald-600'
                            : entry.deltaQty < 0
                            ? 'text-rose-600'
                            : 'text-slate-600'
                        }`}
                      >
                        {entry.deltaQty > 0 ? `+${Number(entry.deltaQty).toFixed(4)}` : Number(entry.deltaQty).toFixed(4)}
                      </span>{' '}
                      <span className="text-[10px] text-slate-400 font-sans">{entry.product?.uom}</span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                      {Number(entry.balanceAfter).toFixed(4)}{' '}
                      <span className="text-[10px] text-slate-400 font-sans">{entry.product?.uom}</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 max-w-[200px] truncate">
                      <div>{entry.actor?.name || 'Unknown operator'}</div><div title={entry.notes || ''}>{entry.notes || '—'}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
