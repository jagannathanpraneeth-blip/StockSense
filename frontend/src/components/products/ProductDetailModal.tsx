import React from 'react';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import { Product } from '../../types';
import { MapPin, AlertTriangle, CheckCircle2, Box } from 'lucide-react';

interface ProductDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onEdit: (product: Product) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  isOpen,
  onClose,
  product,
  onEdit,
}) => {
  if (!product) return null;

  const totalStock = product.totalStock ?? 0;
  const isLowStock = product.reorderThreshold > 0 && totalStock <= product.reorderThreshold;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={product.name}
      subtitle={`SKU: ${product.sku}`}
      maxWidth="xl"
    >
      <div className="space-y-6">
        {/* Top Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl">
            <span className="text-[11px] font-semibold uppercase text-slate-500 tracking-wider">
              Category
            </span>
            <p className="text-sm font-bold text-slate-800 mt-0.5">
              {product.category?.name || 'Uncategorized'}
            </p>
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl">
            <span className="text-[11px] font-semibold uppercase text-slate-500 tracking-wider">
              Unit of Measure
            </span>
            <p className="text-sm font-bold text-slate-800 mt-0.5">
              {product.uom}
            </p>
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl">
            <span className="text-[11px] font-semibold uppercase text-slate-500 tracking-wider">
              Reorder Warning Level
            </span>
            <p className="text-sm font-bold text-slate-800 mt-0.5">
              {product.reorderThreshold} {product.uom}
            </p>
          </div>
        </div>

        {/* Stock Overview Status Banner */}
        <div
          className={`p-4 rounded-xl border flex items-center justify-between ${
            isLowStock
              ? 'bg-amber-50/70 border-amber-200 text-amber-900'
              : 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                isLowStock ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
              }`}
            >
              {isLowStock ? (
                <AlertTriangle className="w-5 h-5" />
              ) : (
                <CheckCircle2 className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold">
                  Total On-Hand Stock: {totalStock} {product.uom}
                </span>
                <Badge variant={isLowStock ? 'warning' : 'success'} size="sm">
                  {isLowStock ? 'Low Stock / Reorder' : 'Adequate'}
                </Badge>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                {isLowStock
                  ? `Stock is at or below reorder threshold of ${product.reorderThreshold} ${product.uom}.`
                  : `Stock level meets or exceeds safe operational thresholds.`}
              </p>
            </div>
          </div>
        </div>

        {/* Stock Breakdown per Location */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-purple-600" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Stock Availability per Warehouse Location
              </h4>
            </div>
            <span className="text-xs text-slate-500 font-medium">
              {product.stockBalances?.length || 0} locations recorded
            </span>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="px-4 py-2.5">Warehouse</th>
                  <th className="px-4 py-2.5">Location Name</th>
                  <th className="px-4 py-2.5">Location Code</th>
                  <th className="px-4 py-2.5 text-right">On-Hand Quantity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {product.stockBalances && product.stockBalances.length > 0 ? (
                  product.stockBalances.map((sb) => (
                    <tr key={sb.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-2.5 font-semibold text-slate-900">
                        {sb.location?.warehouse?.name || 'Warehouse'}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <span>{sb.location?.name || 'Location'}</span>
                          {sb.location?.isScrap && (
                            <Badge variant="danger" size="sm">Scrap</Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-slate-500">
                        {sb.location?.code}
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold text-slate-900 font-mono">
                        {sb.quantity} {product.uom}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-1">
                        <Box className="w-6 h-6 text-slate-300 mb-1" />
                        <span>No location balances initialized yet.</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Description & Metadata */}
        {product.description && (
          <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl">
            <span className="text-[11px] font-semibold uppercase text-slate-500 tracking-wider">
              Product Description
            </span>
            <p className="text-xs text-slate-700 mt-1 leading-relaxed">
              {product.description}
            </p>
          </div>
        )}

        {/* Actions Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <div className="text-[11px] text-slate-400 font-mono">
            Created: {new Date(product.createdAt).toLocaleDateString()}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Close
            </button>
            <button
              onClick={() => {
                onClose();
                onEdit(product);
              }}
              className="px-4 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-sm transition-all"
            >
              Edit Product Details
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
