import React, { useState, useEffect } from 'react';
import { Plus, ShieldCheck } from 'lucide-react';
import { Modal } from '../common/Modal';
import { createProduct, updateProduct, getLocations } from '../../api/client';
import { useToast } from '../common/Toast';
import { useAuth } from '../../context/AuthContext';
import { Product, Category, Location } from '../../types';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  product?: Product | null;
  categories: Category[];
  onSuccess: (product: Product) => void;
  onOpenCategoryModal: () => void;
}

const COMMON_UOMS = ['Units', 'kg', 'm', 'Box', 'Liters', 'Bags', 'Pcs', 'Rolls', 'Pairs'];

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  product,
  categories,
  onSuccess,
  onOpenCategoryModal,
}) => {
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  const isEditing = Boolean(product);
  const isManagerOrAdmin = user?.role === 'ADMIN' || user?.role === 'INVENTORY_MANAGER';

  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [uom, setUom] = useState('Units');
  const [reorderThreshold, setReorderThreshold] = useState<string>('0');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Optional initial stock
  const [initialStock, setInitialStock] = useState<string>('0');
  const [initialLocationId, setInitialLocationId] = useState<string>('');
  const [locations, setLocations] = useState<Location[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      getLocations().then((locs) => {
        const active = locs.filter((l) => !l.isScrap && l.isActive);
        setLocations(active);
        if (active.length > 0 && !initialLocationId) {
          setInitialLocationId(active[0].id);
        }
      }).catch(() => {});
    }
  }, [isOpen]);

  useEffect(() => {
    if (product) {
      setName(product.name);
      setSku(product.sku);
      setCategoryId(product.categoryId);
      setUom(product.uom);
      setReorderThreshold(String(product.reorderThreshold ?? 0));
      setDescription(product.description || '');
      setIsActive(product.isActive);
      setInitialStock('0');
    } else {
      setName('');
      setSku('');
      setCategoryId(categories[0]?.id || '');
      setUom('Units');
      setReorderThreshold('0');
      setDescription('');
      setIsActive(true);
      setInitialStock('0');
    }
    setFieldErrors({});
    setGeneralError(null);
  }, [product, isOpen, categories]);

  const validate = () => {
    const errors: Record<string, string> = {};
    if (!name.trim()) errors.name = 'Product name is required';
    if (!sku.trim()) errors.sku = 'SKU / Product Code is required';
    if (!categoryId) errors.categoryId = 'Please select a category';
    if (!uom.trim()) errors.uom = 'Unit of measure is required';
    const thresholdNum = parseFloat(reorderThreshold);
    if (isNaN(thresholdNum) || thresholdNum < 0) {
      errors.reorderThreshold = 'Threshold must be a valid non-negative number';
    }
    const initStockNum = parseFloat(initialStock);
    if (isNaN(initStockNum) || initStockNum < 0) {
      errors.initialStock = 'Opening stock must be a non-negative number';
    }
    if (initStockNum > 0 && !initialLocationId) {
      errors.initialLocationId = 'Please select a location for opening stock';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setSubmitting(true);
      setFieldErrors({});
      setGeneralError(null);

      const parsedInitStock = parseFloat(initialStock) || 0;

      const payload = {
        name: name.trim(),
        sku: sku.trim().toUpperCase(),
        categoryId,
        uom: uom.trim(),
        reorderThreshold: parseFloat(reorderThreshold) || 0,
        description: description.trim() || null,
        isActive,
        initialStock: !isEditing && isManagerOrAdmin ? parsedInitStock : 0,
        initialLocationId: !isEditing && isManagerOrAdmin && parsedInitStock > 0 ? initialLocationId : null,
      };

      let result: Product;
      if (isEditing && product) {
        result = await updateProduct(product.id, payload);
        showSuccess(`Product "${result.name}" updated successfully`);
      } else {
        result = await createProduct(payload);
        if (parsedInitStock > 0) {
          showSuccess(`Product "${result.name}" created with ${parsedInitStock} opening stock (audited in ledger)`);
        } else {
          showSuccess(`Product "${result.name}" created with zero initial balance`);
        }
      }

      onSuccess(result);
      onClose();
    } catch (err: any) {
      if (err.details) {
        const mapped: Record<string, string> = {};
        for (const [key, msgs] of Object.entries(err.details)) {
          mapped[key] = (msgs as string[])[0];
        }
        setFieldErrors(mapped);
      }
      const msg = err.message || (isEditing ? 'Failed to update product' : 'Failed to create product');
      setGeneralError(msg);
      showError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? `Edit Product: ${product?.name}` : 'Create New Product'}
      subtitle={
        isEditing
          ? 'Update product attributes and reorder rules'
          : 'Define product metadata, SKU, and category'
      }
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {generalError && (
          <div className="p-3 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
            {generalError}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Name */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Product Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: '' }));
              }}
              placeholder="e.g. Steel Rods, Industrial Sensor X1"
              className={`w-full px-3.5 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all text-slate-900 ${
                fieldErrors.name ? 'border-rose-300 ring-1 ring-rose-300' : 'border-slate-200'
              }`}
              required
            />
            {fieldErrors.name && (
              <p className="mt-1 text-xs text-rose-600">{fieldErrors.name}</p>
            )}
          </div>

          {/* SKU */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              SKU / Product Code <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={sku}
              onChange={(e) => {
                setSku(e.target.value.toUpperCase());
                if (fieldErrors.sku) setFieldErrors((prev) => ({ ...prev, sku: '' }));
              }}
              placeholder="e.g. RAW-STL-001"
              className={`w-full px-3.5 py-2 text-sm font-mono uppercase bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all text-slate-900 ${
                fieldErrors.sku ? 'border-rose-300 ring-1 ring-rose-300' : 'border-slate-200'
              }`}
              required
            />
            {fieldErrors.sku && (
              <p className="mt-1 text-xs text-rose-600 font-sans">{fieldErrors.sku}</p>
            )}
          </div>

          {/* Category with quick add button */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Category <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={onOpenCategoryModal}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-600 hover:text-purple-700"
              >
                <Plus className="w-3 h-3" />
                <span>New Category</span>
              </button>
            </div>
            <select
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                if (fieldErrors.categoryId) setFieldErrors((prev) => ({ ...prev, categoryId: '' }));
              }}
              className={`w-full px-3.5 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all text-slate-900 ${
                fieldErrors.categoryId ? 'border-rose-300 ring-1 ring-rose-300' : 'border-slate-200'
              }`}
              required
            >
              <option value="" disabled>Select a category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            {fieldErrors.categoryId && (
              <p className="mt-1 text-xs text-rose-600">{fieldErrors.categoryId}</p>
            )}
          </div>

          {/* Unit of Measure */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Unit of Measure (UOM) <span className="text-rose-500">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={uom}
                onChange={(e) => {
                  setUom(e.target.value);
                  if (fieldErrors.uom) setFieldErrors((prev) => ({ ...prev, uom: '' }));
                }}
                placeholder="e.g. kg, m, Box"
                className={`w-full px-3.5 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all text-slate-900 ${
                  fieldErrors.uom ? 'border-rose-300 ring-1 ring-rose-300' : 'border-slate-200'
                }`}
                required
              />
            </div>
            <div className="flex flex-wrap gap-1 mt-1.5">
              {COMMON_UOMS.map((commonUom) => (
                <button
                  key={commonUom}
                  type="button"
                  onClick={() => setUom(commonUom)}
                  className={`text-[10px] px-1.5 py-0.5 rounded border ${
                    uom === commonUom
                      ? 'bg-purple-50 border-purple-300 text-purple-700 font-semibold'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {commonUom}
                </button>
              ))}
            </div>
          </div>

          {/* Reorder Warning Threshold */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Reorder Warning Threshold
            </label>
            <input
              type="number"
              min="0"
              step="0.0001"
              value={reorderThreshold}
              onChange={(e) => {
                setReorderThreshold(e.target.value);
                if (fieldErrors.reorderThreshold) setFieldErrors((prev) => ({ ...prev, reorderThreshold: '' }));
              }}
              className={`w-full px-3.5 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all text-slate-900 ${
                fieldErrors.reorderThreshold ? 'border-rose-300 ring-1 ring-rose-300' : 'border-slate-200'
              }`}
            />
            <p className="mt-1 text-[11px] text-slate-500">
              Low-stock alerts trigger when total on-hand stock is &le; threshold.
            </p>
          </div>

          {/* Optional Opening Stock (Available to Managers/Admins during creation) */}
          {!isEditing && isManagerOrAdmin && (
            <div className="sm:col-span-2 p-3.5 bg-purple-50/50 border border-purple-200/80 rounded-xl space-y-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-purple-700" />
                <span className="text-xs font-bold text-purple-900 uppercase tracking-wider">
                  Manager Opening Stock (Optional)
                </span>
              </div>
              <p className="text-[11px] text-purple-700">
                Opening stock will be recorded via an audited adjustment and ledger entry upon creation.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-purple-900 mb-1">
                    Opening Quantity
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.0001"
                    value={initialStock}
                    onChange={(e) => setInitialStock(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-purple-200 rounded-lg text-slate-900 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-purple-900 mb-1">
                    Storage Location
                  </label>
                  <select
                    value={initialLocationId}
                    onChange={(e) => setInitialLocationId(e.target.value)}
                    disabled={parseFloat(initialStock) <= 0}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-purple-200 rounded-lg text-slate-900 disabled:opacity-50"
                  >
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.warehouse?.name} - {loc.name} ({loc.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Description */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Description (Optional)
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide additional details, storage instructions, or specifications..."
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all text-slate-900 resize-none"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 active:scale-95 disabled:opacity-50 rounded-lg shadow-sm transition-all flex items-center gap-2"
          >
            {submitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Product'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
