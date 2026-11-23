import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  AlertTriangle,
  XCircle,
  Package,
  Layers,
  Info,
  Check,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { useNotifications } from '../context/NotificationContext.js';
import { NotificationItem } from '../types/index.js';

export const Notifications: React.FC = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, isLoading } = useNotifications();
  const [filterUnread, setFilterUnread] = useState<boolean>(false);
  const navigate = useNavigate();

  const filteredNotifications = filterUnread
    ? notifications.filter((n) => !n.is_read)
    : notifications;

  const getNotificationIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'OUT_OF_STOCK':
        return (
          <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
            <XCircle className="w-5 h-5" />
          </div>
        );
      case 'LOW_STOCK':
        return (
          <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
        );
      case 'PRODUCT_CREATED':
      case 'PRODUCT_UPDATED':
        return (
          <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
            <Package className="w-5 h-5" />
          </div>
        );
      case 'STOCK_ADJUSTED':
        return (
          <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5" />
          </div>
        );
      default:
        return (
          <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
            <Info className="w-5 h-5" />
          </div>
        );
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Notification Center</h2>
          <p className="text-sm text-slate-500 mt-1">
            System alerts, low-stock warnings, and inventory change logs.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors"
            >
              <CheckCheck className="w-4 h-4" />
              <span>Mark all as read</span>
            </button>
          )}

          <button
            onClick={() => setFilterUnread(!filterUnread)}
            className={`px-3.5 py-2 text-xs font-semibold rounded-xl border transition-colors ${
              filterUnread
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {filterUnread ? 'Showing Unread Only' : 'Show All'}
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs divide-y divide-slate-100 overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-slate-500">
            <div className="inline-block w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mb-2" />
            <p className="font-medium text-sm">Loading notifications...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <Bell className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="text-base font-semibold text-slate-700">No notifications found</p>
            <p className="text-xs text-slate-400 mt-1">
              {filterUnread ? 'You have no unread notifications.' : 'Your notification queue is completely clear.'}
            </p>
          </div>
        ) : (
          filteredNotifications.map((n) => (
            <div
              key={n.id}
              className={`p-4 sm:p-5 flex items-start gap-4 hover:bg-slate-50/80 transition-colors ${
                !n.is_read ? 'bg-indigo-50/30' : ''
              }`}
            >
              {getNotificationIcon(n.type)}

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h4
                    className={`text-sm ${
                      !n.is_read ? 'font-bold text-slate-900' : 'font-medium text-slate-800'
                    }`}
                  >
                    {n.title}
                  </h4>
                  <span className="text-[11px] text-slate-400 whitespace-nowrap flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(n.created_at).toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{n.message}</p>

                <div className="flex items-center gap-4 mt-3">
                  {n.link && (
                    <button
                      onClick={() => {
                        if (!n.is_read) markAsRead(n.id);
                        navigate(n.link!);
                      }}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center gap-1"
                    >
                      <span>View details</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  )}

                  {!n.is_read && (
                    <button
                      onClick={() => markAsRead(n.id)}
                      className="text-xs text-slate-500 hover:text-slate-800 font-medium inline-flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Mark as read</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

