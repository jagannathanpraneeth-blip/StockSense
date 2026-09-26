import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Plus, RefreshCw, Filter, Boxes, AlertTriangle, Layers } from 'lucide-react';
import { getProducts, getCategories, getProduct } from '../api/client';
import { Product, Category } from '../types';
import { ProductList } from '../components/products/ProductList';
import { ProductFormModal } from '../components/products/ProductFormModal';
import { ProductDetailModal } from '../components/products/ProductDetailModal';
import { CategoryModal } from '../components/products/CategoryModal';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { useToast } from '../components/common/Toast';

export const ProductsPage: React.FC = () => {
  const { showError } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const requestId = useRef(0);
  const [stockFilter, setStockFilter] = useState('all');
  const [loadError, setLoadError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const fetchData = useCallback(async () => {
    const current = ++requestId.current;
    try {
      setLoading(true);
      setLoadError('');
      const [prodsData, catsData] = await Promise.all([
        getProducts(searchQuery, selectedCategory || undefined),
        getCategories(),
      ]);
      if (current !== requestId.current) return;
      setProducts(prodsData);
      setCategories(catsData);
    } catch (err: any) {
      if (current !== requestId.current) return;
      setLoadError(err.message || 'Failed to load products');
      showError(err.message || 'Failed to load products');
    } finally {
      if (current === requestId.current) setLoading(false);
    }
  }, [searchQuery, selectedCategory, showError]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 200);
    return () => clearTimeout(timer);
  }, [fetchData]);

  const handleCreateProduct = () => {
    setSelectedProduct(null);
    setIsFormModalOpen(true);
  };

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product);
    setIsFormModalOpen(true);
  };

  const handleViewProduct = async (product: Product) => {
    try { const fresh = await getProduct(product.id); setSelectedProduct(fresh); setIsDetailModalOpen(true); }
    catch (e: any) { showError(e.message || 'Could not load current stock'); }
  };

  const handleProductSaved = (saved: Product) => {
    // Refresh products list
    fetchData();
    // Update selected product if detail modal or form was open
    if (selectedProduct?.id === saved.id) {
      setSelectedProduct(saved);
    }
  };

  const handleCategoryCreated = (newCat: Category) => {
    setCategories((prev) => [...prev, newCat]);
    setSelectedCategory(newCat.id);
  };

  const totalCount = products.length;
  const lowStockCount = products.filter((p) => p.isLowStock).length;

  return (
    <div className="space-y-6">
      {/* Header & Metric Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Products & Stock Levels</h2>
          <p className="text-xs text-slate-500 mt-1">
            Manage catalogue items, inventory thresholds, and inspect real-time location balances
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsCategoryModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition-colors"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Add Category</span>
          </button>

          <button
            onClick={handleCreateProduct}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-sm transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>New Product</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Catalogue Items</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{totalCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Boxes className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Low Stock Warnings</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{lowStockCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Product Categories</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{categories.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by product name or SKU code..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-900 transition-all"
          />
        </div>

        <select aria-label="Stock status" value={stockFilter} onChange={e => setStockFilter(e.target.value)} className="px-3 py-2 text-xs border rounded-lg">
          <option value="all">All stock levels</option><option value="low">Low stock</option><option value="out">Out of stock</option><option value="available">In stock</option>
        </select>
        {/* Category Filter */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-48">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full pl-8 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-700 cursor-pointer"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={fetchData}
            title="Refresh list"
            className="p-2 text-slate-500 hover:text-purple-700 hover:bg-purple-50 border border-slate-200 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-purple-600' : ''}`} />
          </button>
        </div>
      </div>

      {loadError && <div role="alert" className="p-3 bg-rose-50 text-rose-700 rounded-lg">{loadError}</div>}
      {/* Main Table Content */}
      {loading ? (
        <LoadingSpinner label="Loading product catalogue..." fullHeight />
      ) : (
        <ProductList
          products={products.filter(p => stockFilter === 'all' || (stockFilter === 'low' ? p.isLowStock : stockFilter === 'out' ? p.totalStock === 0 : (p.totalStock || 0) > 0))}
          onViewProduct={handleViewProduct}
          onEditProduct={handleEditProduct}
          onCreateProduct={handleCreateProduct}
        />
      )}

      {/* Product Form Modal (Create / Edit) */}
      <ProductFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        product={selectedProduct}
        categories={categories}
        onSuccess={handleProductSaved}
        onOpenCategoryModal={() => setIsCategoryModalOpen(true)}
      />

      {/* Product Detail Modal (Location stock breakdown) */}
      <ProductDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        product={selectedProduct}
        onEdit={handleEditProduct}
      />

      {/* Category Creation Modal */}
      <CategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onCategoryCreated={handleCategoryCreated}
      />
    </div>
  );
};
