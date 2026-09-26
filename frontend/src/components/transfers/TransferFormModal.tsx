import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, ArrowRightLeft, AlertCircle, MapPin, Calendar, Package } from 'lucide-react';
import { Location, Product } from '../../types';
import * as api from '../../api/client';
import { useToast } from '../common/Toast';

interface TransferFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface TempLine {
  productId: string;
  demandQty: string;
}

export const TransferFormModal: React.FC<TransferFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { showSuccess, showError } = useToast();
  const [sourceLocationId, setSourceLocationId] = useState('');
  const [destLocationId, setDestLocationId] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<TempLine[]>([]);

  const [locations, setLocations] = useState<Location[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadPrerequisites();
    } else {
      setSourceLocationId('');
      setDestLocationId('');
      setExpectedDate('');
      setNotes('');
      setLines([]);
      setError(null);
    }
  }, [isOpen]);

  const loadPrerequisites = async () => {
    try {
      const [locs, prods] = await Promise.all([
        api.getLocations(),
        api.getProducts(),
      ]);
      const validLocs = locs.filter((l) => !l.isScrap && l.isActive);
      setLocations(validLocs);
      setProducts(prods.filter((p) => p.isActive));

      if (validLocs.length >= 2) {
        setSourceLocationId(validLocs[0].id);
        setDestLocationId(validLocs[1].id);
      } else if (validLocs.length === 1) {
        setSourceLocationId(validLocs[0].id);
      }
    } catch {
      setError('Failed to load locations and products');
    }
  };

  const addLine = () => {
    if (products.length === 0) return;
    setLines([...lines, { productId: products[0].id, demandQty: '1' }]);
  };

  const updateLine = (index: number, field: keyof TempLine, val: string) => {
    const updated = [...lines];
    updated[index][field] = val;
    setLines(updated);
  };

  const removeLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceLocationId || !destLocationId) {
      setError('Both source and destination locations are required');
      return;
    }
    if (sourceLocationId === destLocationId) {
      setError('Source and Destination locations must be different');
      return;
    }
    if (lines.length === 0) {
      setError('Please add at least one product line to transfer');
      return;
    }

    for (let i = 0; i < lines.length; i++) {
      const q = parseFloat(lines[i].demandQty);
      if (isNaN(q) || q <= 0) {
        setError(`Line #${i + 1} has an invalid quantity`);
        return;
      }
    }

    setSubmitting(true);
    setError(null);

    try {
      await api.createTransfer({
        sourceLocationId,
        destLocationId,
        expectedDate: expectedDate ? new Date(expectedDate).toISOString() : null,
        notes: notes.trim() || null,
        lines: lines.map((l) => ({
          productId: l.productId,
          demandQty: parseFloat(l.demandQty),
        })),
      });

      showSuccess('Internal transfer created successfully');
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create internal transfer');
      showError(err.message || 'Failed to create internal transfer');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">New Internal Transfer</h3>
              <p className="text-xs text-slate-500">Move inventory between warehouse locations (WH/INT)</p>
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
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1">
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Source Location */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Source Location (From) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  required
                  value={sourceLocationId}
                  onChange={(e) => setSourceLocationId(e.target.value)}
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

            {/* Destination Location */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Destination Location (To) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  required
                  value={destLocationId}
                  onChange={(e) => setDestLocationId(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                >
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id} disabled={loc.id === sourceLocationId}>
                      {loc.warehouse?.name} - {loc.name} ({loc.code}) {loc.id === sourceLocationId ? '(Source)' : ''}
                    </option>
                  ))}
                </select>
                <MapPin className="w-4 h-4 text-emerald-500 absolute left-3 top-2.5 pointer-events-none" />
              </div>
            </div>

            {/* Expected Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Scheduled Transfer Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={expectedDate}
                  onChange={(e) => setExpectedDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                />
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Reason / Notes
              </label>
              <input
                type="text"
                placeholder="e.g. Warehouse rebalancing, Staging to Packing"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
              />
            </div>
          </div>

          {/* Line Items Section */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Items to Transfer</h4>
                <p className="text-[11px] text-slate-400">Specify items and quantity to relocate</p>
              </div>
              <button
                type="button"
                onClick={addLine}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-xs font-semibold transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
            </div>

            {lines.length === 0 ? (
              <div className="p-8 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-center">
                <Package className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-xs font-medium text-slate-500">No items added to this transfer yet.</p>
                <button
                  type="button"
                  onClick={addLine}
                  className="mt-2 text-xs text-purple-600 hover:text-purple-700 font-semibold"
                >
                  + Click to add your first item
                </button>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                <div className="grid grid-cols-12 gap-2 bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <div className="col-span-7">Product</div>
                  <div className="col-span-4">Transfer Qty</div>
                  <div className="col-span-1 text-right">Action</div>
                </div>

                {lines.map((line, idx) => {
                  const selProd = products.find((p) => p.id === line.productId);
                  return (
                    <div key={idx} className="grid grid-cols-12 gap-2 p-3 items-center hover:bg-slate-50/50 transition-colors">
                      <div className="col-span-7">
                        <select
                          value={line.productId}
                          onChange={(e) => updateLine(idx, 'productId', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                        >
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              [{p.sku}] {p.name} ({p.uom})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-4 flex items-center gap-1.5">
                        <input
                          type="number"
                          step="0.0001"
                          min="0.0001"
                          required
                          value={line.demandQty}
                          onChange={(e) => updateLine(idx, 'demandQty', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-right focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                        />
                        <span className="text-[11px] text-slate-400 font-medium shrink-0 w-8">
                          {selProd?.uom || 'units'}
                        </span>
                      </div>

                      <div className="col-span-1 text-right">
                        <button
                          type="button"
                          onClick={() => removeLine(idx)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
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
              {submitting ? 'Creating...' : 'Create Transfer Draft'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
