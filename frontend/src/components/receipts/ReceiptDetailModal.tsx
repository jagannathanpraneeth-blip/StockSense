import { useAuth } from '../../context/AuthContext';
import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  AlertCircle,
  Building2,
  MapPin,
  Calendar,
  Package,
  Plus,
  Trash2,
  Check,
  ArrowDownToLine,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { Operation, Product } from '../../types';
import * as api from '../../api/client';
import { useToast } from '../common/Toast';

interface ReceiptDetailModalProps {
  receiptId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onReceiptUpdated: () => void;
}

export const ReceiptDetailModal: React.FC<ReceiptDetailModalProps> = ({
  receiptId,
  isOpen,
  onClose,
  onReceiptUpdated,
}) => {
  const { user } = useAuth();
  const canValidate = user?.role === 'ADMIN' || user?.role === 'INVENTORY_MANAGER';
  const { showSuccess, showError } = useToast();
  const [receipt, setReceipt] = useState<Operation | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add line state
  const [showAddLine, setShowAddLine] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [newLineDemand, setNewLineDemand] = useState('10');

  // Edit line state
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [editDoneQty, setEditDoneQty] = useState('');

  useEffect(() => {
    if (isOpen && receiptId) {
      loadReceipt();
      loadProducts();
    } else {
      setReceipt(null);
      setShowAddLine(false);
      setError(null);
    }
  }, [isOpen, receiptId]);

  const loadReceipt = async () => {
    if (!receiptId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getReceipt(receiptId);
      setReceipt(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load receipt details');
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const prods = await api.getProducts();
      setProducts(prods.filter((p) => p.isActive));
      if (prods.length > 0 && !selectedProductId) {
        setSelectedProductId(prods[0].id);
      }
    } catch {
      // ignore
    }
  };

  const handleSetAllDone = async () => {
    if (!receipt) return;
    setActionLoading(true);
    try {
      const updated = await api.setAllReceiptLinesDone(receipt.id);
      setReceipt(updated);
      showSuccess('Set all line quantities to match demand.');
      onReceiptUpdated();
    } catch (err: any) {
      setError(err.message || 'Failed to update line quantities');
      showError(err.message || 'Failed to update line quantities');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateLineDone = async (lineId: string, doneQtyVal: number) => {
    if (!receipt) return;
    try {
      const updatedLine = await api.updateReceiptLine(receipt.id, lineId, { doneQty: doneQtyVal });
      setReceipt({
        ...receipt,
        lines: receipt.lines?.map((l) => (l.id === lineId ? updatedLine : l)),
      });
      setEditingLineId(null);
      showSuccess('Line received quantity updated.');
      onReceiptUpdated();
    } catch (err: any) {
      setError(err.message || 'Failed to update line');
      showError(err.message || 'Failed to update line');
    }
  };

  const handleAddLine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receipt || !selectedProductId) return;
    const demand = parseFloat(newLineDemand);
    if (isNaN(demand) || demand <= 0) {
      setError('Demand quantity must be greater than 0');
      return;
    }

    setActionLoading(true);
    try {
      await api.addReceiptLine(receipt.id, {
        productId: selectedProductId,
        demandQty: demand,
        doneQty: demand, // pre-fill done with demand for convenience
      });
      setShowAddLine(false);
      setNewLineDemand('10');
      showSuccess('Product line added.');
      await loadReceipt();
      onReceiptUpdated();
    } catch (err: any) {
      setError(err.message || 'Failed to add line');
      showError(err.message || 'Failed to add line');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteLine = async (lineId: string) => {
    if (!receipt) return;
    if (!confirm('Are you sure you want to remove this line item?')) return;

    try {
      await api.deleteReceiptLine(receipt.id, lineId);
      setReceipt({
        ...receipt,
        lines: receipt.lines?.filter((l) => l.id !== lineId),
      });
      showSuccess('Line item removed.');
      onReceiptUpdated();
    } catch (err: any) {
      setError(err.message || 'Failed to delete line');
      showError(err.message || 'Failed to delete line');
    }
  };

  const handleValidate = async () => {
    if (!receipt) return;

    // Check if lines exist
    if (!receipt.lines || receipt.lines.length === 0) {
      setError('Cannot validate an empty receipt. Please add product lines first.');
      return;
    }

    setValidating(true);
    setError(null);
    try {
      const validated = await api.validateReceipt(receipt.id, receipt.version, false);
      setReceipt(validated);
      showSuccess(`Receipt ${receipt.reference} validated! Stock updated.`);
      onReceiptUpdated();
    } catch (err: any) {
      setError(err.message || 'Validation failed. Please refresh and try again.');
      showError(err.message || 'Validation failed. Please refresh and try again.');
    } finally {
      setValidating(false);
    }
  };

  if (!isOpen) return null;

  const isDraft = receipt?.status === 'DRAFT';
  const isDone = receipt?.status === 'DONE';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden border border-slate-100 my-8 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30 flex items-center justify-center">
              <ArrowDownToLine className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-mono font-bold text-lg text-white">
                  {receipt?.reference || 'Receipt'}
                </h3>
                {receipt && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      isDone
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    {receipt.status}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">Incoming Stock Receipt Details</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar */}
        {isDraft && (
          <div className="px-6 py-3 bg-purple-50/70 border-b border-purple-100 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <button className="text-xs px-3 py-2 border rounded-lg" disabled={actionLoading || validating} onClick={async () => {
                if (!receipt) return;
                setActionLoading(true);
                try { await api.cancelReceipt(receipt.id); onReceiptUpdated(); onClose(); } catch (e: any) { setError(e.message); } finally { setActionLoading(false); }
              }}>Cancel receipt</button>
              <button
                type="button"
                onClick={handleValidate}
                disabled={!canValidate || validating || actionLoading}
                className="py-2 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 transition-all flex items-center gap-2"
              >
                {validating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Validating Stock...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Validate Receipt (Receive Stock)
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleSetAllDone}
                disabled={validating || actionLoading}
                className="py-2 px-3 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                Set All to Demand
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowAddLine(true)}
              className="py-2 px-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Add Product Line
            </button>
          </div>
        )}

        {/* Validated State Banner */}
        {isDone && (
          <div className="px-6 py-3 bg-emerald-50 border-b border-emerald-200 text-emerald-900 flex items-center justify-between text-xs font-medium shrink-0">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Receipt is <strong>DONE</strong> and stock balances have been updated atomically in the Stock Ledger.
              </span>
            </div>
            {receipt?.validatedAt && (
              <span className="text-emerald-700 text-[11px]">
                Validated: {new Date(receipt.validatedAt).toLocaleString()}
              </span>
            )}
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-purple-600" />
              <p className="text-xs font-medium">Loading receipt details...</p>
            </div>
          ) : receipt ? (
            <>
              {/* Receipt Metadata Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-purple-600" />
                    Supplier / Partner
                  </span>
                  <p className="text-sm font-bold text-slate-900 truncate">
                    {receipt.partner || 'Unspecified'}
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-purple-600" />
                    Destination Location
                  </span>
                  <p className="text-sm font-bold text-slate-900 truncate">
                    {receipt.destLocation?.name || 'Main Stock'} ({receipt.destLocation?.code})
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-purple-600" />
                    Created / Expected
                  </span>
                  <p className="text-sm font-bold text-slate-900">
                    {new Date(receipt.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {receipt.notes && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700">
                  <strong className="text-slate-900">Notes: </strong>
                  {receipt.notes}
                </div>
              )}

              {/* Add Line Form (Conditional) */}
              {showAddLine && isDraft && (
                <form
                  onSubmit={handleAddLine}
                  className="p-4 bg-purple-50/80 border border-purple-200 rounded-xl space-y-3 animate-in fade-in"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-900 uppercase tracking-wider">
                      Add Product Line Item
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowAddLine(false)}
                      className="text-xs text-slate-500 hover:text-slate-800"
                    >
                      Cancel
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Select Product
                      </label>
                      <select
                        value={selectedProductId}
                        onChange={(e) => setSelectedProductId(e.target.value)}
                        className="w-full py-1.5 px-3 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                      >
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} [{p.sku}] ({p.uom})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Demand Quantity
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          step="0.0001"
                          min="0.0001"
                          required
                          value={newLineDemand}
                          onChange={(e) => setNewLineDemand(e.target.value)}
                          className="w-full py-1.5 px-3 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-right text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                        />
                        <button
                          type="submit"
                          disabled={actionLoading}
                          className="py-1.5 px-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold shrink-0 transition-colors"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </div>
                </form>
              )}

              {/* Line Items Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-purple-600" />
                    Incoming Operations Lines ({receipt.lines?.length || 0})
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    4-decimal precision standard
                  </span>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        <th className="py-3 px-4">Product / SKU</th>
                        <th className="py-3 px-4 text-right">Demand Qty</th>
                        <th className="py-3 px-4 text-right">Received (Done Qty)</th>
                        <th className="py-3 px-4 text-center">Status</th>
                        {isDraft && <th className="py-3 px-4 text-right">Actions</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {receipt.lines && receipt.lines.length > 0 ? (
                        receipt.lines.map((line) => {
                          const isFullyReceived = line.doneQty >= line.demandQty && line.demandQty > 0;
                          const isEditing = editingLineId === line.id;

                          return (
                            <tr key={line.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-3 px-4">
                                <p className="font-bold text-slate-900">{line.product?.name}</p>
                                <p className="font-mono text-[11px] text-purple-700">{line.product?.sku}</p>
                              </td>

                              <td className="py-3 px-4 text-right font-mono font-semibold text-slate-700">
                                {Number(line.demandQty).toFixed(4)}{' '}
                                <span className="text-[10px] text-slate-400">{line.product?.uom}</span>
                              </td>

                              <td className="py-3 px-4 text-right">
                                {isEditing ? (
                                  <div className="flex items-center justify-end gap-1">
                                    <input
                                      type="number"
                                      step="0.0001"
                                      min="0"
                                      autoFocus
                                      value={editDoneQty}
                                      onChange={(e) => setEditDoneQty(e.target.value)}
                                      className="w-24 py-1 px-2 bg-purple-50 border border-purple-300 rounded text-xs font-mono font-bold text-right"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateLineDone(line.id, parseFloat(editDoneQty) || 0)}
                                      className="p-1 bg-purple-600 text-white rounded hover:bg-purple-700"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingLineId(null)}
                                      className="p-1 text-slate-400 hover:text-slate-600"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-end gap-2">
                                    <span
                                      className={`font-mono font-bold ${
                                        isFullyReceived
                                          ? 'text-emerald-700'
                                          : line.doneQty > 0
                                          ? 'text-amber-700'
                                          : 'text-slate-400'
                                      }`}
                                    >
                                      {Number(line.doneQty).toFixed(4)}{' '}
                                      <span className="text-[10px] text-slate-400">{line.product?.uom}</span>
                                    </span>
                                    {isDraft && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingLineId(line.id);
                                          setEditDoneQty(line.doneQty.toString());
                                        }}
                                        className="text-[10px] font-semibold text-purple-600 hover:underline px-1.5 py-0.5 bg-purple-50 rounded border border-purple-200"
                                      >
                                        Edit
                                      </button>
                                    )}
                                  </div>
                                )}
                              </td>

                              <td className="py-3 px-4 text-center">
                                {isFullyReceived ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <Check className="w-3 h-3" /> Ready
                                  </span>
                                ) : line.doneQty > 0 ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                                    Partial
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                                    Pending
                                  </span>
                                )}
                              </td>

                              {isDraft && (
                                <td className="py-3 px-4 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateLineDone(line.id, line.demandQty)}
                                      className="text-[10px] font-bold text-slate-600 hover:text-purple-700 px-2 py-1 bg-slate-100 hover:bg-purple-50 rounded-lg transition-colors"
                                      title="Match Demand"
                                    >
                                      = Match
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteLine(line.id)}
                                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                      title="Delete line"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              )}
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={isDraft ? 5 : 4} className="py-8 text-center text-slate-400">
                            No product line items on this receipt.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            {receipt?.createdBy && (
              <span>Created by <strong>{receipt.createdBy.name}</strong></span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="py-2 px-4 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
