import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, ArrowDownToLine, AlertCircle, Building2, MapPin, Calendar, Package } from 'lucide-react';
import { Location, Product } from '../../types';
import * as api from '../../api/client';
import { useToast } from '../common/Toast';

interface ReceiptFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface TempLine {
  productId: string;
  demandQty: string;
}

export const ReceiptFormModal: React.FC<ReceiptFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { showSuccess, showError } = useToast();
  const [partner, setPartner] = useState('');
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
      // Reset form
      setPartner('');
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
      setLocations(locs.filter((l) => !l.isScrap && l.isActive));
      setProducts(prods.filter((p) => p.isActive));

      if (locs.length > 0 && !destLocationId) {
        const defaultLoc = locs.find((l) => l.code.includes('INPUT') || l.code.includes('STOCK')) || locs[0];
        setDestLocationId(defaultLoc.id);
      }
    } catch {
      setError('Failed to load locations and products');
    }
  };

  const addLine = () => {
    if (products.length === 0) return;
    setLines([...lines, { productId: products[0].id, demandQty: '10' }]);
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
    if (!partner.trim()) {
      setError('Supplier / Partner name is required');
      return;
    }
    if (!destLocationId) {
      setError('Destination location is required');
      return;
    }
    if (lines.length === 0) {
      setError('Please add at least one line item to receive');
      return;
    }

    // Validate quantities
    for (let i = 0; i < lines.length; i++) {
      const q = parseFloat(lines[i].demandQty);
      if (isNaN(q) || q <= 0) {
        setError(`Line #${i + 1} has an invalid demand quantity. Must be greater than 0.`);
        return;
      }
    }

    setError(null);
    setSubmitting(true);
    try {
      await api.createReceipt({
        partner: partner.trim(),
        destLocationId,
        expectedDate: expectedDate ? new Date(expectedDate).toISOString() : null,
        notes: notes.trim() || null,
        lines: lines.map((l) => ({
          productId: l.productId,
          demandQty: parseFloat(l.demandQty),
          doneQty: 0,
        })),
      });

      showSuccess('Incoming stock receipt created successfully!');
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create receipt');
      showError(err.message || 'Failed to create receipt');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-100 my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-purple-700 to-indigo-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-md">
              <ArrowDownToLine className="w-5 h-5 text-purple-200" />
            </div>
            <div>
              <h3 className="font-semibold text-base">New Incoming Stock Receipt</h3>
              <p className="text-xs text-purple-200">Create a draft goods arrival order from supplier</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Supplier / Partner <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={partner}
                  onChange={(e) => setPartner(e.target.value)}
                  placeholder="e.g. Apex Industrial Supplies"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Destination Location <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <select
                  required
                  value={destLocationId}
                  onChange={(e) => setDestLocationId(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all text-slate-900"
                >
                  <option value="">Select Destination...</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} ({loc.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Expected Arrival Date
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="date"
                  value={expectedDate}
                  onChange={(e) => setExpectedDate(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Notes / Reference Remarks
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. PO-8941 / Express delivery"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all text-slate-900"
              />
            </div>
          </div>

          {/* Line Items Section */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Package className="w-4 h-4 text-purple-600" />
                Product Line Items ({lines.length})
              </span>
              <button
                type="button"
                onClick={addLine}
                className="py-1.5 px-3 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Product Line
              </button>
            </div>

            {lines.length === 0 ? (
              <div className="border border-dashed border-slate-200 rounded-xl p-6 text-center text-slate-500">
                <p className="text-xs">No product lines added yet.</p>
                <button
                  type="button"
                  onClick={addLine}
                  className="mt-2 text-xs font-bold text-purple-600 hover:text-purple-700 hover:underline"
                >
                  + Add First Product
                </button>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {lines.map((line, index) => {
                  const selectedProd = products.find((p) => p.id === line.productId);
                  return (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl"
                    >
                      <div className="flex-1 min-w-0">
                        <select
                          value={line.productId}
                          onChange={(e) => updateLine(index, 'productId', e.target.value)}
                          className="w-full py-1.5 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                        >
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} [{p.sku}] ({p.uom})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="w-32 flex items-center gap-1.5">
                        <input
                          type="number"
                          step="0.0001"
                          min="0.0001"
                          required
                          value={line.demandQty}
                          onChange={(e) => updateLine(index, 'demandQty', e.target.value)}
                          placeholder="Demand"
                          className="w-full py-1.5 px-2 bg-white border border-slate-200 rounded-lg text-xs font-mono font-semibold text-right text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                        />
                        <span className="text-[11px] font-semibold text-slate-500 shrink-0">
                          {selectedProd?.uom || 'Units'}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeLine(index)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Remove line"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="py-2.5 px-5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-500/20 transition-all flex items-center gap-2"
            >
              {submitting ? 'Creating Receipt...' : 'Save Draft Receipt'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
