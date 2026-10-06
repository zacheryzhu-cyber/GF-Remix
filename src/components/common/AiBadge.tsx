import React from 'react';
import { Sparkles, Bot, Cpu } from 'lucide-react';

export interface AiBadgeProps {
  label?: string;
  variant?: 'badge' | 'button' | 'subtle' | 'pill' | 'icon-only' | 'gradient';
  size?: 'xs' | 'sm' | 'md';
  onClick?: () => void;
  className?: string;
  title?: string;
  iconOnly?: boolean;
  animated?: boolean;
  colorScheme?: 'indigo' | 'emerald';
}

/**
 * Standardized AI Badge & Icon Component
 * Used across the application to consistently identify AI-powered capabilities,
 * diagnostics, automated summaries, and remediation recommendations.
 */
export const AiBadge: React.FC<AiBadgeProps> = ({
  label = 'AI',
  variant = 'badge',
  size = 'xs',
  onClick,
  className = '',
  title = 'AI-Powered Capability',
  iconOnly = false,
  animated = false,
  colorScheme = 'indigo',
}) => {
  const sizeClasses = {
    xs: 'text-[10px] px-1.5 py-0.5 gap-1',
    sm: 'text-[11px] px-2 py-0.5 gap-1.5',
    md: 'text-xs px-2.5 py-1 gap-1.5',
  }[size];

  const iconSizes = {
    xs: 'w-3 h-3',
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
  }[size];

  if (iconOnly || variant === 'icon-only') {
    if (colorScheme === 'emerald') {
      return (
        <span
          title={title}
          onClick={onClick}
          className={`inline-flex items-center justify-center p-1.5 rounded-lg bg-emerald-950/70 border border-emerald-500/50 text-emerald-400 backdrop-blur-md shadow-md shadow-emerald-950/50 ${
            onClick ? 'cursor-pointer hover:brightness-110 active:scale-95 transition-transform' : ''
          } ${className}`}
        >
          <Sparkles className={`${iconSizes} ${animated ? 'animate-spin' : ''}`} />
        </span>
      );
    }
    return (
      <span
        title={title}
        onClick={onClick}
        className={`inline-flex items-center justify-center p-1 rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-2xs ${
          onClick ? 'cursor-pointer hover:brightness-110 active:scale-95 transition-transform' : ''
        } ${className}`}
      >
        <Sparkles className={`${iconSizes} ${animated ? 'animate-spin' : ''}`} />
      </span>
    );
  }

  if (variant === 'button') {
    if (colorScheme === 'emerald') {
      return (
        <button
          type="button"
          title={title}
          onClick={onClick}
          className={`inline-flex items-center font-bold rounded-xl transition shadow-md bg-emerald-950/80 hover:bg-emerald-900/70 text-emerald-300 hover:text-white border border-emerald-500/50 hover:border-emerald-400 backdrop-blur-md active:scale-95 ${sizeClasses} ${className}`}
        >
          <Sparkles className={`${iconSizes} text-emerald-400 ${animated ? 'animate-spin' : ''}`} />
          <span>{label}</span>
        </button>
      );
    }
    return (
      <button
        type="button"
        title={title}
        onClick={onClick}
        className={`inline-flex items-center font-bold rounded-lg transition shadow-xs bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 hover:from-indigo-700 hover:to-purple-800 text-white ${sizeClasses} ${className}`}
      >
        <Sparkles className={`${iconSizes} text-amber-300 ${animated ? 'animate-spin' : ''}`} />
        <span>{label}</span>
      </button>
    );
  }

  if (variant === 'subtle') {
    if (colorScheme === 'emerald') {
      return (
        <span
          title={title}
          onClick={onClick}
          className={`inline-flex items-center font-semibold rounded-lg border border-emerald-500/40 bg-emerald-950/60 text-emerald-300 backdrop-blur-xs ${sizeClasses} ${
            onClick ? 'cursor-pointer hover:bg-emerald-900/60 transition' : ''
          } ${className}`}
        >
          <Sparkles className={`${iconSizes} text-emerald-400`} />
          <span>{label}</span>
        </span>
      );
    }
    return (
      <span
        title={title}
        onClick={onClick}
        className={`inline-flex items-center font-semibold rounded-md border border-indigo-200 bg-indigo-50/80 text-indigo-700 ${sizeClasses} ${
          onClick ? 'cursor-pointer hover:bg-indigo-100 transition' : ''
        } ${className}`}
      >
        <Sparkles className={`${iconSizes} text-indigo-600`} />
        <span>{label}</span>
      </span>
    );
  }

  if (variant === 'gradient') {
    if (colorScheme === 'emerald') {
      return (
        <span
          title={title}
          onClick={onClick}
          className={`inline-flex items-center font-bold rounded-lg bg-emerald-950/70 border border-emerald-500/50 text-emerald-300 shadow-md shadow-emerald-950/40 backdrop-blur-md ${sizeClasses} ${
            onClick ? 'cursor-pointer hover:opacity-90 transition' : ''
          } ${className}`}
        >
          <Sparkles className={`${iconSizes} text-emerald-400`} />
          <span>{label}</span>
        </span>
      );
    }
    return (
      <span
        title={title}
        onClick={onClick}
        className={`inline-flex items-center font-bold rounded-md bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-2xs ${sizeClasses} ${
          onClick ? 'cursor-pointer hover:opacity-90 transition' : ''
        } ${className}`}
      >
        <Sparkles className={`${iconSizes} text-amber-300`} />
        <span>{label}</span>
      </span>
    );
  }

  // Default: pill / badge
  if (colorScheme === 'emerald') {
    return (
      <span
        title={title}
        onClick={onClick}
        className={`inline-flex items-center font-bold rounded-lg border border-emerald-500/40 bg-emerald-950/60 text-emerald-300 shadow-2xs backdrop-blur-xs ${sizeClasses} ${
          onClick ? 'cursor-pointer hover:bg-emerald-900/60 transition' : ''
        } ${className}`}
      >
        <Sparkles className={`${iconSizes} text-emerald-400`} />
        <span>{label}</span>
      </span>
    );
  }

  return (
    <span
      title={title}
      onClick={onClick}
      className={`inline-flex items-center font-bold rounded-full border border-purple-200 bg-purple-50 text-purple-700 shadow-2xs ${sizeClasses} ${
        onClick ? 'cursor-pointer hover:bg-purple-100 transition' : ''
      } ${className}`}
    >
      <Sparkles className={`${iconSizes} text-purple-600`} />
      <span>{label}</span>
    </span>
  );
};
