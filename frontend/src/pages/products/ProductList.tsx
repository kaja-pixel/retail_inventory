import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Package,
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  MoreVertical,
  Edit,
  Trash2,
  Sliders,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ExternalLink,
} from 'lucide-react';
import { api, getApiErrorMessage } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';
import { Product, Category, PaginationMeta } from '../../types/index.js';
import { Pagination } from '../../components/Pagination.js';
import { Alert } from '../../components/Alert.js';
import { StockAdjustmentModal } from '../../components/StockAdjustmentModal.js';
import { Modal } from '../../components/Modal.js';

export const ProductList: React.FC = () => {
  const { isAdmin, isSuperAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    limit: 10,
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [alert, setAlert] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

  // Filters & Sorting state initialized from searchParams
  const [search, setSearch] = useState<string>(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState<string>(searchParams.get('categoryId') || '');
  const [stockStatus, setStockStatus] = useState<string>(searchParams.get('stockStatus') || 'ALL');
  const [sortBy, setSortBy] = useState<string>(searchParams.get('sortBy') || 'created_at');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>((searchParams.get('sortOrder') as any) || 'DESC');

  // Modals
  const [adjustProduct, setAdjustProduct] = useState<Product | null>(null);
  const [deleteProductCandidate, setDeleteProductCandidate] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Fetch categories
  useEffect(() => {
    const fetchCats = async () => {
      try {
        const res = await api.get('/products/categories');
        if (res.data?.success) setCategories(res.data.data);
      } catch (err) {
        console.error('Failed to load categories:', err);
      }
    };
    fetchCats();
  }, []);

  const fetchProducts = useCallback(
    async (page: number = 1) => {
      setIsLoading(true);
      try {
        const params: Record<string, any> = {
          page,
          limit: pagination.limit,
          sortBy,
          sortOrder,
        };
        if (search.trim()) params.search = search.trim();
        if (selectedCategory) params.categoryId = selectedCategory;
        if (stockStatus && stockStatus !== 'ALL') params.stockStatus = stockStatus;

        const res = await api.get('/products', { params });
        if (res.data?.success) {
          setProducts(res.data.data.products);
          setPagination(res.data.data.pagination);
        }
      } catch (err) {
        setAlert({ type: 'error', message: getApiErrorMessage(err) });
      } finally {
        setIsLoading(false);
      }
    },
    [search, selectedCategory, stockStatus, sortBy, sortOrder, pagination.limit]
  );

  useEffect(() => {
    fetchProducts(1);
  }, [fetchProducts]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProducts(1);
  };

  const handleDelete = async () => {
    if (!deleteProductCandidate) return;
    setIsDeleting(true);
    try {
      await api.delete(`/products/${deleteProductCandidate.id}`);
      setAlert({
        type: 'success',
        message: `Product "${deleteProductCandidate.name}" deleted successfully.`,
      });
      setDeleteProductCandidate(null);
      fetchProducts(pagination.currentPage);
    } catch (err) {
      setAlert({ type: 'error', message: getApiErrorMessage(err) });
    } finally {
      setIsDeleting(false);
    }
  };

  const getStockBadge = (product: Product) => {
    if (product.stock_quantity === 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-700">
          <XCircle className="w-3.5 h-3.5" />
          Out of Stock
        </span>
      );
    }
    if (product.stock_quantity <= product.low_stock_threshold) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
          <AlertTriangle className="w-3.5 h-3.5" />
          Low Stock ({product.stock_quantity})
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
        <CheckCircle2 className="w-3.5 h-3.5" />
        In Stock ({product.stock_quantity})
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Product Catalog</h2>
          <p className="text-sm text-slate-500 mt-1">
            Manage inventory items, SKUs, pricing, stock levels, and thresholds.
          </p>
        </div>

        {isAdmin && (
          <Link
            to="/products/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-xs transition-colors self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Product</span>
          </Link>
        )}
      </div>

      {alert && (
        <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          {/* Search Input */}
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search by product name, SKU, or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Category Filter */}
          <div className="w-full md:w-48">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Stock Status Filter */}
          <div className="w-full md:w-44">
            <select
              value={stockStatus}
              onChange={(e) => setStockStatus(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Stock Levels</option>
              <option value="IN_STOCK">In Stock</option>
              <option value="LOW_STOCK">Low Stock</option>
              <option value="OUT_OF_STOCK">Out of Stock</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="w-full md:w-44">
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [sb, so] = e.target.value.split('-');
                setSortBy(sb);
                setSortOrder(so as any);
              }}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              <option value="created_at-DESC">Newest First</option>
              <option value="created_at-ASC">Oldest First</option>
              <option value="name-ASC">Name (A-Z)</option>
              <option value="name-DESC">Name (Z-A)</option>
              <option value="price-DESC">Price (High to Low)</option>
              <option value="price-ASC">Price (Low to High)</option>
              <option value="stock-ASC">Stock (Low to High)</option>
              <option value="stock-DESC">Stock (High to Low)</option>
            </select>
          </div>

          <button
            type="submit"
            className="px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors shrink-0"
          >
            Apply
          </button>
        </form>
      </div>

      {/* Products Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">Product Details</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4 text-right">Unit Price</th>
                <th className="py-3.5 px-4 text-center">Stock Level</th>
                <th className="py-3.5 px-4 text-right">Threshold</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <div className="inline-block w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mb-2" />
                    <p className="font-medium">Loading products...</p>
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Package className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-semibold text-slate-600">No products match your criteria</p>
                    <p className="text-xs text-slate-400 mt-0.5">Try clearing filters or search terms</p>
                  </td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Name & SKU */}
                    <td className="py-3.5 px-4">
                      <Link
                        to={`/products/${p.id}`}
                        className="font-semibold text-slate-900 hover:text-indigo-600 transition-colors block text-sm"
                      >
                        {p.name}
                      </Link>
                      <span className="text-[11px] font-mono text-slate-400 mt-0.5 block">
                        SKU: {p.sku}
                      </span>
                    </td>

                    {/* Category */}
                    <td className="py-3.5 px-4">
                      <span className="inline-block bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium text-[11px]">
                        {p.category_name}
                      </span>
                    </td>

                    {/* Price */}
                    <td className="py-3.5 px-4 text-right font-medium text-slate-800 text-sm">
                      Rs {Number(p.unit_price).toFixed(2)}
                    </td>

                    {/* Stock Status Badge */}
                    <td className="py-3.5 px-4 text-center">
                      {getStockBadge(p)}
                    </td>

                    {/* Threshold */}
                    <td className="py-3.5 px-4 text-right text-slate-500 font-mono">
                      {p.low_stock_threshold}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          to={`/products/${p.id}`}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>

                        {isAdmin && (
                          <>
                            <button
                              onClick={() => setAdjustProduct(p)}
                              className="px-2 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                              title="Adjust Stock"
                            >
                              Adjust
                            </button>

                            <Link
                              to={`/products/${p.id}/edit`}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="Edit Product"
                            >
                              <Edit className="w-4 h-4" />
                            </Link>
                          </>
                        )}

                        {isSuperAdmin && (
                          <button
                            onClick={() => setDeleteProductCandidate(p)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete Product"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="border-t border-slate-100 px-4">
          <Pagination
            meta={pagination}
            onPageChange={(page) => fetchProducts(page)}
          />
        </div>
      </div>

      {/* Stock Adjustment Modal */}
      {adjustProduct && (
        <StockAdjustmentModal
          isOpen={!!adjustProduct}
          onClose={() => setAdjustProduct(null)}
          product={adjustProduct}
          onSuccess={() => {
            setAlert({ type: 'success', message: 'Stock adjusted successfully!' });
            fetchProducts(pagination.currentPage);
          }}
        />
      )}

      {/* Delete Confirmation Modal (SuperAdmin Only) */}
      {deleteProductCandidate && (
        <Modal
          isOpen={!!deleteProductCandidate}
          onClose={() => setDeleteProductCandidate(null)}
          title="Confirm Product Deletion"
          maxWidth="sm"
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-600 leading-relaxed">
              Are you sure you want to delete{' '}
              <strong className="text-slate-900">{deleteProductCandidate.name}</strong> (SKU:{' '}
              {deleteProductCandidate.sku})?
            </p>
            <p className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-100">
              Warning: This action will permanently remove the product and all associated historical inventory transactions.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteProductCandidate(null)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
