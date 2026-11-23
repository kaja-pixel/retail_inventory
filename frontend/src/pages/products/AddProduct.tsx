import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save, Sparkles } from 'lucide-react';
import { api, getApiErrorMessage } from '../../services/api.js';
import { Category } from '../../types/index.js';
import { Alert } from '../../components/Alert.js';

export const AddProduct: React.FC = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingCats, setIsLoadingCats] = useState(true);

  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [description, setDescription] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [stockQuantity, setStockQuantity] = useState('0');
  const [lowStockThreshold, setLowStockThreshold] = useState('10');

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await api.get('/products/categories');
        if (res.data?.success) {
          setCategories(res.data.data);
          if (res.data.data.length > 0) {
            setCategoryId(res.data.data[0].id);
          }
        }
      } catch (err) {
        setError(getApiErrorMessage(err));
      } finally {
        setIsLoadingCats(false);
      }
    };
    fetchCategories();
  }, []);

  const generateSku = () => {
    const cat = categories.find((c) => c.id === categoryId);
    const prefix = cat ? cat.name.slice(0, 3).toUpperCase() : 'SKU';
    const random = Math.floor(1000 + Math.random() * 9000);
    setSku(`${prefix}-${random}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const priceNum = parseFloat(unitPrice);
    const stockNum = parseInt(stockQuantity, 10);
    const threshNum = parseInt(lowStockThreshold, 10);

    if (isNaN(priceNum) || priceNum < 0) {
      setError('Unit price must be a valid non-negative number.');
      return;
    }
    if (isNaN(stockNum) || stockNum < 0) {
      setError('Stock quantity must be a non-negative integer.');
      return;
    }
    if (isNaN(threshNum) || threshNum < 0) {
      setError('Low-stock threshold must be a non-negative integer.');
      return;
    }
    if (!categoryId) {
      setError('Please select a valid category.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.post('/products', {
        name: name.trim(),
        sku: sku.trim().toUpperCase(),
        categoryId: Number(categoryId),
        description: description.trim() || undefined,
        unitPrice: priceNum,
        stockQuantity: stockNum,
        lowStockThreshold: threshNum,
      });

      if (res.data?.success) {
        navigate(`/products/${res.data.data.id}`);
      }
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          to="/products"
          className="p-2 border border-slate-200 bg-white hover:bg-slate-50 rounded-xl text-slate-600 transition-colors shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Add New Product</h2>
          <p className="text-sm text-slate-500">
            Create an inventory item with SKU, unit price, and low-stock alert thresholds.
          </p>
        </div>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Product Name */}
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Product Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ergonomic Office Chair"
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* SKU */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                SKU (Stock Keeping Unit) <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={generateSku}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" />
                Generate SKU
              </button>
            </div>
            <input
              type="text"
              required
              value={sku}
              onChange={(e) => setSku(e.target.value.toUpperCase())}
              placeholder="e.g. OFF-CHR-901"
              className="w-full px-3.5 py-2.5 text-sm font-mono border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 uppercase"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Category <span className="text-rose-500">*</span>
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(Number(e.target.value))}
              disabled={isLoadingCats}
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Unit Price */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Unit Price (Rs) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              placeholder="0.00"
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Initial Stock Quantity */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Initial Stock Quantity <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              min="0"
              required
              value={stockQuantity}
              onChange={(e) => setStockQuantity(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Low Stock Alert Threshold */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Low-Stock Threshold Alert <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              min="0"
              required
              value={lowStockThreshold}
              onChange={(e) => setLowStockThreshold(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
            <span className="text-[11px] text-slate-400 mt-1 block">
              Triggers in-app alerts when stock reaches or drops below this count.
            </span>
          </div>

          {/* Description */}
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Product Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed specifications, model numbers, supplier references..."
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <Link
            to="/products"
            className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-xs disabled:opacity-50 transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>{isSubmitting ? 'Saving Product...' : 'Create Product'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
