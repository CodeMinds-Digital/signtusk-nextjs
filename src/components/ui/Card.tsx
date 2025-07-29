import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'glass' | 'solid' | 'outline';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  hover?: boolean;
  glow?: boolean;
  glowColor?: 'primary' | 'success' | 'warning' | 'error';
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  variant = 'glass',
  padding = 'lg',
  hover = false,
  glow = false,
  glowColor = 'primary',
}) => {
  const baseClasses = 'rounded-2xl transition-all duration-300';

  const variantClasses = {
    default: 'bg-neutral-800/50 border border-neutral-700',
    glass: 'bg-white/5 backdrop-blur-sm border border-white/10',
    solid: 'bg-neutral-800 border border-neutral-700',
    outline: 'border-2 border-neutral-600 bg-transparent',
  };

  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
    xl: 'p-10',
  };

  const hoverClasses = hover ? 'hover:scale-105 hover:shadow-2xl cursor-pointer' : '';

  const glowClasses = glow ? {
    primary: 'shadow-lg shadow-primary-500/20',
    success: 'shadow-lg shadow-green-500/20',
    warning: 'shadow-lg shadow-yellow-500/20',
    error: 'shadow-lg shadow-red-500/20',
  }[glowColor] : '';

  const classes = `${baseClasses} ${variantClasses[variant]} ${paddingClasses[padding]} ${hoverClasses} ${glowClasses} ${className}`;

  return (
    <div className={classes}>
      {children}
    </div>
  );
};

// Specialized Security Card
export const SecurityCard: React.FC<CardProps & {
  securityLevel?: 'standard' | 'enhanced' | 'maximum';
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
}> = ({
  securityLevel = 'standard',
  title,
  description,
  icon,
  onClick,
  children,
  ...props
}) => {
    const securityColors = {
      standard: 'warning',
      enhanced: 'primary',
      maximum: 'success',
    } as const;

    return (
      <div onClick={onClick} className={onClick ? 'cursor-pointer' : ''}>
        <Card
          glow={true}
          glowColor={securityColors[securityLevel]}
          hover={true}
          {...props}
        >
          {(title || description || icon) && (
            <div className="flex items-start space-x-4 mb-6">
              {icon && (
                <div className="flex-shrink-0 p-3 rounded-xl bg-white/10">
                  {icon}
                </div>
              )}
              <div className="flex-1">
                {title && (
                  <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
                )}
                {description && (
                  <p className="text-neutral-300">{description}</p>
                )}
              </div>
            </div>
          )}
          {children}
        </Card>
      </div>
    );
  };

// Document Card Component
export const DocumentCard: React.FC<{
  title: string;
  status: 'pending' | 'signed' | 'verified' | 'error';
  timestamp: string;
  signers?: string[];
  onClick?: () => void;
  className?: string;
}> = ({
  title,
  status,
  timestamp,
  signers = [],
  onClick,
  className = '',
}) => {
    const statusConfig = {
      pending: {
        color: 'text-yellow-400',
        bg: 'bg-yellow-500/20',
        border: 'border-yellow-500/30',
        label: 'Pending'
      },
      signed: {
        color: 'text-blue-400',
        bg: 'bg-blue-500/20',
        border: 'border-blue-500/30',
        label: 'Signed'
      },
      verified: {
        color: 'text-green-400',
        bg: 'bg-green-500/20',
        border: 'border-green-500/30',
        label: 'Verified'
      },
      error: {
        color: 'text-red-400',
        bg: 'bg-red-500/20',
        border: 'border-red-500/30',
        label: 'Error'
      }
    };

    const config = statusConfig[status];

    return (
      <Card
        hover={!!onClick}
        className={`cursor-pointer ${className}`}
        onClick={onClick}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white mb-2 truncate">{title}</h3>
            <p className="text-sm text-neutral-400 mb-3">{timestamp}</p>

            {signers.length > 0 && (
              <div className="flex items-center space-x-2 mb-3">
                <span className="text-sm text-neutral-400">Signers:</span>
                <div className="flex -space-x-2">
                  {signers.slice(0, 3).map((signer, index) => (
                    <div
                      key={index}
                      className="w-6 h-6 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 border-2 border-neutral-800 flex items-center justify-center text-xs font-medium text-white"
                      title={signer}
                    >
                      {signer.charAt(0).toUpperCase()}
                    </div>
                  ))}
                  {signers.length > 3 && (
                    <div className="w-6 h-6 rounded-full bg-neutral-700 border-2 border-neutral-800 flex items-center justify-center text-xs font-medium text-neutral-300">
                      +{signers.length - 3}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className={`px-3 py-1 rounded-full border text-sm font-medium ${config.bg} ${config.border} ${config.color}`}>
            {config.label}
          </div>
        </div>
      </Card>
    );
  };

export default Card;
