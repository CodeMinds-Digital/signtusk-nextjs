'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Card } from './Card';
import { Button } from './Button';
import { SecurityIcons } from './DesignSystem';

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  route: string;
  color: 'green' | 'blue' | 'purple' | 'yellow' | 'red';
  enabled: boolean;
}

interface QuickActionsProps {
  variant?: 'card' | 'security-card';
  layout?: 'grid' | 'list';
  showDescriptions?: boolean;
  className?: string;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  variant = 'card',
  layout = 'grid',
  showDescriptions = true,
  className = ''
}) => {
  const router = useRouter();

  // Define available Quick Actions (excluding Verify Document as requested)
  const quickActions: QuickAction[] = [
    {
      id: 'sign-document',
      title: 'Sign Document',
      description: 'Single signature workflow',
      icon: <SecurityIcons.Signature className="w-6 h-6" />,
      route: '/sign-document',
      color: 'green',
      enabled: true
    },
    {
      id: 'multi-signature',
      title: 'Multi-Signature',
      description: 'Collaborative signing workflow',
      icon: <SecurityIcons.Shield className="w-6 h-6" />,
      route: '/multi-signature',
      color: 'blue',
      enabled: true
    },
    {
      id: 'enhanced-signing',
      title: 'Enhanced Signing',
      description: 'Advanced signing features',
      icon: <SecurityIcons.Verified className="w-6 h-6" />,
      route: '/enhanced-signing',
      color: 'purple',
      enabled: true
    },
    {
      id: 'integrated-signing',
      title: 'Integrated Signing',
      description: 'Complete workflow integration',
      icon: <SecurityIcons.Document className="w-6 h-6" />,
      route: '/integrated-signing',
      color: 'yellow',
      enabled: true
    }
  ];

  const getColorClasses = (color: string, variant: 'bg' | 'text' | 'border' | 'hover') => {
    const colorMap = {
      green: {
        bg: 'bg-green-500/20',
        text: 'text-green-400',
        border: 'border-green-500/30',
        hover: 'hover:bg-green-500/30'
      },
      blue: {
        bg: 'bg-blue-500/20',
        text: 'text-blue-400',
        border: 'border-blue-500/30',
        hover: 'hover:bg-blue-500/30'
      },
      purple: {
        bg: 'bg-purple-500/20',
        text: 'text-purple-400',
        border: 'border-purple-500/30',
        hover: 'hover:bg-purple-500/30'
      },
      yellow: {
        bg: 'bg-yellow-500/20',
        text: 'text-yellow-400',
        border: 'border-yellow-500/30',
        hover: 'hover:bg-yellow-500/30'
      },
      red: {
        bg: 'bg-red-500/20',
        text: 'text-red-400',
        border: 'border-red-500/30',
        hover: 'hover:bg-red-500/30'
      }
    };
    return colorMap[color as keyof typeof colorMap]?.[variant] || '';
  };

  const handleActionClick = (action: QuickAction) => {
    if (action.enabled) {
      router.push(action.route);
    }
  };

  const renderCardAction = (action: QuickAction) => (
    <Card
      key={action.id}
      variant="glass"
      padding="lg"
      hover
      className={`cursor-pointer transition-all duration-200 ${
        action.enabled ? 'opacity-100' : 'opacity-50 cursor-not-allowed'
      } ${getColorClasses(action.color, 'hover')}`}
      onClick={() => handleActionClick(action)}
    >
      <div className="text-center">
        <div className={`w-16 h-16 ${getColorClasses(action.color, 'bg')} rounded-2xl flex items-center justify-center mx-auto mb-4`}>
          <div className={getColorClasses(action.color, 'text')}>
            {action.icon}
          </div>
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">{action.title}</h3>
        {showDescriptions && (
          <p className="text-neutral-400 text-sm">{action.description}</p>
        )}
      </div>
    </Card>
  );

  const renderSecurityCardAction = (action: QuickAction) => (
    <Card
      key={action.id}
      variant="outline"
      padding="lg"
      hover
      className={`cursor-pointer transition-all duration-200 ${
        action.enabled ? 'opacity-100' : 'opacity-50 cursor-not-allowed'
      } ${getColorClasses(action.color, 'border')} ${getColorClasses(action.color, 'bg')} ${getColorClasses(action.color, 'hover')}`}
      onClick={() => handleActionClick(action)}
    >
      <div className="flex items-center space-x-4">
        <div className={`w-12 h-12 ${getColorClasses(action.color, 'bg')} rounded-xl flex items-center justify-center`}>
          <div className={getColorClasses(action.color, 'text')}>
            {action.icon}
          </div>
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white mb-1">{action.title}</h3>
          {showDescriptions && (
            <p className="text-neutral-400 text-sm">{action.description}</p>
          )}
        </div>
        <div className={getColorClasses(action.color, 'text')}>
          <SecurityIcons.Activity className="w-5 h-5" />
        </div>
      </div>
    </Card>
  );

  const renderListAction = (action: QuickAction) => (
    <div
      key={action.id}
      className={`flex items-center space-x-4 p-4 rounded-lg border border-neutral-600 cursor-pointer transition-all duration-200 ${
        action.enabled ? 'opacity-100 hover:bg-neutral-800/50' : 'opacity-50 cursor-not-allowed'
      } ${getColorClasses(action.color, 'hover')}`}
      onClick={() => handleActionClick(action)}
    >
      <div className={`w-10 h-10 ${getColorClasses(action.color, 'bg')} rounded-lg flex items-center justify-center`}>
        <div className={getColorClasses(action.color, 'text')}>
          {action.icon}
        </div>
      </div>
      <div className="flex-1">
        <h4 className="text-white font-medium">{action.title}</h4>
        {showDescriptions && (
          <p className="text-neutral-400 text-sm">{action.description}</p>
        )}
      </div>
      <Button
        size="sm"
        variant="outline"
        disabled={!action.enabled}
      >
        Open
      </Button>
    </div>
  );

  const enabledActions = quickActions.filter(action => action.enabled);

  if (layout === 'list') {
    return (
      <div className={`space-y-3 ${className}`}>
        {enabledActions.map(renderListAction)}
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${enabledActions.length > 3 ? '4' : enabledActions.length} gap-6 ${className}`}>
      {enabledActions.map(action => 
        variant === 'security-card' ? renderSecurityCardAction(action) : renderCardAction(action)
      )}
    </div>
  );
};

// Specific Quick Actions components for different use cases
export const DashboardQuickActions: React.FC<{ className?: string }> = ({ className }) => (
  <QuickActions
    variant="card"
    layout="grid"
    showDescriptions={true}
    className={className}
  />
);

export const SidebarQuickActions: React.FC<{ className?: string }> = ({ className }) => (
  <QuickActions
    variant="security-card"
    layout="list"
    showDescriptions={false}
    className={className}
  />
);

export const CompactQuickActions: React.FC<{ className?: string }> = ({ className }) => (
  <QuickActions
    variant="card"
    layout="grid"
    showDescriptions={false}
    className={className}
  />
);

// Enhanced Quick Actions with additional features
interface EnhancedQuickActionsProps {
  title?: string;
  subtitle?: string;
  showHeader?: boolean;
  maxActions?: number;
  onActionClick?: (actionId: string) => void;
  className?: string;
}

export const EnhancedQuickActions: React.FC<EnhancedQuickActionsProps> = ({
  title = "Quick Actions",
  subtitle = "Choose an action to get started",
  showHeader = true,
  maxActions,
  onActionClick,
  className = ''
}) => {
  const router = useRouter();

  const quickActions: QuickAction[] = [
    {
      id: 'sign-document',
      title: 'Sign Document',
      description: 'Secure digital document signing',
      icon: <SecurityIcons.Signature className="w-6 h-6" />,
      route: '/sign-document',
      color: 'green',
      enabled: true
    },
    {
      id: 'multi-signature',
      title: 'Multi-Signature',
      description: 'Collaborative document signing',
      icon: <SecurityIcons.Shield className="w-6 h-6" />,
      route: '/multi-signature',
      color: 'blue',
      enabled: true
    }
  ];

  const handleActionClick = (action: QuickAction) => {
    if (onActionClick) {
      onActionClick(action.id);
    } else {
      router.push(action.route);
    }
  };

  const displayActions = maxActions ? quickActions.slice(0, maxActions) : quickActions;

  return (
    <Card variant="glass" padding="lg" className={className}>
      {showHeader && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-white mb-2">{title}</h2>
          <p className="text-neutral-400">{subtitle}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {displayActions.map((action) => (
          <Card
            key={action.id}
            variant="outline"
            padding="md"
            hover
            className={`cursor-pointer transition-all duration-200 ${getColorClasses(action.color, 'border')} ${getColorClasses(action.color, 'hover')}`}
            onClick={() => handleActionClick(action)}
          >
            <div className="flex items-center space-x-4">
              <div className={`w-12 h-12 ${getColorClasses(action.color, 'bg')} rounded-xl flex items-center justify-center`}>
                <div className={getColorClasses(action.color, 'text')}>
                  {action.icon}
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-white font-semibold mb-1">{action.title}</h3>
                <p className="text-neutral-400 text-sm">{action.description}</p>
              </div>
              <div className={getColorClasses(action.color, 'text')}>
                <SecurityIcons.Activity className="w-5 h-5" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </Card>
  );
};

// Helper function for color classes (moved outside component for reusability)
function getColorClasses(color: string, variant: 'bg' | 'text' | 'border' | 'hover') {
  const colorMap = {
    green: {
      bg: 'bg-green-500/20',
      text: 'text-green-400',
      border: 'border-green-500/30',
      hover: 'hover:bg-green-500/30'
    },
    blue: {
      bg: 'bg-blue-500/20',
      text: 'text-blue-400',
      border: 'border-blue-500/30',
      hover: 'hover:bg-blue-500/30'
    },
    purple: {
      bg: 'bg-purple-500/20',
      text: 'text-purple-400',
      border: 'border-purple-500/30',
      hover: 'hover:bg-purple-500/30'
    },
    yellow: {
      bg: 'bg-yellow-500/20',
      text: 'text-yellow-400',
      border: 'border-yellow-500/30',
      hover: 'hover:bg-yellow-500/30'
    },
    red: {
      bg: 'bg-red-500/20',
      text: 'text-red-400',
      border: 'border-red-500/30',
      hover: 'hover:bg-red-500/30'
    }
  };
  return colorMap[color as keyof typeof colorMap]?.[variant] || '';
}
