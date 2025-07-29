import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SecurityIcons, StatusIndicator } from './DesignSystem';
import { Button } from './Button';

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  badge?: number;
  active?: boolean;
}

interface NavigationProps {
  currentPage?: string;
  onPageChange?: (page: string) => void;
  userInfo?: {
    customId: string;
    address: string;
  };
  onLogout?: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentPage = 'dashboard',
  onPageChange,
  userInfo,
  onLogout,
}) => {
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigationItems: NavigationItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: SecurityIcons.Shield,
      href: '/dashboard',
      active: currentPage === 'dashboard',
    },
    {
      id: 'documents',
      label: 'Documents',
      icon: SecurityIcons.Document,
      href: '/documents',
      active: currentPage === 'documents',
    },
    {
      id: 'verify',
      label: 'Verify',
      icon: SecurityIcons.Verified,
      href: '/verify',
      active: currentPage === 'verify',
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: SecurityIcons.Key,
      href: '/settings',
      active: currentPage === 'settings',
    },
  ];

  const handleNavigation = (item: NavigationItem) => {
    console.log('Navigation clicked:', item.id, 'onPageChange available:', !!onPageChange);
    if (onPageChange) {
      // Use page change callback for sidebar navigation
      onPageChange(item.id);
    } else {
      // Fallback to router navigation if no callback provided
      console.log('Using router navigation to:', item.href);
      router.push(item.href);
    }
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:bg-neutral-900/50 lg:backdrop-blur-sm lg:border-r lg:border-neutral-800">
        {/* Logo */}
        <div className="flex items-center h-16 px-6 border-b border-neutral-800">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
              <SecurityIcons.Shield className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">SignTusk</span>
          </div>
        </div>

        {/* User Info */}
        {userInfo && (
          <div className="px-6 py-4 border-b border-neutral-800">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-semibold">
                {userInfo.customId?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {userInfo.customId || 'Unknown User'}
                </p>
                <div className="flex items-center space-x-2">
                  <StatusIndicator status="online" size="sm" />
                  <span className="text-xs text-neutral-400">Connected</span>
                </div>
              </div>
            </div>

            {/* Wallet Address */}
            <div className="mt-2">
              <p className="text-xs text-neutral-400 truncate">
                {userInfo.address || 'No address'}
              </p>
            </div>
          </div>
        )}

        {/* Navigation Items */}
        <div className="flex-1 px-3 py-4 space-y-1">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => handleNavigation(item)}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${item.active
                  ? 'bg-primary-500/20 text-primary-300 border border-primary-500/30'
                  : 'text-neutral-300 hover:text-white hover:bg-neutral-800/50'
                  }`}
              >
                <Icon className="w-5 h-5 mr-3" />
                <span className="flex-1 text-left">{item.label}</span>
                {item.badge && (
                  <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Logout Button */}
        {onLogout && (
          <div className="px-3 pb-4">
            <Button
              variant="outline"
              size="sm"
              fullWidth
              onClick={onLogout}
              className="text-neutral-400 hover:text-white"
            >
              Sign Out
            </Button>
          </div>
        )}
      </nav>

      {/* Mobile Navigation */}
      <div className="lg:hidden">
        {/* Mobile Header */}
        <div className="flex items-center justify-between h-16 px-4 bg-neutral-900/50 backdrop-blur-sm border-b border-neutral-800">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
              <SecurityIcons.Shield className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">SignTusk</span>
          </div>

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800/50"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="fixed inset-0 bg-black/50" onClick={() => setIsMobileMenuOpen(false)} />
            <div className="fixed top-0 right-0 w-64 h-full bg-neutral-900 border-l border-neutral-800">
              <div className="flex items-center justify-between h-16 px-4 border-b border-neutral-800">
                <span className="text-lg font-semibold text-white">Menu</span>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 rounded-lg text-neutral-400 hover:text-white"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="px-3 py-4 space-y-1">
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavigation(item)}
                      className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${item.active
                        ? 'bg-primary-500/20 text-primary-300 border border-primary-500/30'
                        : 'text-neutral-300 hover:text-white hover:bg-neutral-800/50'
                        }`}
                    >
                      <Icon className="w-5 h-5 mr-3" />
                      <span className="flex-1 text-left">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Navigation;
