import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRightLeft,
  Ban,
  ArrowRight,
} from 'lucide-react';
import { Operation, Product } from '../../types';
import * as api from '../../api/client';
import { useToast } from '../common/Toast';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../common/Badge';

interface TransferDetailModalProps {
  transferId: string | null;
  onClose: () => void;
  onUpdated: () => void;
}

export const TransferDetailModal: React.FC<TransferDetailModalProps> = ({
  transferId,
  onClose,
  onUpdated,
}) => {
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  const [transfer, setTransfer] = useState<Operation | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Line addition state
  const [showAddLine, setShowAddLine] = useState(false);
  const [newProductId, setNewProductId] = useState('');
  const [newDemandQty, setNewDemandQty] = useState('1');

  const isManagerOrAdmin = user?.role === 'ADMIN' || user?.role === 'INVENTORY_MANAGER';

  const loadTransfer = async () => {
    if (!transferId) return;
    setLoading(true);
    setError(null);
    try {
      const [data, prods] = await Promise.all([
        api.getTransfer(transferId),
        api.getProducts(),
      ]);
      setTransfer(data);
      setProducts(prods);
      if (prods.length > 0 && !newProductId) {
        setNewProductId(prods[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load transfer details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (transferId) {
      loadTransfer();
    } else {
      setTransfer(null);
      setError(null);
    }
  }, [transferId]);

  if (!transferId) return null;

  const handleValidate = async () => {
    if (!transfer) return;
    setActionLoading(true);
    try {
      await api.validateTransfer(transfer.id, transfer.version);
      showSuccess('Transfer validated! Stock moved atomically between locations.');
      await loadTransfer();
      onUpdated();
    } catch (err: any) {
      showError(err.message || 'Transfer validation failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!transfer || !confirm('Are you sure you want to cancel this transfer?')) return;
    setActionLoading(true);
    try {
      await api.cancelTransfer(transfer.id);
      showSuccess('Transfer canceled');
      await loadTransfer();
      onUpdated();
    } catch (err: any) {
      showError(err.message || 'Failed to cancel transfer');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddLine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transfer) return;
    const qty = parseFloat(newDemandQty);
    if (isNaN(qty) || qty <= 0) {
      showError('Please enter a valid positive quantity');
      return;
    }

    setActionLoading(true);
    try {
      await api.addTransferLine(transfer.id, {
        productId: newProductId,
        demandQty: qty,
      });
      showSuccess('Product added to transfer');
      setShowAddLine(false);
      setNewDemandQty('1');
      await loadTransfer();
      onUpdated();
    } catch (err: any) {
      showError(err.message || 'Failed to add item line');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteLine = async (lineId: string) => {
    if (!transfer) return;
    setActionLoading(true);
    try {
      await api.deleteTransferLine(transfer.id, lineId);
      showSuccess('Item removed');
      await loadTransfer();
      onUpdated();
    } catch (err: any) {
      showError(err.message || 'Failed to remove item');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DONE':
        return <Badge variant="success" size="md">Done (Transferred)</Badge>;
      case 'CANCELED':
        return <Badge variant="neutral" size="md">Canceled</Badge>;
      case 'DRAFT':
      default:
        return <Badge variant="purple" size="md">Draft Transfer</Badge>;
    }
  };

  const isEditable = transfer?.status === 'DRAFT';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  {transfer?.reference || 'Internal Transfer'}
                </h3>
                {transfer && getStatusBadge(transfer.status)}
              </div>
              <p className="text-xs text-slate-500">Internal warehouse stock movement (WH/INT)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 text-xs">
              <Clock className="w-6 h-6 animate-spin text-purple-600 mb-2" />
              <span>Loading transfer details...</span>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{error}</span>
            </div>
          ) : transfer ? (
            <>
              {/* Location Movement Card */}
              <div className="p-4 bg-gradient-to-r from-purple-50 via-indigo-50 to-slate-50 rounded-2xl border border-purple-100/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white rounded-xl shadow-xs border border-purple-100">
                    <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider block">
                      SOURCE LOCATION
                    </span>
                    <span className="text-xs font-bold text-slate-900">
                      {transfer.sourceLocation?.warehouse?.name} - {transfer.sourceLocation?.name}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono block">
                      ({transfer.sourceLocation?.code})
                    </span>
                  </div>

                  <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-xs shrink-0">
                    <ArrowRight className="w-4 h-4" />
                  </div>

                  <div className="p-3 bg-white rounded-xl shadow-xs border border-purple-100">
                    <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">
                      DESTINATION LOCATION
                    </span>
                    <span className="text-xs font-bold text-slate-900">
                      {transfer.destLocation?.warehouse?.name} - {transfer.destLocation?.name}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono block">
                      ({transfer.destLocation?.code})
                    </span>
                  </div>
                </div>

                <div className="text-xs text-slate-500 space-y-1 sm:text-right">
                  <div>
                    <span className="font-semibold text-slate-700">Scheduled:</span>{' '}
                    {transfer.expectedDate
                      ? new Date(transfer.expectedDate).toLocaleDateString()
                      : 'Unscheduled'}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700">Created by:</span>{' '}
                    {transfer.createdBy?.name || 'Operator'}
                  </div>
                </div>
              </div>

              {/* Status Banner */}
              {transfer.status === 'DONE' && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-emerald-900">Transfer Validated & Completed</h4>
                    <p className="text-[11px] text-emerald-700 mt-0.5">
                      Items were atomically deducted from source location and added to destination location on{' '}
                      {transfer.validatedAt ? new Date(transfer.validatedAt).toLocaleString() : 'validation'}.
                      Total system quantity is conserved.
                    </p>
                  </div>
                </div>
              )}

              {transfer.status === 'CANCELED' && (
                <div className="p-4 bg-slate-100 border border-slate-200 rounded-xl flex items-center gap-3 text-xs text-slate-600">
                  <Ban className="w-5 h-5 text-slate-400 shrink-0" />
                  <span>This transfer was canceled. No inventory balances were moved.</span>
                </div>
              )}

              {/* Line Items Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Transferred Items ({transfer.lines?.length || 0})
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Quantities will move from source to destination upon validation
                    </p>
                  </div>

                  {isEditable && (
                    <button
                      type="button"
                      onClick={() => setShowAddLine(!showAddLine)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-xs font-semibold transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{showAddLine ? 'Close Form' : 'Add Item'}</span>
                    </button>
                  )}
                </div>

                {/* Add Line Form */}
                {showAddLine && (
                  <form
                    onSubmit={handleAddLine}
                    className="p-4 bg-purple-50/50 border border-purple-200 rounded-xl flex flex-wrap items-center gap-3 animate-in fade-in duration-150"
                  >
                    <div className="flex-1 min-w-[200px]">
                      <label className="block text-[11px] font-semibold text-purple-900 mb-1">
                        Select Product
                      </label>
                      <select
                        value={newProductId}
                        onChange={(e) => setNewProductId(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-purple-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                      >
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            [{p.sku}] {p.name} ({p.uom})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="w-32">
                      <label className="block text-[11px] font-semibold text-purple-900 mb-1">
                        Transfer Qty
                      </label>
                      <input
                        type="number"
                        step="0.0001"
                        min="0.0001"
                        required
                        value={newDemandQty}
                        onChange={(e) => setNewDemandQty(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-purple-200 rounded-lg text-xs font-semibold text-right"
                      />
                    </div>

                    <div className="flex items-end gap-2 pt-5">
                      <button
                        type="submit"
                        disabled={actionLoading}
                        className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg transition-colors"
                      >
                        Add Line
                      </button>
                    </div>
                  </form>
                )}

                {/* Lines List */}
                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                  <div className="grid grid-cols-12 gap-2 bg-slate-50 px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <div className="col-span-6">Product SKU & Name</div>
                    <div className="col-span-4 text-right">Transfer Quantity</div>
                    <div className="col-span-2 text-right">Action</div>
                  </div>

                  {transfer.lines && transfer.lines.length > 0 ? (
                    transfer.lines.map((line) => (
                      <div
                        key={line.id}
                        className="grid grid-cols-12 gap-2 p-3.5 items-center hover:bg-slate-50/50 transition-colors text-xs"
                      >
                        <div className="col-span-6">
                          <div className="font-bold text-slate-900">{line.product?.name}</div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            SKU: {line.product?.sku}
                          </div>
                        </div>

                        <div className="col-span-4 text-right font-mono font-bold text-purple-700">
                          {Number(line.demandQty).toFixed(4)}{' '}
                          <span className="text-[10px] text-slate-400 font-sans">{line.product?.uom}</span>
                        </div>

                        <div className="col-span-2 text-right">
                          {isEditable && (
                            <button
                              type="button"
                              onClick={() => handleDeleteLine(line.id)}
                              className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-6 text-center text-xs text-slate-400">
                      No line items in this transfer.
                    </div>
                  )}
                </div>
              </div>

              {/* Notes */}
              {transfer.notes && (
                <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-600">
                  <span className="font-semibold text-slate-700 block mb-0.5">Notes:</span>
                  <p>{transfer.notes}</p>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between">
          <div>
            {isEditable && (
              <button
                type="button"
                onClick={handleCancel}
                disabled={actionLoading}
                className="px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-colors border border-red-200"
              >
                Cancel Transfer
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors"
            >
              Close
            </button>

            {isEditable && (
              <button
                type="button"
                onClick={handleValidate}
                disabled={actionLoading || !isManagerOrAdmin}
                title={
                  !isManagerOrAdmin
                    ? 'Only Inventory Managers and Admins can validate transfers'
                    : 'Validate and move stock between locations'
                }
                className={`px-5 py-2 text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2 ${
                  isManagerOrAdmin
                    ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-purple-500/20 active:scale-95'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Validate & Transfer Stock</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
