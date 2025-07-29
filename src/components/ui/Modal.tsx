import React, { useEffect } from 'react';
import { Button } from './Button';
import { SecurityIcons } from './DesignSystem';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnOverlayClick = true,
}) => {
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Overlay */}
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
          onClick={closeOnOverlayClick ? onClose : undefined}
        />

        {/* Modal */}
        <div className={`relative w-full ${sizeClasses[size]} transform transition-all`}>
          <div className="bg-neutral-900/95 backdrop-blur-sm border border-neutral-700 rounded-2xl shadow-2xl">
            {/* Header */}
            {(title || showCloseButton) && (
              <div className="flex items-center justify-between p-6 border-b border-neutral-700">
                {title && (
                  <h3 className="text-xl font-semibold text-white">{title}</h3>
                )}
                {showCloseButton && (
                  <button
                    onClick={onClose}
                    className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800/50 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            )}

            {/* Content */}
            <div className="p-6">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Confirmation Modal
interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  loading?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'info',
  loading = false,
}) => {
  const variantConfig = {
    danger: {
      icon: SecurityIcons.Shield,
      iconColor: 'text-red-400',
      iconBg: 'bg-red-500/20',
      confirmVariant: 'danger' as const,
    },
    warning: {
      icon: SecurityIcons.Shield,
      iconColor: 'text-yellow-400',
      iconBg: 'bg-yellow-500/20',
      confirmVariant: 'primary' as const,
    },
    info: {
      icon: SecurityIcons.Shield,
      iconColor: 'text-blue-400',
      iconBg: 'bg-blue-500/20',
      confirmVariant: 'primary' as const,
    },
  };

  const config = variantConfig[variant];
  const Icon = config.icon;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <div className="text-center">
        <div className={`w-16 h-16 ${config.iconBg} rounded-full flex items-center justify-center mx-auto mb-4`}>
          <Icon className={`w-8 h-8 ${config.iconColor}`} />
        </div>
        
        <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
        <p className="text-neutral-300 mb-6">{message}</p>
        
        <div className="flex space-x-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="flex-1"
          >
            {cancelText}
          </Button>
          <Button
            variant={config.confirmVariant}
            onClick={onConfirm}
            loading={loading}
            className="flex-1"
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// Security Action Modal
interface SecurityActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  securityLevel: 'standard' | 'enhanced' | 'maximum';
  actionDetails: {
    action: string;
    target: string;
    timestamp: string;
    ipAddress?: string;
  };
  loading?: boolean;
}

export const SecurityActionModal: React.FC<SecurityActionModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  securityLevel,
  actionDetails,
  loading = false,
}) => {
  const securityConfig = {
    standard: {
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/20',
      border: 'border-yellow-500/30',
    },
    enhanced: {
      color: 'text-blue-400',
      bg: 'bg-blue-500/20',
      border: 'border-blue-500/30',
    },
    maximum: {
      color: 'text-green-400',
      bg: 'bg-green-500/20',
      border: 'border-green-500/30',
    },
  };

  const config = securityConfig[securityLevel];

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className={`w-16 h-16 ${config.bg} rounded-full flex items-center justify-center mx-auto mb-4`}>
            <SecurityIcons.Shield className={`w-8 h-8 ${config.color}`} />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
          <p className="text-neutral-300">{description}</p>
        </div>

        {/* Security Level Badge */}
        <div className="flex justify-center">
          <div className={`inline-flex items-center space-x-2 px-4 py-2 rounded-full border text-sm font-medium ${config.bg} ${config.border} ${config.color}`}>
            <SecurityIcons.Lock className="w-4 h-4" />
            <span>{securityLevel.charAt(0).toUpperCase() + securityLevel.slice(1)} Security</span>
          </div>
        </div>

        {/* Action Details */}
        <div className="bg-neutral-800/50 rounded-xl p-4 space-y-3">
          <div className="flex justify-between">
            <span className="text-neutral-400">Action:</span>
            <span className="text-white font-medium">{actionDetails.action}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-400">Target:</span>
            <span className="text-white font-medium truncate ml-2">{actionDetails.target}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-400">Timestamp:</span>
            <span className="text-white font-medium">{actionDetails.timestamp}</span>
          </div>
          {actionDetails.ipAddress && (
            <div className="flex justify-between">
              <span className="text-neutral-400">IP Address:</span>
              <span className="text-white font-medium">{actionDetails.ipAddress}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex space-x-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={onConfirm}
            loading={loading}
            className="flex-1"
          >
            Authorize Action
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default Modal;
