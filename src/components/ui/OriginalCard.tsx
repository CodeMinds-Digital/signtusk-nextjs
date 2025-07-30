import React from 'react';

// Card Component with original functionality
interface CardProps {
  variant?: 'default' | 'glass' | 'solid' | 'outline';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  hover?: boolean;
  glow?: boolean;
  glowColor?: 'primary' | 'success' | 'warning' | 'error';
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
  variant = 'default',
  padding = 'md',
  hover = false,
  glow = false,
  glowColor = 'primary',
  className = '',
  children,
  onClick
}) => {
  const getVariantClasses = () => {
    switch (variant) {
      case 'glass':
        return 'bg-white/5 backdrop-blur-md border border-white/10';
      case 'solid':
        return 'bg-neutral-800 border border-neutral-700';
      case 'outline':
        return 'bg-transparent border border-neutral-600';
      default:
        return 'bg-neutral-900/50 border border-neutral-800';
    }
  };

  const getPaddingClasses = () => {
    switch (padding) {
      case 'none': return '';
      case 'sm': return 'p-3';
      case 'md': return 'p-4';
      case 'lg': return 'p-6';
      case 'xl': return 'p-8';
      default: return 'p-4';
    }
  };

  const getGlowClasses = () => {
    if (!glow) return '';
    switch (glowColor) {
      case 'success': return 'shadow-lg shadow-green-500/20';
      case 'warning': return 'shadow-lg shadow-yellow-500/20';
      case 'error': return 'shadow-lg shadow-red-500/20';
      default: return 'shadow-lg shadow-primary-500/20';
    }
  };

  const hoverClasses = hover ? 'hover:scale-105 hover:shadow-xl transition-all duration-300' : '';

  return (
    <div
      className={`rounded-xl ${getVariantClasses()} ${getPaddingClasses()} ${getGlowClasses()} ${hoverClasses} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

// Security Card Component
interface SecurityCardProps extends CardProps {
  securityLevel: 'standard' | 'enhanced' | 'maximum';
  title?: string;
  description?: string;
  icon?: React.ReactNode;
}

export const SecurityCard: React.FC<SecurityCardProps> = ({
  securityLevel,
  title,
  description,
  icon,
  children,
  ...cardProps
}) => {
  const getSecurityLevelClasses = () => {
    switch (securityLevel) {
      case 'standard':
        return 'border-yellow-500/30 bg-yellow-500/5';
      case 'enhanced':
        return 'border-blue-500/30 bg-blue-500/5';
      case 'maximum':
        return 'border-green-500/30 bg-green-500/5';
      default:
        return 'border-neutral-600/30 bg-neutral-600/5';
    }
  };

  return (
    <Card
      {...cardProps}
      className={`${getSecurityLevelClasses()} ${cardProps.className || ''}`}
    >
      {(title || description || icon) && (
        <div className="flex items-start space-x-3 mb-4">
          {icon && (
            <div className="flex-shrink-0">
              {icon}
            </div>
          )}
          <div className="flex-1">
            {title && (
              <h3 className="text-lg font-semibold text-foreground mb-1">
                {title}
              </h3>
            )}
            {description && (
              <p className="text-muted-foreground text-sm">
                {description}
              </p>
            )}
          </div>
        </div>
      )}
      {children}
    </Card>
  );
};
