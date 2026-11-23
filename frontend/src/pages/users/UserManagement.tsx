import React, { useState, useEffect, useCallback } from 'react';
import { Users, Search, Shield, CheckCircle, XCircle, Edit2, ShieldAlert } from 'lucide-react';
import { api, getApiErrorMessage } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';
import { User, UserRole } from '../../types/index.js';
import { Alert } from '../../components/Alert.js';
import { Modal } from '../../components/Modal.js';

interface UserResponse {
  id: string;
  full_name: string;
  email: string;
  role_id: number;
  role_name: UserRole;
  status: User['status'];
  is_google_user: boolean;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export const UserManagement: React.FC = () => {
  const { user: currentUser, isSuperAdmin } = useAuth();

  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [alert, setAlert] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

  // Edit Role Modal
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newRoleId, setNewRoleId] = useState<number>(3);
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);

  // Status Toggle Modal
  const [statusCandidate, setStatusCandidate] = useState<User | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, any> = {};
      if (search.trim()) params.search = search.trim();
      if (selectedRole) params.roleId = selectedRole;
      if (selectedStatus) params.status = selectedStatus;

      const res = await api.get('/users', { params });
      if (res.data?.success) {
        const users: UserResponse[] = res.data.data;
        setUsers(users.map((user) => ({
          id: user.id,
          fullName: user.full_name,
          email: user.email,
          roleId: user.role_id,
          role: user.role_name,
          status: user.status,
          isGoogleAccount: user.is_google_user,
          avatarUrl: user.avatar_url ?? undefined,
          createdAt: user.created_at,
          updatedAt: user.updated_at,
        })));
      }
    } catch (err) {
      setAlert({ type: 'error', message: getApiErrorMessage(err) });
    } finally {
      setIsLoading(false);
    }
  }, [search, selectedRole, selectedStatus]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleRoleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setIsUpdatingRole(true);
    try {
      await api.patch(`/users/${editingUser.id}/role`, { roleId: newRoleId });
      setAlert({
        type: 'success',
        message: `Successfully updated permissions for ${editingUser.fullName}.`,
      });
      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      setAlert({ type: 'error', message: getApiErrorMessage(err) });
    } finally {
      setIsUpdatingRole(false);
    }
  };

  const handleStatusToggle = async () => {
    if (!statusCandidate) return;
    const targetStatus = statusCandidate.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setIsUpdatingStatus(true);
    try {
      await api.patch(`/users/${statusCandidate.id}/status`, { status: targetStatus });
      setAlert({
        type: 'success',
        message: `Account status for ${statusCandidate.fullName} set to ${targetStatus}.`,
      });
      setStatusCandidate(null);
      fetchUsers();
    } catch (err) {
      setAlert({ type: 'error', message: getApiErrorMessage(err) });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">User & Role Management</h2>
        <p className="text-sm text-slate-500 mt-1">
          Review employee access, assign role privileges, and toggle active account credentials.
        </p>
      </div>

      {alert && <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by user name or email address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="w-full md:w-48">
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Roles</option>
            <option value="1">Super Admin</option>
            <option value="2">Admin</option>
            <option value="3">Staff</option>
          </select>
        </div>

        <div className="w-full md:w-44">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active Accounts</option>
            <option value="INACTIVE">Deactivated</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">User</th>
                <th className="py-3.5 px-4">Role Permission</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4">Authentication</th>
                <th className="py-3.5 px-4">Joined Date</th>
                {isSuperAdmin && <th className="py-3.5 px-4 text-right">Admin Controls</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <div className="inline-block w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mb-2" />
                    <p className="font-medium">Loading users...</p>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Users className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-semibold text-slate-700">No users match query</p>
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isCurrent = u.id === currentUser?.id;
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Name & Email */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center shrink-0">
                            {u.fullName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-900 block text-sm">
                              {u.fullName} {isCurrent && <span className="text-xs text-indigo-600 font-normal">(You)</span>}
                            </span>
                            <span className="text-slate-500 text-xs">{u.email}</span>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            u.role === 'SUPER_ADMIN'
                              ? 'bg-purple-100 text-purple-800'
                              : u.role === 'ADMIN'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {u.role.replace('_', ' ')}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            u.status === 'ACTIVE'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-rose-100 text-rose-700'
                          }`}
                        >
                          {u.status === 'ACTIVE' ? (
                            <CheckCircle className="w-3.5 h-3.5" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5" />
                          )}
                          {u.status}
                        </span>
                      </td>

                      {/* Auth Type */}
                      <td className="py-3.5 px-4 text-slate-500">
                        {u.isGoogleAccount ? 'Google Sign-In' : 'Email & Password'}
                      </td>

                      {/* Joined Date */}
                      <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}
                      </td>

                      {/* Super Admin Controls */}
                      {isSuperAdmin && (
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setEditingUser(u);
                                setNewRoleId(u.roleId);
                              }}
                              disabled={isCurrent}
                              className="px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                              title={isCurrent ? "You cannot modify your own role" : "Change user role"}
                            >
                              Role
                            </button>

                            <button
                              onClick={() => setStatusCandidate(u)}
                              disabled={isCurrent}
                              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                                u.status === 'ACTIVE'
                                  ? 'text-rose-700 bg-rose-50 hover:bg-rose-100'
                                  : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                              }`}
                              title={isCurrent ? "You cannot deactivate your own account" : "Toggle account status"}
                            >
                              {u.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Role Change Modal */}
      {editingUser && (
        <Modal
          isOpen={!!editingUser}
          onClose={() => setEditingUser(null)}
          title="Modify User Role"
          maxWidth="sm"
        >
          <form onSubmit={handleRoleUpdate} className="space-y-4">
            <p className="text-sm text-slate-600">
              Assign role for <strong className="text-slate-900">{editingUser.fullName}</strong> (
              {editingUser.email})
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Select System Role
              </label>
              <select
                value={newRoleId}
                onChange={(e) => setNewRoleId(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                <option value={1}>Super Admin (Full system control)</option>
                <option value={2}>Admin / Inventory Manager (Products & Stock)</option>
                <option value={3}>Staff / Employee (Read-only catalog & stock)</option>
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isUpdatingRole}
                className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs disabled:opacity-50"
              >
                {isUpdatingRole ? 'Saving...' : 'Save Role'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Status Confirmation Modal */}
      {statusCandidate && (
        <Modal
          isOpen={!!statusCandidate}
          onClose={() => setStatusCandidate(null)}
          title={statusCandidate.status === 'ACTIVE' ? 'Deactivate User Account' : 'Reactivate User Account'}
          maxWidth="sm"
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Are you sure you want to {statusCandidate.status === 'ACTIVE' ? 'deactivate' : 'reactivate'} the account for{' '}
              <strong className="text-slate-900">{statusCandidate.fullName}</strong>?
            </p>
            {statusCandidate.status === 'ACTIVE' && (
              <p className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                Deactivated users are blocked from logging in immediately and their active tokens will be rejected.
              </p>
            )}

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStatusCandidate(null)}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStatusToggle}
                disabled={isUpdatingStatus}
                className={`px-4 py-2 text-sm font-semibold text-white rounded-lg shadow-xs disabled:opacity-50 ${
                  statusCandidate.status === 'ACTIVE'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {isUpdatingStatus ? 'Processing...' : statusCandidate.status === 'ACTIVE' ? 'Deactivate' : 'Reactivate'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
