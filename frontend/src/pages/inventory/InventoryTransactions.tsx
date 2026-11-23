import React, { useState, useEffect, useCallback } from 'react';
import { History, Filter, ArrowUpDown, Clock, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api, getApiErrorMessage } from '../../services/api.js';
import { InventoryTransaction, PaginationMeta, TransactionType } from '../../types/index.js';
import { Pagination } from '../../components/Pagination.js';
import { Alert } from '../../components/Alert.js';

export const InventoryTransactions: React.FC = () => {
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    limit: 15,
  });

  const [transactionType, setTransactionType] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const fetchTransactions = useCallback(
    async (page: number = 1) => {
      setIsLoading(true);
      setError('');
      try {
        const params: Record<string, any> = {
          page,
          limit: pagination.limit,
        };
        if (transactionType) params.transactionType = transactionType;

        const res = await api.get('/inventory/transactions', { params });
        if (res.data?.success) {
          setTransactions(res.data.data.transactions);
          setPagination(res.data.data.pagination);
        }
      } catch (err) {
        setError(getApiErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    },
    [transactionType, pagination.limit]
  );

  useEffect(() => {
    fetchTransactions(1);
  }, [fetchTransactions]);

  const getBadgeStyle = (type: TransactionType) => {
    switch (type) {
      case 'RESTOCK':
      case 'RETURN':
        return 'bg-emerald-100 text-emerald-800';
      case 'DAMAGE':
      case 'LOSS':
        return 'bg-rose-100 text-rose-800';
      case 'SALE':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-purple-100 text-purple-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Stock Movement Ledger</h2>
          <p className="text-sm text-slate-500 mt-1">
            Audit history of every stock adjustment, restock, damage write-off, and sales fulfillment.
          </p>
        </div>

        {/* Filter by Type */}
        <div className="w-full sm:w-60">
          <select
            value={transactionType}
            onChange={(e) => setTransactionType(e.target.value)}
            className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 shadow-xs"
          >
            <option value="">All Movement Types</option>
            <option value="RESTOCK">Restock</option>
            <option value="DAMAGE">Damaged Goods</option>
            <option value="LOSS">Loss / Shrinkage</option>
            <option value="SALE">Sale Outflow</option>
            <option value="RETURN">Customer Return</option>
            <option value="ADJUSTMENT">Audit Adjustment</option>
            <option value="INITIAL">Initial Inventory Setup</option>
          </select>
        </div>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">Date & Time</th>
                <th className="py-3.5 px-4">Product</th>
                <th className="py-3.5 px-4">Movement Type</th>
                <th className="py-3.5 px-4 text-right">Qty Change</th>
                <th className="py-3.5 px-4 text-right">Previous</th>
                <th className="py-3.5 px-4 text-right">New Stock</th>
                <th className="py-3.5 px-4">Reason / Justification</th>
                <th className="py-3.5 px-4">Authorized User</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <div className="inline-block w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mb-2" />
                    <p className="font-medium">Loading ledger records...</p>
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <History className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-semibold text-slate-600">No stock movements found</p>
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                      {new Date(tx.created_at).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4">
                      <Link
                        to={`/products/${tx.product_id}`}
                        className="font-semibold text-slate-900 hover:text-indigo-600 transition-colors inline-flex items-center gap-1"
                      >
                        {tx.product_name}
                        <ExternalLink className="w-3 h-3 text-slate-400" />
                      </Link>
                      <span className="block text-[10px] font-mono text-slate-400">
                        {tx.product_sku}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`font-semibold px-2.5 py-0.5 rounded-full text-[11px] ${getBadgeStyle(
                          tx.transaction_type
                        )}`}
                      >
                        {tx.transaction_type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold">
                      <span
                        className={
                          tx.quantity_change > 0 ? 'text-emerald-600' : 'text-rose-600'
                        }
                      >
                        {tx.quantity_change > 0
                          ? `+${tx.quantity_change}`
                          : tx.quantity_change}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-500">
                      {tx.previous_quantity}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                      {tx.new_quantity}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 max-w-[240px]">
                      <p className="truncate font-medium">{tx.reason}</p>
                      {tx.notes && (
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          {tx.notes}
                        </p>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-medium">
                      {tx.user_name || 'System / Batch'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-slate-100 px-4">
          <Pagination
            meta={pagination}
            onPageChange={(p) => fetchTransactions(p)}
          />
        </div>
      </div>
    </div>
  );
};

