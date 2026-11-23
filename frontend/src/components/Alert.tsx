import React from 'react';
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';

interface AlertProps {
  type?: 'error' | 'success' | 'warning' | 'info';
  message: string;
  onClose?: () => void;
  className?: string;
}

export const Alert: React.FC<AlertProps> = ({
  type = 'info',
  message,
  onClose,
  className = '',
}) => {
  if (!message) return null;

  const styles = {
    error: {
      bg: 'bg-rose-50 border-rose-200 text-rose-800',
      icon: <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />,
    },
    success: {
      bg: 'bg-emerald-50 border-emerald-200 text-emerald-800',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />,
    },
    warning: {
      bg: 'bg-amber-50 border-amber-200 text-amber-800',
      icon: <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />,
    },
    info: {
      bg: 'bg-indigo-50 border-indigo-200 text-indigo-800',
      icon: <Info className="w-5 h-5 text-indigo-500 shrink-0" />,
    },
  }[type];

  return (
    <div
      className={`flex items-start gap-3 p-3.5 rounded-xl border text-sm font-medium ${styles.bg} ${className}`}
    >
      <div className="mt-0.5">{styles.icon}</div>
      <div className="flex-1 leading-snug">{message}</div>
      {onClose && (
        <button
          onClick={onClose}
          className="p-1 rounded-md opacity-70 hover:opacity-100 transition-opacity"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

