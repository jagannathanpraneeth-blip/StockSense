import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Building2,
  MapPin,
  Calendar,
  Clock,
  ArrowUpFromLine,
  Truck,
  Box,
  Ban,
} from 'lucide-react';
import { Operation, Product } from '../../types';
import * as api from '../../api/client';
import { useToast } from '../common/Toast';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../common/Badge';

interface DeliveryDetailModalProps {
  deliveryId: string | null;
  onClose: () => void;
  onUpdated: () => void;
}

export const DeliveryDetailModal: React.FC<DeliveryDetailModalProps> = ({
  deliveryId,
  onClose,
  onUpdated,
}) => {
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  const [delivery, setDelivery] = useState<Operation | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Line addition state
  const [showAddLine, setShowAddLine] = useState(false);
  const [newProductId, setNewProductId] = useState('');
  const [newDemandQty, setNewDemandQty] = useState('1');

  // Edit line doneQty state
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [editingDoneQty, setEditingDoneQty] = useState('');

  const isManagerOrAdmin = user?.role === 'ADMIN' || user?.role === 'INVENTORY_MANAGER';

  const loadDelivery = async () => {
    if (!deliveryId) return;
    setLoading(true);
    setError(null);
    try {
      const [data, prods] = await Promise.all([
        api.getDelivery(deliveryId),
        api.getProducts(),
      ]);
      setDelivery(data);
      setProducts(prods);
      if (prods.length > 0 && !newProductId) {
        setNewProductId(prods[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load delivery details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (deliveryId) {
      loadDelivery();
    } else {
      setDelivery(null);
      setError(null);
    }
  }, [deliveryId]);

  if (!deliveryId) return null;

  const handleStartPicking = async () => {
    if (!delivery) return;
    setActionLoading(true);
    try {
      await api.startDeliveryPicking(delivery.id);
      showSuccess('Picking process started (Status: WAITING)');
      await loadDelivery();
      onUpdated();
    } catch (err: any) {
      showError(err.message || 'Failed to start picking');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkReady = async () => {
    if (!delivery) return;
    setActionLoading(true);
    try {
      await api.markDeliveryReady(delivery.id);
      showSuccess('Order marked READY for shipping');
      await loadDelivery();
      onUpdated();
    } catch (err: any) {
      showError(err.message || 'Failed to mark order ready');
    } finally {
      setActionLoading(false);
    }
  };

  const handleValidate = async () => {
    if (!delivery) return;
    setActionLoading(true);
    try {
      await api.validateDelivery(delivery.id, delivery.version);
      showSuccess('Delivery validated & shipped! Stock balances updated.');
      await loadDelivery();
      onUpdated();
    } catch (err: any) {
      showError(err.message || 'Validation failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!delivery || !confirm('Are you sure you want to cancel this delivery order?')) return;
    setActionLoading(true);
    try {
      await api.cancelDelivery(delivery.id);
      showSuccess('Delivery order canceled');
      await loadDelivery();
      onUpdated();
    } catch (err: any) {
      showError(err.message || 'Failed to cancel delivery');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddLine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!delivery) return;
    const qty = parseFloat(newDemandQty);
    if (isNaN(qty) || qty <= 0) {
      showError('Please enter a valid positive demand quantity');
      return;
    }

    setActionLoading(true);
    try {
      await api.addDeliveryLine(delivery.id, {
        productId: newProductId,
        demandQty: qty,
      });
      showSuccess('Product added to delivery');
      setShowAddLine(false);
      setNewDemandQty('1');
      await loadDelivery();
      onUpdated();
    } catch (err: any) {
      showError(err.message || 'Failed to add item line');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteLine = async (lineId: string) => {
    if (!delivery) return;
    setActionLoading(true);
    try {
      await api.deleteDeliveryLine(delivery.id, lineId);
      showSuccess('Item removed');
      await loadDelivery();
      onUpdated();
    } catch (err: any) {
      showError(err.message || 'Failed to remove item');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateDoneQty = async (lineId: string) => {
    if (!delivery) return;
    const qty = parseFloat(editingDoneQty);
    if (isNaN(qty) || qty < 0) {
      showError('Please enter a valid done quantity');
      return;
    }

    setActionLoading(true);
    try {
      await api.updateDeliveryLine(delivery.id, lineId, { doneQty: qty });
      showSuccess('Picked quantity updated');
      setEditingLineId(null);
      await loadDelivery();
      onUpdated();
    } catch (err: any) {
      showError(err.message || 'Failed to update quantity');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DONE':
        return <Badge variant="success" size="md">Done (Shipped)</Badge>;
      case 'READY':
        return <Badge variant="info" size="md">Ready to Ship</Badge>;
      case 'WAITING':
        return <Badge variant="warning" size="md">Picking / Packing</Badge>;
      case 'CANCELED':
        return <Badge variant="neutral" size="md">Canceled</Badge>;
      case 'DRAFT':
      default:
        return <Badge variant="purple" size="md">Draft Order</Badge>;
    }
  };

  const isEditable = delivery?.status === 'DRAFT' || delivery?.status === 'WAITING';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <ArrowUpFromLine className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  {delivery?.reference || 'Delivery Order'}
                </h3>
                {delivery && getStatusBadge(delivery.status)}
              </div>
              <p className="text-xs text-slate-500">Outgoing customer fulfillment order</p>
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
              <span>Loading delivery details...</span>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{error}</span>
            </div>
          ) : delivery ? (
            <>
              {/* Order Info Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/70">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Customer / Partner
                  </span>
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                    <Building2 className="w-4 h-4 text-purple-500 shrink-0" />
                    <span className="truncate">{delivery.partner || 'N/A'}</span>
                  </div>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/70">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Source Location
                  </span>
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                    <MapPin className="w-4 h-4 text-purple-500 shrink-0" />
                    <span className="truncate">
                      {delivery.sourceLocation?.warehouse?.name} - {delivery.sourceLocation?.name}
                    </span>
                  </div>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/70">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Expected Date
                  </span>
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                    <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>
                      {delivery.expectedDate
                        ? new Date(delivery.expectedDate).toLocaleDateString()
                        : 'Unscheduled'}
                    </span>
                  </div>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/70">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Created By
                  </span>
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                    <span className="w-4 h-4 rounded-full bg-purple-200 text-purple-800 text-[10px] font-bold flex items-center justify-center shrink-0">
                      {delivery.createdBy?.name?.[0] || 'U'}
                    </span>
                    <span className="truncate">{delivery.createdBy?.name || 'System Operator'}</span>
                  </div>
                </div>
              </div>

              {/* Status Banner */}
              {delivery.status === 'DONE' && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-emerald-900">Delivery Validated & Shipped</h4>
                    <p className="text-[11px] text-emerald-700 mt-0.5">
                      Stock was deducted from location balances and logged into the stock ledger on{' '}
                      {delivery.validatedAt ? new Date(delivery.validatedAt).toLocaleString() : 'validation'}.
                    </p>
                  </div>
                </div>
              )}

              {delivery.status === 'CANCELED' && (
                <div className="p-4 bg-slate-100 border border-slate-200 rounded-xl flex items-center gap-3 text-xs text-slate-600">
                  <Ban className="w-5 h-5 text-slate-400 shrink-0" />
                  <span>This delivery order has been canceled. No inventory balances were impacted.</span>
                </div>
              )}

              {/* Line Items Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Delivery Line Items ({delivery.lines?.length || 0})
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Quantities require exact availability at the source location
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
                        Demand Qty
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
                    <div className="col-span-5">Product SKU & Name</div>
                    <div className="col-span-2 text-right">Demand</div>
                    <div className="col-span-3 text-right">Picked / Done</div>
                    <div className="col-span-2 text-right">Actions</div>
                  </div>

                  {delivery.lines && delivery.lines.length > 0 ? (
                    delivery.lines.map((line) => {
                      const isEditing = editingLineId === line.id;
                      return (
                        <div
                          key={line.id}
                          className="grid grid-cols-12 gap-2 p-3.5 items-center hover:bg-slate-50/50 transition-colors text-xs"
                        >
                          {/* Product */}
                          <div className="col-span-5">
                            <div className="font-bold text-slate-900">{line.product?.name}</div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              SKU: {line.product?.sku}
                            </div>
                          </div>

                          {/* Demand Qty */}
                          <div className="col-span-2 text-right font-semibold text-slate-700">
                            {Number(line.demandQty).toFixed(4)}{' '}
                            <span className="text-[10px] text-slate-400">{line.product?.uom}</span>
                          </div>

                          {/* Done / Picked Qty */}
                          <div className="col-span-3 text-right">
                            {isEditing ? (
                              <div className="flex items-center justify-end gap-1">
                                <input
                                  type="number"
                                  step="0.0001"
                                  min="0"
                                  value={editingDoneQty}
                                  onChange={(e) => setEditingDoneQty(e.target.value)}
                                  className="w-20 px-1.5 py-1 bg-white border border-purple-300 rounded text-xs text-right font-bold"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleUpdateDoneQty(line.id)}
                                  className="px-2 py-1 bg-purple-600 text-white rounded text-[10px] font-bold"
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingLineId(null)}
                                  className="px-1.5 py-1 text-slate-400 hover:text-slate-600 text-[10px]"
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-end gap-1.5">
                                <span
                                  className={`font-bold font-mono ${
                                    line.doneQty >= line.demandQty
                                      ? 'text-emerald-600'
                                      : line.doneQty > 0
                                      ? 'text-amber-600'
                                      : 'text-slate-400'
                                  }`}
                                >
                                  {Number(line.doneQty).toFixed(4)}
                                </span>
                                <span className="text-[10px] text-slate-400">{line.product?.uom}</span>
                                {isEditable && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingLineId(line.id);
                                      setEditingDoneQty(line.doneQty.toString());
                                    }}
                                    className="text-[10px] text-purple-600 hover:underline ml-1"
                                  >
                                    edit
                                  </button>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Line Actions */}
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
                      );
                    })
                  ) : (
                    <div className="py-6 text-center text-xs text-slate-400">
                      No line items in this order.
                    </div>
                  )}
                </div>
              </div>

              {/* Notes */}
              {delivery.notes && (
                <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-600">
                  <span className="font-semibold text-slate-700 block mb-0.5">Notes / Reference:</span>
                  <p>{delivery.notes}</p>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Modal Footer / Workflow Actions */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/60 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {isEditable && (
              <button
                type="button"
                onClick={handleCancel}
                disabled={actionLoading}
                className="px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-colors border border-red-200"
              >
                Cancel Order
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

            {/* State-specific actions */}
            {delivery?.status === 'DRAFT' && (
              <button
                type="button"
                onClick={handleStartPicking}
                disabled={actionLoading}
                className="px-4 py-2 bg-purple-100 hover:bg-purple-200 text-purple-800 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
              >
                <Box className="w-4 h-4 text-purple-600" />
                <span>Start Picking (WAITING)</span>
              </button>
            )}

            {delivery?.status === 'WAITING' && (
              <button
                type="button"
                onClick={handleMarkReady}
                disabled={actionLoading}
                className="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-800 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
              >
                <Truck className="w-4 h-4 text-blue-600" />
                <span>Mark Ready (READY)</span>
              </button>
            )}

            {/* Validate button available in DRAFT, WAITING, READY for Managers/Admins */}
            {isEditable && (
              <button
                type="button"
                onClick={handleValidate}
                disabled={actionLoading || !isManagerOrAdmin}
                title={
                  !isManagerOrAdmin
                    ? 'Only Inventory Managers and Admins can validate & deduct stock'
                    : 'Validate and deduct inventory'
                }
                className={`px-5 py-2 text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2 ${
                  isManagerOrAdmin
                    ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-purple-500/20 active:scale-95'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Validate & Ship (Deduct Stock)</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
