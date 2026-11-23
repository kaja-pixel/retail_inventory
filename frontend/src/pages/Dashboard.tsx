import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  Layers,
  Boxes,
  DollarSign,
  AlertTriangle,
  XCircle,
  TrendingUp,
  ArrowRight,
  Plus,
  RefreshCw,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { api, getApiErrorMessage } from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import { DashboardSummary, Product, InventoryTransaction } from '../types/index.js';
import { Alert } from '../components/Alert.js';

export const Dashboard: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [recentProducts, setRecentProducts] = useState<Product[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<InventoryTransaction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const fetchDashboardData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const [sumRes, actRes] = await Promise.all([
        api.get('/dashboard/summary'),
        api.get('/dashboard/recent-activities'),
      ]);

      if (sumRes.data?.success) {
        setSummary(sumRes.data.data);
      }
      if (actRes.data?.success) {
        setRecentProducts(actRes.data.data.recentProducts || []);
        setRecentTransactions(actRes.data.data.recentTransactions || []);
      }
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium text-slate-500">Loading dashboard analytics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Inventory Dashboard
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Real-time stock valuation, health metrics, and inventory movements.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchDashboardData}
            className="p-2 border border-slate-200 bg-white hover:bg-slate-50 rounded-xl text-slate-600 transition-colors shadow-xs"
            title="Refresh data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {isAdmin && (
            <Link
              to="/products/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Product</span>
            </Link>
          )}
        </div>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Products */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Products</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">
              {summary?.totalProducts || 0}
            </p>
            <span className="text-xs text-slate-500 mt-1 block">
              Across {summary?.totalCategories || 0} categories
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Package className="w-6 h-6" />
          </div>
        </div>

        {/* Total Units in Stock */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Units In Stock</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">
              {summary?.totalStockUnits?.toLocaleString() || 0}
            </p>
            <span className="text-xs text-emerald-600 font-medium mt-1 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              Active physical units
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Boxes className="w-6 h-6" />
          </div>
        </div>

        {/* Low Stock Alert Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Low Stock Items</p>
            <p className="text-2xl font-extrabold text-amber-600 mt-1">
              {summary?.lowStockCount || 0}
            </p>
            <Link
              to="/products?stockStatus=LOW_STOCK"
              className="text-xs text-amber-600 hover:text-amber-700 font-medium mt-1 inline-flex items-center gap-1"
            >
              Review items <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        {/* Out of Stock Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Out of Stock</p>
            <p className="text-2xl font-extrabold text-rose-600 mt-1">
              {summary?.outOfStockCount || 0}
            </p>
            <Link
              to="/products?stockStatus=OUT_OF_STOCK"
              className="text-xs text-rose-600 hover:text-rose-700 font-medium mt-1 inline-flex items-center gap-1"
            >
              Restock required <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <XCircle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Total Valuation Banner */}
      <div className="p-6 bg-gradient-to-r from-slate-900 to-indigo-950 rounded-2xl text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider">
            Total Inventory Valuation
          </span>
          <div className="text-3xl sm:text-4xl font-extrabold text-white mt-1">
            Rs {summary?.totalValuation?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Calculated as sum of (Unit Price × Stock Quantity) across all active products.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/products"
            className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors border border-white/15"
          >
            Explore Product Catalog
          </Link>
          <Link
            to="/inventory/transactions"
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-colors"
          >
            View Stock Ledger
          </Link>
        </div>
      </div>

      {/* Category Breakdown & Recent Activities Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Breakdown */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900">Categories Distribution</h3>
            <span className="text-xs text-slate-500 font-medium">Units</span>
          </div>

          <div className="space-y-4">
            {summary?.categories?.map((cat) => {
              const maxUnits = Math.max(...(summary?.categories.map((c) => c.total_units) || [100]));
              const percent = maxUnits > 0 ? (cat.total_units / maxUnits) * 100 : 0;

              return (
                <div key={cat.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800">{cat.name}</span>
                    <span className="text-slate-500">{cat.total_units} units (Rs {Number(cat.valuation).toFixed(2)})</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recently Updated Products */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900">Recently Updated Products</h3>
            <Link
              to="/products"
              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center gap-1"
            >
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Product Name</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3 text-right">Price</th>
                  <th className="py-2.5 px-3 text-right">Stock</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentProducts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400">
                      No products recorded
                    </td>
                  </tr>
                ) : (
                  recentProducts.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-slate-800">
                        {p.name}
                        <span className="block text-[10px] text-slate-400 font-mono">{p.sku}</span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">{p.category_name}</td>
                      <td className="py-2.5 px-3 text-right font-medium text-slate-700">
                        Rs {Number(p.unit_price).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <span
                          className={`font-bold px-2 py-0.5 rounded-full text-[11px] ${
                            p.stock_quantity === 0
                              ? 'bg-rose-100 text-rose-700'
                              : p.stock_quantity <= 10
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {p.stock_quantity}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <Link
                          to={`/products/${p.id}`}
                          className="text-indigo-600 hover:text-indigo-800 font-medium inline-flex items-center gap-1"
                        >
                          Details <ExternalLink className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Recent Inventory Transactions Ledger */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">Recent Inventory Stock Movements</h3>
          </div>
          <Link
            to="/inventory/transactions"
            className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center gap-1"
          >
            Full Ledger <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Date & Time</th>
                <th className="py-2.5 px-3">Product</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3 text-right">Change</th>
                <th className="py-2.5 px-3 text-right">Balance</th>
                <th className="py-2.5 px-3">Reason</th>
                <th className="py-2.5 px-3">User</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-400">
                    No transactions recorded yet
                  </td>
                </tr>
              ) : (
                recentTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                      {new Date(tx.created_at).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-800">
                      {tx.product_name}
                      <span className="block text-[10px] text-slate-400 font-mono">{tx.product_sku}</span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="font-semibold text-slate-700">{tx.transaction_type}</span>
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
                    <td className="py-2.5 px-3 text-right font-medium text-slate-700">
                      {tx.new_quantity}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 max-w-[200px] truncate">
                      {tx.reason}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500">
                      {tx.user_name || 'System'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
