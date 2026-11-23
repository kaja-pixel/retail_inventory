import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, Send, ExternalLink } from 'lucide-react';
import { api, getApiErrorMessage } from '../../services/api.js';
import { Alert } from '../../components/Alert.js';

export const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<{ type: 'error' | 'success'; message: string } | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);
    setPreviewUrl(null);
    setIsLoading(true);

    try {
      const res = await api.post('/auth/forgot-password', { email });
      setStatus({
        type: 'success',
        message: res.data.message || 'If an account exists, password recovery instructions have been dispatched.',
      });
      // Dev mode: Ethereal preview URL returned from backend
      if (res.data.devEmailPreviewUrl) {
        setPreviewUrl(res.data.devEmailPreviewUrl);
      }
    } catch (err) {
      setStatus({
        type: 'error',
        message: getApiErrorMessage(err),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex w-12 h-12 rounded-2xl bg-indigo-600 items-center justify-center text-white font-bold text-2xl shadow-lg mb-4">
          S
        </div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">
          Forgot Password
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Enter your registered email to receive a password reset link
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-2xl rounded-2xl sm:px-10 border border-slate-100">
          {status && (
            <div className="mb-4">
              <Alert type={status.type} message={status.message} onClose={() => { setStatus(null); setPreviewUrl(null); }} />
            </div>
          )}

          {/* Dev mode: Ethereal email preview link */}
          {previewUrl && (
            <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide mb-2">
                📧 Dev Mode — Email Preview
              </p>
              <p className="text-xs text-amber-700 mb-3">
                No real SMTP configured. Click below to view the password reset email in your browser:
              </p>
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open Email Preview
              </a>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-5 h-5" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@skillforge.com"
                  className="w-full pl-10 pr-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-md transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Send Reset Link</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
