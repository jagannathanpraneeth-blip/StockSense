import React, { useState, useEffect } from 'react';
import { Plus, Info } from 'lucide-react';
import { Modal } from '../common/Modal';
import { createProduct, updateProduct } from '../../api/client';
import { useToast } from '../common/Toast';
import { Product, Category } from '../../types';

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
  const { showSuccess, showError } = useToast();
  const isEditing = Boolean(product);

  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [uom, setUom] = useState('Units');
  const [reorderThreshold, setReorderThreshold] = useState<string>('0');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  useEffect(() => {
    if (product) {
      setName(product.name);
      setSku(product.sku);
      setCategoryId(product.categoryId);
      setUom(product.uom);
      setReorderThreshold(String(product.reorderThreshold ?? 0));
      setDescription(product.description || '');
      setIsActive(product.isActive);
    } else {
      setName('');
      setSku('');
      setCategoryId(categories[0]?.id || '');
      setUom('Units');
      setReorderThreshold('0');
      setDescription('');
      setIsActive(true);
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

      const payload = {
        name: name.trim(),
        sku: sku.trim().toUpperCase(),
        categoryId,
        uom: uom.trim(),
        reorderThreshold: parseFloat(reorderThreshold) || 0,
        description: description.trim() || null,
        isActive,
      };

      let result: Product;
      if (isEditing && product) {
        result = await updateProduct(product.id, payload);
        showSuccess(`Product "${result.name}" updated successfully`);
      } else {
        result = await createProduct(payload);
        showSuccess(`Product "${result.name}" created with zero initial balance`);
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

        {/* Notice for new product zero balance */}
        {!isEditing && (
          <div className="flex items-start gap-2.5 p-3 text-xs text-purple-800 bg-purple-50/80 border border-purple-200/70 rounded-lg">
            <Info className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
            <p>
              In Stage 1, newly created products start with <strong>0.0 stock balance</strong> across all warehouse locations. Opening stock entry will be logged into the ledger in Stage 2 operations.
            </p>
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
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Category <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={onOpenCategoryModal}
                className="inline-flex items-center gap-1 text-xs font-semibold text-purple-600 hover:text-purple-800"
              >
                <Plus className="w-3 h-3" />
                <span>New</span>
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
              <option value="" disabled>Select Category</option>
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
              <select
                value={COMMON_UOMS.includes(uom) ? uom : 'custom'}
                onChange={(e) => {
                  if (e.target.value !== 'custom') {
                    setUom(e.target.value);
                  }
                }}
                className="w-1/2 px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-900"
              >
                {COMMON_UOMS.map((unit) => (
                  <option key={unit} value={unit}>{unit}</option>
                ))}
                <option value="custom">Other / Custom</option>
              </select>
              <input
                type="text"
                value={uom}
                onChange={(e) => setUom(e.target.value)}
                placeholder="Units, kg, m..."
                className="w-1/2 px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-900"
                required
              />
            </div>
            {fieldErrors.uom && (
              <p className="mt-1 text-xs text-rose-600">{fieldErrors.uom}</p>
            )}
          </div>

          {/* Reorder Threshold */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Reorder Warning Threshold
            </label>
            <input
              type="number"
              step="any"
              min="0"
              value={reorderThreshold}
              onChange={(e) => {
                setReorderThreshold(e.target.value);
                if (fieldErrors.reorderThreshold) setFieldErrors((prev) => ({ ...prev, reorderThreshold: '' }));
              }}
              placeholder="0.0"
              className={`w-full px-3.5 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all text-slate-900 ${
                fieldErrors.reorderThreshold ? 'border-rose-300 ring-1 ring-rose-300' : 'border-slate-200'
              }`}
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Triggers low stock alert when total stock ≤ threshold
            </p>
            {fieldErrors.reorderThreshold && (
              <p className="mt-1 text-xs text-rose-600">{fieldErrors.reorderThreshold}</p>
            )}
          </div>

          {/* Description */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Description <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Additional specifications or notes..."
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all text-slate-900 resize-none"
            />
          </div>

          {/* Active Status */}
          <div className="sm:col-span-2 flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="productActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 text-purple-600 border-slate-300 rounded focus:ring-purple-500"
            />
            <label htmlFor="productActive" className="text-xs font-medium text-slate-700 cursor-pointer">
              Product is active and available for warehouse operations
            </label>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-sm transition-all disabled:opacity-50"
          >
            {submitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Product'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
