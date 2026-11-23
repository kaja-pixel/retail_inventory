import React, { useState } from 'react';
import { Modal } from './Modal.js';
import { Alert } from './Alert.js';
import { api, getApiErrorMessage } from '../services/api.js';
import { Product, TransactionType } from '../types/index.js';
import { ArrowRight, Package } from 'lucide-react';

interface StockAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onSuccess: () => void;
}

export const StockAdjustmentModal: React.FC<StockAdjustmentModalProps> = ({
  isOpen,
  onClose,
  product,
  onSuccess,
}) => {
  const [transactionType, setTransactionType] = useState<TransactionType>('RESTOCK');
  const [quantity, setQuantity] = useState<string>('1');
  const [reason, setReason] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!product) return null;

  const currentStock = Number(product.stock_quantity);
  const qtyNum = parseInt(quantity, 10) || 0;

  // Positive or negative based on transaction type
  const isDeduction = ['DAMAGE', 'LOSS', 'SALE'].includes(transactionType);
  const effectiveChange = isDeduction ? -Math.abs(qtyNum) : Math.abs(qtyNum);
  const projectedStock = currentStock + effectiveChange;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (qtyNum <= 0) {
      setError('Quantity must be greater than zero.');
      return;
    }

    if (projectedStock < 0) {
      setError(`Cannot deduct ${qtyNum} units. Current stock is only ${currentStock}.`);
      return;
    }

    if (!reason.trim()) {
      setError('Please provide a reason for this adjustment.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/inventory/adjustments', {
        productId: product.id,
        transactionType,
        quantityChange: effectiveChange,
        reason: reason.trim(),
        notes: notes.trim() || undefined,
      });

      onSuccess();
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Adjust Stock Quantity" maxWidth="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert type="error" message={error} onClose={() => setError('')} />}

        {/* Product Brief Banner */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold text-slate-800">{product.name}</h4>
            <p className="text-xs text-slate-500 font-mono">SKU: {product.sku}</p>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-500 block">Current Stock</span>
            <span className="text-sm font-bold text-slate-800">{currentStock} units</span>
          </div>
        </div>

        {/* Adjustment Type */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Adjustment Type
          </label>
          <select
            value={transactionType}
            onChange={(e) => setTransactionType(e.target.value as TransactionType)}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          >
            <option value="RESTOCK">Restock (Shipment / Purchase) (+)</option>
            <option value="DAMAGE">Damaged Goods (-)</option>
            <option value="LOSS">Lost / Shrinkage (-)</option>
            <option value="SALE">Manual Sales Out (-)</option>
            <option value="RETURN">Customer Return (+)</option>
            <option value="ADJUSTMENT">Inventory Audit Adjustment (+)</option>
          </select>
        </div>

        {/* Quantity */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Quantity Units {isDeduction ? '(To Deduct)' : '(To Add)'}
          </label>
          <input
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            required
          />
        </div>

        {/* Projected Stock Preview */}
        <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 flex items-center justify-between text-xs">
          <span className="text-indigo-900 font-medium">Stock Projection:</span>
          <div className="flex items-center gap-2 font-bold text-indigo-950">
            <span>{currentStock}</span>
            <ArrowRight className="w-3.5 h-3.5 text-indigo-500" />
            <span className={projectedStock < 0 ? 'text-rose-600' : 'text-emerald-700'}>
              {projectedStock} units
            </span>
          </div>
        </div>

        {/* Reason */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Reason for Adjustment <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            placeholder="e.g. Received weekly distributor delivery batch #402"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            required
          />
        </div>

        {/* Optional Notes */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Additional Notes (Optional)
          </label>
          <textarea
            rows={2}
            placeholder="Additional context or invoice reference numbers..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 resize-none"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || projectedStock < 0}
            className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Recording...' : 'Confirm Adjustment'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

