import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowRightLeft,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  MapPin,
  ChevronRight,
  RefreshCw,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { Operation } from '../types';
import * as api from '../api/client';
import { TransferFormModal } from '../components/transfers/TransferFormModal';
import { TransferDetailModal } from '../components/transfers/TransferDetailModal';
import { useToast } from '../components/common/Toast';
import { Badge } from '../components/common/Badge';

export const TransfersPage: React.FC = () => {
  const { showError } = useToast();
  const [transfers, setTransfers] = useState<Operation[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTransferId, setSelectedTransferId] = useState<string | null>(null);

  const fetchTransfers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getTransfers(statusFilter, searchQuery);
      setTransfers(data);
    } catch (err: any) {
      showError(err.message || 'Failed to fetch internal transfers');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery, showError]);

  useEffect(() => {
    fetchTransfers();
  }, [fetchTransfers]);

  // Derived KPI Stats
  const totalCount = transfers.length;
  const draftCount = transfers.filter((t) => t.status === 'DRAFT').length;
  const doneCount = transfers.filter((t) => t.status === 'DONE').length;
  const totalLines = transfers.reduce((acc, t) => acc + (t.lines?.length || t._count?.lines || 0), 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DONE':
        return <Badge variant="success">Transferred</Badge>;
      case 'CANCELED':
        return <Badge variant="neutral">Canceled</Badge>;
      case 'DRAFT':
      default:
        return <Badge variant="purple">Draft</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Internal Transfers
            </h1>
            <span className="px-2 py-0.5 text-xs font-bold bg-purple-100 text-purple-700 rounded-full">
              {transfers.length} Movements
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Transfer inventory stock between warehouse locations, zones, or staging areas (WH/INT).
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-bold shadow-md shadow-purple-500/20 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Internal Transfer</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Transfers</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{totalCount}</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <ArrowRightLeft className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Draft Movements</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{draftCount}</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Completed Transfers</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{doneCount}</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Items</p>
            <p className="text-2xl font-bold text-indigo-600 mt-1">{totalLines}</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Layers className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filters & Search */}
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
              {tab === 'ALL' ? 'All Movements' : tab.charAt(0) + tab.slice(1).toLowerCase()}
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
            onClick={() => fetchTransfers()}
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors shrink-0"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-purple-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Transfers Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading && transfers.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs flex flex-col items-center justify-center">
            <RefreshCw className="w-6 h-6 animate-spin text-purple-600 mb-2" />
            <span>Loading internal transfers...</span>
          </div>
        ) : transfers.length === 0 ? (
          <div className="py-16 text-center text-slate-500 flex flex-col items-center justify-center p-6">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mb-3">
              <ArrowRightLeft className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No internal transfers found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              {searchQuery || statusFilter !== 'ALL'
                ? 'Try adjusting your search query or status filter.'
                : 'Create an internal transfer to move stock between different locations in your warehouses.'}
            </p>
            {(!searchQuery && statusFilter === 'ALL') && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-500/20 hover:bg-purple-700 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Create Internal Transfer</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Reference</th>
                  <th className="py-3 px-4">Source Location</th>
                  <th className="py-3 px-4"></th>
                  <th className="py-3 px-4">Destination Location</th>
                  <th className="py-3 px-4">Items</th>
                  <th className="py-3 px-4">Scheduled Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {transfers.map((transfer) => (
                  <tr
                    key={transfer.id}
                    onClick={() => setSelectedTransferId(transfer.id)}
                    className="hover:bg-purple-50/30 cursor-pointer transition-colors group"
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-purple-700">
                      {transfer.reference}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                        <span>{transfer.sourceLocation?.warehouse?.name} - {transfer.sourceLocation?.name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-1 text-center">
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>{transfer.destLocation?.warehouse?.name} - {transfer.destLocation?.name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                        <Layers className="w-3.5 h-3.5 text-slate-400" />
                        {transfer.lines?.length ?? transfer._count?.lines ?? 0} items
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {transfer.expectedDate
                        ? new Date(transfer.expectedDate).toLocaleDateString()
                        : '—'}
                    </td>
                    <td className="py-3.5 px-4">
                      {getStatusBadge(transfer.status)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1 text-purple-600 font-semibold group-hover:translate-x-0.5 transition-transform">
                        <span>Details</span>
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Form Modal */}
      <TransferFormModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={fetchTransfers}
      />

      {/* Detail Modal */}
      <TransferDetailModal
        transferId={selectedTransferId}
        onClose={() => setSelectedTransferId(null)}
        onUpdated={fetchTransfers}
      />
    </div>
  );
};
