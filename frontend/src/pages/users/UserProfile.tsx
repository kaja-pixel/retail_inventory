import React, { useState } from 'react';
import { User as UserIcon, Mail, Shield, KeyRound, Check, Save } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { api, getApiErrorMessage } from '../../services/api.js';
import { Alert } from '../../components/Alert.js';

export const UserProfile: React.FC = () => {
  const { user, updateUser } = useAuth();

  // Profile Edit State
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [profileStatus, setProfileStatus] = useState<{ type: 'error' | 'success'; message: string } | null>(null);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState<{ type: 'error' | 'success'; message: string } | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileStatus(null);

    if (fullName.trim().length < 2) {
      setProfileStatus({ type: 'error', message: 'Full name must be at least 2 characters.' });
      return;
    }

    setIsUpdatingProfile(true);
    try {
      const res = await api.put('/auth/profile', { fullName: fullName.trim() });
      if (res.data?.success) {
        updateUser({ fullName: res.data.data.full_name });
        setProfileStatus({ type: 'success', message: 'Profile details saved successfully.' });
      }
    } catch (err) {
      setProfileStatus({ type: 'error', message: getApiErrorMessage(err) });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordStatus(null);

    if (newPassword !== confirmPassword) {
      setPasswordStatus({ type: 'error', message: 'New passwords do not match.' });
      return;
    }

    if (newPassword.length < 6) {
      setPasswordStatus({ type: 'error', message: 'New password must be at least 6 characters long.' });
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await api.put('/auth/change-password', {
        currentPassword,
        newPassword,
      });

      if (res.data?.success) {
        setPasswordStatus({ type: 'success', message: 'Password changed successfully.' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      setPasswordStatus({ type: 'error', message: getApiErrorMessage(err) });
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Account Profile</h2>
        <p className="text-sm text-slate-500 mt-1">
          Review your assigned permissions, update your personal details, and change your password.
        </p>
      </div>

      {/* Account Overview Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center gap-6">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-400 text-white font-bold text-3xl flex items-center justify-center shadow-md">
          {user?.fullName.charAt(0).toUpperCase()}
        </div>

        <div className="flex-1 text-center sm:text-left space-y-1">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <h3 className="text-xl font-bold text-slate-900">{user?.fullName}</h3>
            <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-100 text-indigo-800 self-center sm:self-auto">
              {user?.role.replace('_', ' ')}
            </span>
          </div>
          <p className="text-sm text-slate-500 flex items-center justify-center sm:justify-start gap-1.5">
            <Mail className="w-4 h-4 text-slate-400" />
            {user?.email}
          </p>
          <div className="flex items-center justify-center sm:justify-start gap-3 pt-1 text-xs text-slate-400">
            <span>Status: <strong className="text-emerald-600 font-semibold">{user?.status}</strong></span>
            <span>•</span>
            <span>ID: <code className="font-mono">{user?.id.slice(0, 8)}...</code></span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Information Form */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <UserIcon className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-900">Personal Information</h3>
          </div>

          {profileStatus && (
            <Alert
              type={profileStatus.type}
              message={profileStatus.message}
              onClose={() => setProfileStatus(null)}
            />
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Email Address
              </label>
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 text-slate-500 cursor-not-allowed font-medium"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Email addresses are tied to your primary identity and cannot be changed.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                System Role
              </label>
              <input
                type="text"
                disabled
                value={user?.role.replace('_', ' ') || ''}
                className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 text-slate-500 cursor-not-allowed font-semibold"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Role modifications require Super Administrator approval.
              </span>
            </div>

            <button
              type="submit"
              disabled={isUpdatingProfile}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isUpdatingProfile ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </form>
        </div>

        {/* Change Password Form */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <KeyRound className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-900">Change Password</h3>
          </div>

          {passwordStatus && (
            <Alert
              type={passwordStatus.type}
              message={passwordStatus.message}
              onClose={() => setPasswordStatus(null)}
            />
          )}

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Current Password
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                New Password (min. 6 characters)
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={isChangingPassword}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
            >
              <KeyRound className="w-4 h-4" />
              <span>{isChangingPassword ? 'Updating Password...' : 'Update Password'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

