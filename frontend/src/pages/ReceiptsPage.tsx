import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowDownToLine,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Building2,
  MapPin,
  Layers,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { Operation } from '../types';
import * as api from '../api/client';
import { ReceiptFormModal } from '../components/receipts/ReceiptFormModal';
import { ReceiptDetailModal } from '../components/receipts/ReceiptDetailModal';
import { useToast } from '../components/common/Toast';

export const ReceiptsPage: React.FC = () => {
  const { showError } = useToast();
  const [receipts, setReceipts] = useState<Operation[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null);

  const fetchReceipts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getReceipts(statusFilter, searchQuery);
      setReceipts(data);
    } catch (err: any) {
      showError(err.message || 'Failed to fetch receipts');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery, showError]);

  useEffect(() => {
    fetchReceipts();
  }, [fetchReceipts]);

  // Derived KPI Stats
  const totalCount = receipts.length;
  const draftCount = receipts.filter((r) => r.status === 'DRAFT').length;
  const doneCount = receipts.filter((r) => r.status === 'DONE').length;
  const totalLines = receipts.reduce((acc, r) => acc + (r.lines?.length || r._count?.lines || 0), 0);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Incoming Stock Receipts
            </h1>
            <span className="px-2 py-0.5 text-xs font-bold bg-purple-100 text-purple-700 rounded-full">
              {receipts.length} Orders
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Manage incoming vendor deliveries, verify items, and validate stock additions with 4-decimal precision.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-bold shadow-md shadow-purple-500/20 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Stock Receipt</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Receipts</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{totalCount}</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <ArrowDownToLine className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Drafts</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{draftCount}</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Validated (Done)</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{doneCount}</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Line Items</p>
            <p className="text-2xl font-bold text-indigo-600 mt-1">{totalLines}</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Layers className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Status Filter Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
          {['ALL', 'DRAFT', 'DONE'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`flex-1 sm:flex-initial px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                statusFilter === st
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {st === 'ALL' ? 'All Orders' : st}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by ref or supplier..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all text-slate-900"
          />
        </div>
      </div>

      {/* Receipts Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-7 h-7 animate-spin text-purple-600" />
            <p className="text-xs font-medium">Loading receipts catalog...</p>
          </div>
        ) : receipts.length === 0 ? (
          <div className="py-20 text-center px-4">
            <div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto mb-3">
              <ArrowDownToLine className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-800">No Receipts Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              No incoming receipts match your current filter. Create a new receipt to start receiving goods.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold hover:bg-purple-700 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Create First Receipt
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-5">Reference</th>
                  <th className="py-3.5 px-5">Supplier / Partner</th>
                  <th className="py-3.5 px-5">Destination Location</th>
                  <th className="py-3.5 px-5 text-center">Lines</th>
                  <th className="py-3.5 px-5">Created Date</th>
                  <th className="py-3.5 px-5 text-center">Status</th>
                  <th className="py-3.5 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {receipts.map((r) => {
                  const lineCount = r.lines?.length ?? r._count?.lines ?? 0;
                  const isDone = r.status === 'DONE';

                  return (
                    <tr
                      key={r.id}
                      onClick={() => setSelectedReceiptId(r.id)}
                      className="hover:bg-purple-50/40 cursor-pointer transition-colors group"
                    >
                      <td className="py-4 px-5">
                        <span className="font-mono font-bold text-purple-700 bg-purple-50 px-2 py-1 rounded-lg border border-purple-200">
                          {r.reference}
                        </span>
                      </td>

                      <td className="py-4 px-5">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="font-semibold text-slate-800">
                            {r.partner || 'Unspecified'}
                          </span>
                        </div>
                      </td>

                      <td className="py-4 px-5">
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <MapPin className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                          <span>
                            {r.destLocation?.name || 'Stock'} ({r.destLocation?.code})
                          </span>
                        </div>
                      </td>

                      <td className="py-4 px-5 text-center">
                        <span className="font-mono font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md">
                          {lineCount} items
                        </span>
                      </td>

                      <td className="py-4 px-5 text-slate-500">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </td>

                      <td className="py-4 px-5 text-center">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                            isDone
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {isDone ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" /> Done
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3" /> Draft
                            </>
                          )}
                        </span>
                      </td>

                      <td className="py-4 px-5 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedReceiptId(r.id);
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
                        >
                          <span>{isDone ? 'View' : 'Process'}</span>
                          <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <ReceiptFormModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={fetchReceipts}
      />

      {/* Detail / Validate Modal */}
      <ReceiptDetailModal
        receiptId={selectedReceiptId}
        isOpen={!!selectedReceiptId}
        onClose={() => setSelectedReceiptId(null)}
        onReceiptUpdated={fetchReceipts}
      />
    </div>
  );
};
