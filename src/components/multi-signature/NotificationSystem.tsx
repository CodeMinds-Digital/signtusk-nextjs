'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@/contexts/WalletContext-Updated';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { SecurityIcons } from '../ui/DesignSystem';
import { useNotificationPolling } from '@/hooks/useSmartPolling';

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
  actionLabel?: string;
}

interface NotificationSystemProps {
  onNotificationClick?: (notification: Notification) => void;
  refreshInterval?: number;
}

export const NotificationSystem: React.FC<NotificationSystemProps> = ({
  onNotificationClick,
  refreshInterval = 120000 // 2 minutes (reduced from 30 seconds)
}) => {
  const { wallet } = useWallet();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loading, setLoading] = useState(false);

  // Fetch notifications from API
  const fetchNotifications = useCallback(async () => {
    if (!wallet) return;

    try {
      setLoading(true);
      const response = await fetch('/api/multi-signature/my-requests?status=pending', {
        credentials: 'include'
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // Convert pending actions to notifications
          const pendingNotifications: Notification[] = result.pendingActions.map((request: any) => ({
            id: request.id,
            type: request.userCanSign ? 'warning' : 'info',
            title: request.userCanSign ? 'Signature Required' : 'Document Pending',
            message: request.userCanSign
              ? `Your signature is required for "${request.document.file_name}"`
              : `Waiting for signatures on "${request.document.file_name}"`,
            timestamp: request.created_at,
            read: false,
            actionUrl: `/multi-signature?id=${request.id}&action=${request.userCanSign ? 'sign' : 'status'}`,
            actionLabel: request.userCanSign ? 'Sign Now' : 'View Status'
          }));

          setNotifications(pendingNotifications);
          setUnreadCount(pendingNotifications.length);
        }
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [wallet]);

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Smart polling for notifications
  useNotificationPolling(fetchNotifications, {
    interval: refreshInterval,
    enabled: !!wallet
  });

  // Mark notification as read
  const markAsRead = (notificationId: string) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === notificationId ? { ...notif, read: true } : notif
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  // Handle notification click
  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    onNotificationClick?.(notification);
    setShowNotifications(false);
  };

  // Clear all notifications
  const clearAllNotifications = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <SecurityIcons.Verified className="w-5 h-5 text-green-400" />;
      case 'warning':
        return <SecurityIcons.Alert className="w-5 h-5 text-yellow-400" />;
      case 'error':
        return <SecurityIcons.X className="w-5 h-5 text-red-400" />;
      default:
        return <SecurityIcons.Info className="w-5 h-5 text-blue-400" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'border-green-500/30 bg-green-500/10';
      case 'warning':
        return 'border-yellow-500/30 bg-yellow-500/10';
      case 'error':
        return 'border-red-500/30 bg-red-500/10';
      default:
        return 'border-blue-500/30 bg-blue-500/10';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <div className="relative">
      {/* Notification Bell */}
      <button
        onClick={() => setShowNotifications(!showNotifications)}
        className="relative p-2 text-neutral-400 hover:text-white transition-colors duration-200"
      >
        <SecurityIcons.Activity className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      {showNotifications && (
        <div className="absolute right-0 top-full mt-2 w-96 z-50">
          <Card variant="glass" padding="none" className="border border-white/20 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h3 className="text-lg font-semibold text-white">Notifications</h3>
              <div className="flex items-center space-x-2">
                <Button
                  onClick={fetchNotifications}
                  disabled={loading}
                  variant="ghost"
                  size="sm"
                  icon={<SecurityIcons.Refresh className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
                />
                {notifications.length > 0 && (
                  <Button
                    onClick={clearAllNotifications}
                    variant="ghost"
                    size="sm"
                    icon={<SecurityIcons.X className="w-4 h-4" />}
                  />
                )}
              </div>
            </div>

            {/* Notifications List */}
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <SecurityIcons.Activity className="w-12 h-12 text-neutral-400 mx-auto mb-3" />
                  <p className="text-neutral-400">No notifications</p>
                  <p className="text-neutral-500 text-sm">You're all caught up!</p>
                </div>
              ) : (
                <div className="divide-y divide-white/10">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 hover:bg-white/5 cursor-pointer transition-colors duration-200 ${!notification.read ? 'bg-white/5' : ''
                        }`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-white font-medium text-sm truncate">
                              {notification.title}
                            </p>
                            <span className="text-neutral-400 text-xs ml-2">
                              {formatTimestamp(notification.timestamp)}
                            </span>
                          </div>
                          <p className="text-neutral-300 text-sm mt-1 line-clamp-2">
                            {notification.message}
                          </p>
                          {notification.actionLabel && (
                            <div className="mt-2">
                              <span className="inline-flex items-center text-primary-400 text-sm font-medium">
                                {notification.actionLabel}
                                <SecurityIcons.ArrowLeft className="w-3 h-3 ml-1 rotate-180" />
                              </span>
                            </div>
                          )}
                        </div>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-primary-500 rounded-full flex-shrink-0 mt-2" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="p-3 border-t border-white/10 text-center">
                <p className="text-neutral-400 text-sm">
                  {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
                </p>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Click outside to close */}
      {showNotifications && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowNotifications(false)}
        />
      )}
    </div>
  );
};

// Hook for using notifications in other components
export const useNotifications = () => {
  const [pendingCount, setPendingCount] = useState(0);
  const { wallet } = useWallet();

  const checkPendingActions = useCallback(async () => {
    if (!wallet) return;

    try {
      const response = await fetch('/api/multi-signature/my-requests?status=pending', {
        credentials: 'include'
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setPendingCount(result.pendingActions.length);
        }
      }
    } catch (error) {
      console.error('Error checking pending actions:', error);
    }
  }, [wallet]);

  // Initial check
  useEffect(() => {
    checkPendingActions();
  }, [checkPendingActions]);

  // Smart polling for pending actions
  useNotificationPolling(checkPendingActions, {
    enabled: !!wallet,
    interval: 120000 // 2 minutes
  });

  return {
    pendingCount,
    refreshPendingCount: checkPendingActions
  };
};
