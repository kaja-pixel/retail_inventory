import React, { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, Search, Filter, Clock, User as UserIcon } from 'lucide-react';
import { api, getApiErrorMessage } from '../../services/api.js';
import { AuditLog, PaginationMeta } from '../../types/index.js';
import { Pagination } from '../../components/Pagination.js';
import { Alert } from '../../components/Alert.js';

export const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    limit: 20,
  });

  const [search, setSearch] = useState('');
  const [selectedAction, setSelectedAction] = useState('');
  const [selectedEntity, setSelectedEntity] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchLogs = useCallback(
    async (page: number = 1) => {
      setIsLoading(true);
      setError('');
      try {
        const params: Record<string, any> = {
          page,
          limit: pagination.limit,
        };
        if (search.trim()) params.search = search.trim();
        if (selectedAction) params.action = selectedAction;
        if (selectedEntity) params.entityType = selectedEntity;

        const res = await api.get('/audit-logs', { params });
        if (res.data?.success) {
          setLogs(res.data.data.logs);
          setPagination(res.data.data.pagination);
        }
      } catch (err) {
        setError(getApiErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    },
    [search, selectedAction, selectedEntity, pagination.limit]
  );

  useEffect(() => {
    fetchLogs(1);
  }, [fetchLogs]);

  const getActionColor = (action: string) => {
    if (action.includes('DELETED') || action.includes('DEACTIVATED')) return 'bg-rose-100 text-rose-800';
    if (action.includes('CREATED') || action.includes('REGISTER')) return 'bg-emerald-100 text-emerald-800';
    if (action.includes('UPDATED') || action.includes('ROLE_CHANGED')) return 'bg-blue-100 text-blue-800';
    if (action.includes('STOCK')) return 'bg-amber-100 text-amber-800';
    return 'bg-purple-100 text-purple-800';
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Security Audit Logs</h2>
        <p className="text-sm text-slate-500 mt-1">
          Immutable trail of authenticated actions, inventory changes, role updates, and system access.
        </p>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by actor email, action, or entity ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="w-full md:w-52">
          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Actions</option>
            <option value="USER_LOGIN">USER_LOGIN</option>
            <option value="USER_REGISTER">USER_REGISTER</option>
            <option value="USER_ROLE_CHANGED">USER_ROLE_CHANGED</option>
            <option value="USER_STATUS_CHANGED">USER_STATUS_CHANGED</option>
            <option value="PRODUCT_CREATED">PRODUCT_CREATED</option>
            <option value="PRODUCT_UPDATED">PRODUCT_UPDATED</option>
            <option value="PRODUCT_DELETED">PRODUCT_DELETED</option>
            <option value="STOCK_ADJUSTED">STOCK_ADJUSTED</option>
            <option value="PASSWORD_CHANGED">PASSWORD_CHANGED</option>
          </select>
        </div>

        <div className="w-full md:w-44">
          <select
            value={selectedEntity}
            onChange={(e) => setSelectedEntity(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Entities</option>
            <option value="USER">USER</option>
            <option value="PRODUCT">PRODUCT</option>
            <option value="INVENTORY">INVENTORY</option>
            <option value="AUTH">AUTH</option>
            <option value="SYSTEM">SYSTEM</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">Timestamp</th>
                <th className="py-3.5 px-4">Actor</th>
                <th className="py-3.5 px-4">Action</th>
                <th className="py-3.5 px-4">Entity</th>
                <th className="py-3.5 px-4">Change Summary & Details</th>
                <th className="py-3.5 px-4">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <div className="inline-block w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mb-2" />
                    <p className="font-medium">Loading audit trail...</p>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <ShieldCheck className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-semibold text-slate-700">No audit events match your filter</p>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-900 block">
                        {log.actor_name || log.actor_email || 'System'}
                      </span>
                      {log.actor_name && (
                        <span className="text-slate-400 text-[11px] block">{log.actor_email}</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md font-mono text-[11px] font-semibold ${getActionColor(
                          log.action
                        )}`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-mono text-slate-700 font-medium">
                        {log.entity_type}
                        {log.entity_id && (
                          <span className="text-slate-400 block text-[10px] truncate max-w-[120px]">
                            {log.entity_id}
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 max-w-sm">
                      {log.details ? (
                        <pre className="text-[11px] font-mono text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-200 overflow-x-auto whitespace-pre-wrap max-h-24">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      ) : (
                        <span className="text-slate-400 italic">No additional payload</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                      {log.ip_address || '127.0.0.1'}
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
            onPageChange={(p) => fetchLogs(p)}
          />
        </div>
      </div>
    </div>
  );
};

