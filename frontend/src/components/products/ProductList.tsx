import React from 'react';
import { Edit2, Eye, AlertTriangle } from 'lucide-react';
import { Badge } from '../common/Badge';
import { EmptyState } from '../common/EmptyState';
import { Product } from '../../types';

interface ProductListProps {
  products: Product[];
  onViewProduct: (product: Product) => void;
  onEditProduct: (product: Product) => void;
  onCreateProduct: () => void;
}

export const ProductList: React.FC<ProductListProps> = ({
  products,
  onViewProduct,
  onEditProduct,
  onCreateProduct,
}) => {
  if (products.length === 0) {
    return (
      <EmptyState
        title="No products found"
        description="Try adjusting your search query or category filter, or create a new inventory product."
        actionText="Create Product"
        onAction={onCreateProduct}
      />
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
              <th className="px-4 py-3">SKU / Code</th>
              <th className="px-4 py-3">Product Name</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">UOM</th>
              <th className="px-4 py-3">Reorder Alert</th>
              <th className="px-4 py-3 text-right">Total On-Hand</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
            {products.map((product) => {
              const totalStock = product.totalStock ?? 0;
              const isLowStock =
                product.reorderThreshold > 0 && totalStock <= product.reorderThreshold;

              return (
                <tr
                  key={product.id}
                  className="hover:bg-purple-50/40 transition-colors group cursor-pointer"
                  onClick={() => onViewProduct(product)}
                >
                  {/* SKU */}
                  <td className="px-4 py-3">
                    <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/80 text-[11px]">
                      {product.sku}
                    </span>
                  </td>

                  {/* Name */}
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    <div className="flex items-center gap-1.5">
                      <span>{product.name}</span>
                      {isLowStock && (
                        <span
                          title={`Low Stock Warning: ${totalStock} <= ${product.reorderThreshold} ${product.uom}`}
                          className="inline-flex text-amber-600"
                        >
                          <AlertTriangle className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Category */}
                  <td className="px-4 py-3">
                    <Badge variant="purple" size="sm">
                      {product.category?.name || 'Uncategorized'}
                    </Badge>
                  </td>

                  {/* UOM */}
                  <td className="px-4 py-3 text-slate-600">
                    {product.uom}
                  </td>

                  {/* Reorder Threshold */}
                  <td className="px-4 py-3 text-slate-600">
                    {product.reorderThreshold > 0 ? (
                      <span>{product.reorderThreshold} {product.uom}</span>
                    ) : (
                      <span className="text-slate-400">None</span>
                    )}
                  </td>

                  {/* Total Stock */}
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5 font-bold font-mono">
                      <span
                        className={
                          isLowStock
                            ? 'text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200'
                            : 'text-slate-900'
                        }
                      >
                        {totalStock} {product.uom}
                      </span>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3 text-center">
                    <Badge
                      variant={product.isActive ? 'success' : 'neutral'}
                      size="sm"
                    >
                      {product.isActive ? 'Active' : 'Archived'}
                    </Badge>
                  </td>

                  {/* Actions */}
                  <td
                    className="px-4 py-3 text-right"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => onViewProduct(product)}
                        title="View stock per location"
                        className="p-1.5 text-slate-500 hover:text-purple-700 hover:bg-purple-100/60 rounded-lg transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onEditProduct(product)}
                        title="Edit product"
                        className="p-1.5 text-slate-500 hover:text-purple-700 hover:bg-purple-100/60 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
