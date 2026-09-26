import React, { useState, useEffect } from 'react';
import { X, SlidersHorizontal, AlertCircle, MapPin, Package, FileText, ArrowRight, ShieldAlert } from 'lucide-react';
import { Location, Product } from '../../types';
import * as api from '../../api/client';
import { useToast } from '../common/Toast';

interface AdjustmentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AdjustmentFormModal: React.FC<AdjustmentFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { showSuccess, showError } = useToast();
  const [productId, setProductId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [countedQty, setCountedQty] = useState('');
  const [reason, setReason] = useState('');

  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [currentBalance, setCurrentBalance] = useState<number | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadPrerequisites();
    } else {
      setProductId('');
      setLocationId('');
      setCountedQty('');
      setReason('');
      setCurrentBalance(null);
      setError(null);
    }
  }, [isOpen]);

  const loadPrerequisites = async () => {
    try {
      const [locs, prods] = await Promise.all([
        api.getLocations(),
        api.getProducts(),
      ]);
      const validLocs = locs.filter((l) => l.isActive);
      const validProds = prods.filter((p) => p.isActive);
      setLocations(validLocs);
      setProducts(validProds);

      if (validProds.length > 0) setProductId(validProds[0].id);
      if (validLocs.length > 0) setLocationId(validLocs[0].id);
    } catch {
      setError('Failed to load locations and products');
    }
  };

  // Fetch current live balance whenever product or location changes
  useEffect(() => {
    if (!productId || !locationId) return;

    let isMounted = true;
    setLoadingBalance(true);

    const fetchCurrentBalance = async () => {
      try {
        const prod = await api.getProduct(productId);
        if (!isMounted) return;
        const balObj = prod.balances?.find((b) => b.locationId === locationId);
        const bal = balObj ? Number(balObj.quantity) : 0;
        setCurrentBalance(bal);
        if (!countedQty) {
          setCountedQty(bal.toString());
        }
      } catch {
        if (isMounted) setCurrentBalance(0);
      } finally {
        if (isMounted) setLoadingBalance(false);
      }
    };

    fetchCurrentBalance();
    return () => {
      isMounted = false;
    };
  }, [productId, locationId]);

  const selectedProduct = products.find((p) => p.id === productId);
  const parsedCounted = parseFloat(countedQty);
  const recorded = currentBalance ?? 0;
  const delta = !isNaN(parsedCounted) ? parsedCounted - recorded : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId || !locationId) {
      setError('Product and location are required');
      return;
    }
    if (isNaN(parsedCounted) || parsedCounted < 0) {
      setError('Counted quantity cannot be negative');
      return;
    }
    if (!reason.trim()) {
      setError('Reason for inventory adjustment is required for auditing');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await api.createAdjustment({
        productId,
        locationId,
        countedQty: parsedCounted,
        reason: reason.trim(),
      });

      showSuccess('Inventory adjustment recorded in DRAFT');
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create adjustment');
      showError(err.message || 'Failed to create adjustment');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">New Physical Inventory Count</h3>
              <p className="text-xs text-slate-500">Record physical stock count and reconcile discrepancies (WH/ADJ)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Product */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Product to Count <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  required
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.sku}] {p.name}
                    </option>
                  ))}
                </select>
                <Package className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Warehouse Location <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  required
                  value={locationId}
                  onChange={(e) => setLocationId(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                >
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.warehouse?.name} - {loc.name} ({loc.code})
                    </option>
                  ))}
                </select>
                <MapPin className="w-4 h-4 text-purple-500 absolute left-3 top-2.5 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Reconciliation Balance Preview */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-4">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Quantity Reconciliation
            </h4>

            <div className="grid grid-cols-3 gap-3 items-center text-center">
              {/* Recorded Quantity */}
              <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Recorded in System
                </span>
                <span className="text-sm font-bold font-mono text-slate-700">
                  {loadingBalance ? '...' : recorded.toFixed(4)}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  {selectedProduct?.uom || 'units'}
                </span>
              </div>

              {/* Arrow */}
              <div className="flex items-center justify-center text-slate-400">
                <ArrowRight className="w-5 h-5" />
              </div>

              {/* Physical Count Input */}
              <div className="p-3 bg-white rounded-xl border border-purple-200 shadow-xs">
                <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider block mb-1">
                  Physical Count
                </span>
                <div className="flex items-center justify-center">
                  <input
                    type="number"
                    step="0.0001"
                    min="0"
                    required
                    value={countedQty}
                    onChange={(e) => setCountedQty(e.target.value)}
                    className="w-24 text-center font-bold font-mono text-sm border-b-2 border-purple-500 focus:outline-hidden py-0.5 bg-transparent"
                  />
                </div>
                <span className="text-[10px] text-purple-600 block mt-0.5">
                  {selectedProduct?.uom || 'units'}
                </span>
              </div>
            </div>

            {/* Calculated Delta */}
            <div
              className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                delta > 0
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : delta < 0
                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                  : 'bg-slate-100 border-slate-200 text-slate-700'
              }`}
            >
              <span className="font-semibold">Calculated Stock Delta:</span>
              <span className="font-mono font-bold text-sm">
                {delta > 0 ? `+${delta.toFixed(4)}` : delta.toFixed(4)} {selectedProduct?.uom}
                {delta === 0 ? ' (No Variance)' : delta > 0 ? ' (Stock Surplus)' : ' (Stock Deficit)'}
              </span>
            </div>
          </div>

          {/* Reason / Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Reason for Adjustment <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                required
                placeholder="e.g. Annual physical count, Damaged inventory write-off, Found unrecorded pallet"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
              />
              <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            </div>
          </div>

          <div className="p-3 bg-purple-50/60 border border-purple-200/60 rounded-xl text-xs text-purple-900 flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Creating this adjustment saves the count in DRAFT and captures a balance snapshot.
              An Inventory Manager or Admin will validate and commit the change to the stock ledger.
            </p>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md shadow-purple-500/20 transition-all flex items-center gap-2"
            >
              {submitting ? 'Recording...' : 'Record Adjustment Draft'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
