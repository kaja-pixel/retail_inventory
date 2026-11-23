import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Edit,
  Trash2,
  Sliders,
  Package,
  Layers,
  Clock,
  User as UserIcon,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  History,
} from 'lucide-react';
import { api, getApiErrorMessage } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';
import { Product } from '../../types/index.js';
import { Alert } from '../../components/Alert.js';
import { StockAdjustmentModal } from '../../components/StockAdjustmentModal.js';
import { Modal } from '../../components/Modal.js';

export const ProductDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { isAdmin, isSuperAdmin } = useAuth();
  const navigate = useNavigate();

  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState<boolean>(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const fetchProduct = async () => {
    setIsLoading(true);
    try {
      const res = await api.get(`/products/${id}`);
      if (res.data?.success) {
        setProduct(res.data.data);
      }
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const handleDelete = async () => {
    if (!product) return;
    setIsDeleting(true);
    try {
      await api.delete(`/products/${product.id}`);
      navigate('/products');
    } catch (err) {
      setError(getApiErrorMessage(err));
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium text-slate-500">Loading product details...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-16 space-y-3">
        <Package className="w-12 h-12 text-slate-300 mx-auto" />
        <h3 className="text-lg font-bold text-slate-800">Product Not Found</h3>
        <p className="text-sm text-slate-500">The requested product does not exist or was removed.</p>
        <Link
          to="/products"
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Product Catalog
        </Link>
      </div>
    );
  }

  const isLowStock = product.stock_quantity <= product.low_stock_threshold && product.stock_quantity > 0;
  const isOutOfStock = product.stock_quantity === 0;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/products"
            className="p-2 border border-slate-200 bg-white hover:bg-slate-50 rounded-xl text-slate-600 transition-colors shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{product.name}</h2>
              {isOutOfStock ? (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-700">
                  Out of Stock
                </span>
              ) : isLowStock ? (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                  Low Stock Alert
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                  Healthy Stock
                </span>
              )}
            </div>
            <p className="text-xs font-mono text-slate-500 mt-0.5">SKU: {product.sku}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {isAdmin && (
            <>
              <button
                onClick={() => setIsAdjustModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-sm font-semibold transition-colors"
              >
                <Sliders className="w-4 h-4" />
                <span>Adjust Stock</span>
              </button>

              <Link
                to={`/products/${product.id}/edit`}
                className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-semibold transition-colors shadow-xs"
              >
                <Edit className="w-4 h-4" />
                <span>Edit</span>
              </Link>
            </>
          )}

          {isSuperAdmin && (
            <button
              onClick={() => setIsDeleteModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-sm font-semibold transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete</span>
            </button>
          )}
        </div>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

      {/* Grid of Key Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Current Stock */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Current Stock
          </span>
          <div className="text-3xl font-extrabold text-slate-900 mt-2">
            {product.stock_quantity}
          </div>
          <span className="text-xs text-slate-400 mt-1 block">
            Threshold: {product.low_stock_threshold} units
          </span>
        </div>

        {/* Unit Price */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Unit Price
          </span>
          <div className="text-3xl font-extrabold text-indigo-600 mt-2">
            Rs {Number(product.unit_price).toFixed(2)}
          </div>
          <span className="text-xs text-slate-400 mt-1 block">Retail List Price</span>
        </div>

        {/* Inventory Valuation */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Stock Valuation
          </span>
          <div className="text-3xl font-extrabold text-slate-900 mt-2">
            Rs {(Number(product.unit_price) * product.stock_quantity).toFixed(2)}
          </div>
          <span className="text-xs text-slate-400 mt-1 block">Total Asset Value</span>
        </div>

        {/* Category */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Category
          </span>
          <div className="text-xl font-bold text-slate-800 mt-2 truncate">
            {product.category_name}
          </div>
          <span className="text-xs text-slate-400 mt-1 block font-mono">
            Cat ID: {product.category_id}
          </span>
        </div>
      </div>

      {/* Main Details and Metadata */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs lg:col-span-2 space-y-4">
          <h3 className="text-base font-bold text-slate-900">Product Description & Specs</h3>
          <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
            {product.description || 'No detailed description provided for this inventory product.'}
          </p>

          <div className="pt-4 border-t border-slate-100">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Stock Threshold Policy
            </h4>
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
              <p>
                <strong>Low-Stock Level:</strong> Any quantity at or below {product.low_stock_threshold} units will generate warning notifications for staff and inventory managers.
              </p>
              <p>
                <strong>Out-of-Stock Level:</strong> 0 units will trigger high-priority alerts to expedite supplier replenishment.
              </p>
            </div>
          </div>
        </div>

        {/* Audit & Creation Metadata */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <h3 className="text-base font-bold text-slate-900">Audit Metadata</h3>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-400 block">Product ID (UUID)</span>
              <span className="font-mono text-slate-700 break-all">{product.id}</span>
            </div>

            <div>
              <span className="text-slate-400 block">Created On</span>
              <span className="text-slate-700 font-medium">
                {new Date(product.created_at).toLocaleString()}
              </span>
            </div>

            {product.created_by_name && (
              <div>
                <span className="text-slate-400 block">Created By</span>
                <span className="text-slate-700 font-medium">{product.created_by_name}</span>
              </div>
            )}

            <div>
              <span className="text-slate-400 block">Last Updated</span>
              <span className="text-slate-700 font-medium">
                {new Date(product.updated_at).toLocaleString()}
              </span>
            </div>

            {product.updated_by_name && (
              <div>
                <span className="text-slate-400 block">Updated By</span>
                <span className="text-slate-700 font-medium">{product.updated_by_name}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Transaction Movement History */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-900">Stock Movement History</h3>
          </div>
          <span className="text-xs text-slate-400">Latest 10 adjustments</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3 text-right">Change</th>
                <th className="py-2.5 px-3 text-right">Previous</th>
                <th className="py-2.5 px-3 text-right">New Stock</th>
                <th className="py-2.5 px-3">Reason</th>
                <th className="py-2.5 px-3">User</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!product.transactions || product.transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-400">
                    No transaction history recorded yet for this product.
                  </td>
                </tr>
              ) : (
                product.transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                      {new Date(tx.created_at).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-700">
                      {tx.transaction_type}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span
                        className={`font-bold ${
                          tx.quantity_change > 0 ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {tx.quantity_change > 0 ? `+${tx.quantity_change}` : tx.quantity_change}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-500 font-mono">
                      {tx.previous_quantity}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-800 font-mono">
                      {tx.new_quantity}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">{tx.reason}</td>
                    <td className="py-2.5 px-3 text-slate-500">{tx.user_name || 'System'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Adjust Modal */}
      {isAdjustModalOpen && (
        <StockAdjustmentModal
          isOpen={isAdjustModalOpen}
          onClose={() => setIsAdjustModalOpen(false)}
          product={product}
          onSuccess={() => {
            setSuccess('Stock adjusted successfully!');
            fetchProduct();
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="Delete Product"
          maxWidth="sm"
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Are you sure you want to permanently delete <strong>{product.name}</strong>?
            </p>
            <p className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-100">
              This action cannot be undone. All transaction history for this item will also be removed.
            </p>
            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
