import React, { useState, useEffect, useCallback } from 'react';
import {
  SlidersHorizontal,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  MapPin,
  ChevronRight,
  RefreshCw,
  Package,
} from 'lucide-react';
import { Operation } from '../types';
import * as api from '../api/client';
import { AdjustmentFormModal } from '../components/adjustments/AdjustmentFormModal';
import { AdjustmentDetailModal } from '../components/adjustments/AdjustmentDetailModal';
import { useToast } from '../components/common/Toast';
import { Badge } from '../components/common/Badge';

export const AdjustmentsPage: React.FC = () => {
  const { showError } = useToast();
  const [adjustments, setAdjustments] = useState<Operation[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedAdjustmentId, setSelectedAdjustmentId] = useState<string | null>(null);

  const fetchAdjustments = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getAdjustments(statusFilter, searchQuery);
      setAdjustments(data);
    } catch (err: any) {
      showError(err.message || 'Failed to fetch inventory adjustments');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery, showError]);

  useEffect(() => {
    fetchAdjustments();
  }, [fetchAdjustments]);

  // Derived KPI Stats
  const totalCount = adjustments.length;
  const draftCount = adjustments.filter((a) => a.status === 'DRAFT').length;
  const doneCount = adjustments.filter((a) => a.status === 'DONE').length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DONE':
        return <Badge variant="success">Applied</Badge>;
      case 'CANCELED':
        return <Badge variant="neutral">Canceled</Badge>;
      case 'DRAFT':
      default:
        return <Badge variant="purple">Draft Count</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Inventory Adjustments
            </h1>
            <span className="px-2 py-0.5 text-xs font-bold bg-purple-100 text-purple-700 rounded-full">
              {adjustments.length} Adjustments
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Perform cycle counts, physical inventory reconciliations, and recorded balance corrections (WH/ADJ).
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-bold shadow-md shadow-purple-500/20 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Physical Count</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Adjustments</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{totalCount}</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <SlidersHorizontal className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Review</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{draftCount}</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Validated & Applied</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{doneCount}</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl overflow-x-auto w-full sm:w-auto">
          {['ALL', 'DRAFT', 'DONE', 'CANCELED'].map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                statusFilter === tab
                  ? 'bg-white text-purple-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab === 'ALL' ? 'All Adjustments' : tab.charAt(0) + tab.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* Search & Refresh */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <input
              type="text"
              placeholder="Search reference, notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2" />
          </div>

          <button
            onClick={() => fetchAdjustments()}
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors shrink-0"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-purple-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Adjustments Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading && adjustments.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs flex flex-col items-center justify-center">
            <RefreshCw className="w-6 h-6 animate-spin text-purple-600 mb-2" />
            <span>Loading adjustments...</span>
          </div>
        ) : adjustments.length === 0 ? (
          <div className="py-16 text-center text-slate-500 flex flex-col items-center justify-center p-6">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mb-3">
              <SlidersHorizontal className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No inventory adjustments found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              {searchQuery || statusFilter !== 'ALL'
                ? 'Try adjusting your search query or status filter.'
                : 'Perform a physical stock count and record an adjustment to correct discrepancies.'}
            </p>
            {(!searchQuery && statusFilter === 'ALL') && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-500/20 hover:bg-purple-700 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Start Physical Count</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Reference</th>
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4 text-right">Counted Qty</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {adjustments.map((adj) => {
                  const line = adj.lines?.[0];
                  return (
                    <tr
                      key={adj.id}
                      onClick={() => setSelectedAdjustmentId(adj.id)}
                      className="hover:bg-purple-50/30 cursor-pointer transition-colors group"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-purple-700">
                        {adj.reference}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        <div className="flex items-center gap-2">
                          <Package className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[180px]">
                            {line?.product?.name || 'Product'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{adj.destLocation?.warehouse?.name} - {adj.destLocation?.name}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                        {line?.doneQty != null ? Number(line.doneQty).toFixed(4) : '—'}{' '}
                        <span className="text-[10px] text-slate-400 font-sans">{line?.product?.uom}</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 truncate max-w-[180px]">
                        {adj.notes || '—'}
                      </td>
                      <td className="py-3.5 px-4">
                        {getStatusBadge(adj.status)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1 text-purple-600 font-semibold group-hover:translate-x-0.5 transition-transform">
                          <span>Review</span>
                          <ChevronRight className="w-4 h-4" />
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

      {/* Form Modal */}
      <AdjustmentFormModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={fetchAdjustments}
      />

      {/* Detail Modal */}
      <AdjustmentDetailModal
        adjustmentId={selectedAdjustmentId}
        onClose={() => setSelectedAdjustmentId(null)}
        onUpdated={fetchAdjustments}
      />
    </div>
  );
};
