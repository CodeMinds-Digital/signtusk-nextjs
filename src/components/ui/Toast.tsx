'use client';

import React, { useState, useEffect, createContext, useContext } from 'react';
import { SecurityIcons } from './DesignSystem';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info' | 'security';
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextType {
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: React.ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    // Add progress bar styles on mount
    addProgressBarStyles();
  }, []);

  const addToast = (toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast = { ...toast, id };
    setToasts(prev => [...prev, newToast]);

    // Auto remove after duration
    if (toast.duration !== 0) {
      setTimeout(() => {
        removeToast(id);
      }, toast.duration || 5000);
    }
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
};

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemove }) => {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm w-full">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
};

interface ToastItemProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onRemove }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    setTimeout(() => setIsVisible(true), 10);
  }, []);

  const handleRemove = () => {
    setIsLeaving(true);
    setTimeout(() => onRemove(toast.id), 300);
  };

  const toastConfig = {
    success: {
      icon: SecurityIcons.Verified,
      iconColor: 'text-green-400',
      bg: 'bg-green-500/20',
      border: 'border-green-500/30',
      progressBar: 'bg-green-500',
    },
    error: {
      icon: SecurityIcons.Shield,
      iconColor: 'text-red-400',
      bg: 'bg-red-500/20',
      border: 'border-red-500/30',
      progressBar: 'bg-red-500',
    },
    warning: {
      icon: SecurityIcons.Shield,
      iconColor: 'text-yellow-400',
      bg: 'bg-yellow-500/20',
      border: 'border-yellow-500/30',
      progressBar: 'bg-yellow-500',
    },
    info: {
      icon: SecurityIcons.Shield,
      iconColor: 'text-blue-400',
      bg: 'bg-blue-500/20',
      border: 'border-blue-500/30',
      progressBar: 'bg-blue-500',
    },
    security: {
      icon: SecurityIcons.Lock,
      iconColor: 'text-purple-400',
      bg: 'bg-purple-500/20',
      border: 'border-purple-500/30',
      progressBar: 'bg-purple-500',
    },
  };

  const config = toastConfig[toast.type];
  const Icon = config.icon;

  return (
    <div
      className={`transform transition-all duration-300 ${isVisible && !isLeaving
        ? 'translate-x-0 opacity-100'
        : 'translate-x-full opacity-0'
        }`}
    >
      <div className={`bg-neutral-900/95 backdrop-blur-sm border rounded-xl p-4 shadow-2xl ${config.bg} ${config.border}`}>
        <div className="flex items-start space-x-3">
          {/* Icon */}
          <div className="flex-shrink-0">
            <Icon className={`w-5 h-5 ${config.iconColor}`} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-white">{toast.title}</h4>
            {toast.message && (
              <p className="text-sm text-neutral-300 mt-1">{toast.message}</p>
            )}

            {/* Action Button */}
            {toast.action && (
              <button
                onClick={toast.action.onClick}
                className={`text-sm font-medium mt-2 ${config.iconColor} hover:underline`}
              >
                {toast.action.label}
              </button>
            )}
          </div>

          {/* Close Button */}
          <button
            onClick={handleRemove}
            className="flex-shrink-0 p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800/50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Progress Bar */}
        {toast.duration && toast.duration > 0 && (
          <div className="mt-3 h-1 bg-neutral-700 rounded-full overflow-hidden">
            <div
              className={`h-full ${config.progressBar} rounded-full transition-all ease-linear`}
              style={{
                animation: `shrink ${toast.duration}ms linear forwards`,
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

// Security-specific toast helpers
export const useSecurityToast = () => {
  const { addToast } = useToast();

  const showSecuritySuccess = (title: string, message?: string) => {
    addToast({
      type: 'security',
      title,
      message,
      duration: 5000,
    });
  };

  const showSecurityWarning = (title: string, message?: string, action?: Toast['action']) => {
    addToast({
      type: 'warning',
      title,
      message,
      action,
      duration: 8000,
    });
  };

  const showSecurityError = (title: string, message?: string, action?: Toast['action']) => {
    addToast({
      type: 'error',
      title,
      message,
      action,
      duration: 0, // Don't auto-dismiss errors
    });
  };

  const showDocumentSigned = (documentName: string) => {
    addToast({
      type: 'success',
      title: 'Document Signed Successfully',
      message: `${documentName} has been securely signed and verified.`,
      duration: 6000,
    });
  };

  const showVerificationComplete = (documentName: string) => {
    addToast({
      type: 'success',
      title: 'Verification Complete',
      message: `${documentName} signature verification passed all security checks.`,
      duration: 6000,
    });
  };

  const showSecurityLevelUpgrade = (newLevel: string) => {
    addToast({
      type: 'security',
      title: 'Security Level Upgraded',
      message: `Your account security has been upgraded to ${newLevel} level.`,
      duration: 8000,
    });
  };

  return {
    showSecuritySuccess,
    showSecurityWarning,
    showSecurityError,
    showDocumentSigned,
    showVerificationComplete,
    showSecurityLevelUpgrade,
  };
};

// CSS for progress bar animation - moved to useEffect to avoid SSR issues
const addProgressBarStyles = () => {
  if (typeof document !== 'undefined' && !document.getElementById('toast-progress-styles')) {
    const style = document.createElement('style');
    style.id = 'toast-progress-styles';
    style.textContent = `
      @keyframes shrink {
        from { width: 100%; }
        to { width: 0%; }
      }
    `;
    document.head.appendChild(style);
  }
};

export default ToastProvider;
