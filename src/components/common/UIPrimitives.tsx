import React from 'react';
import { Info } from 'lucide-react';

// Primary & Secondary Buttons
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent-icon';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'secondary',
  size = 'md',
  icon,
  className = '',
  disabled,
  ...props
}) => {
  const base = 'inline-flex items-center justify-center font-medium transition-all duration-150 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 select-none';

  const sizes = {
    sm: 'text-xs px-2.5 py-1.5 rounded-lg gap-1.5',
    md: 'text-sm px-3.5 py-2 rounded-lg gap-2',
    lg: 'text-base px-4 py-2.5 rounded-xl gap-2.5',
  };

  const variants = {
    primary: 'bg-[#B8F36B] text-[#102000] hover:bg-[#A7EB50] active:scale-[0.98] shadow-xs font-semibold',
    secondary: 'bg-[#FFFFFF] text-[#191919] border border-[#E8E8E5] hover:bg-[#F1F2ED] shadow-2xs',
    ghost: 'text-[#717171] hover:text-[#191919] hover:bg-[#F1F2ED]',
    danger: 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100',
    'accent-icon': 'w-9 h-9 p-0 rounded-full bg-[#B8F36B] text-[#102000] hover:bg-[#A7EB50] active:scale-95 shadow-xs flex items-center justify-center',
  };

  return (
    <button
      className={`${base} ${variant === 'accent-icon' ? variants['accent-icon'] : `${sizes[size]} ${variants[variant]}`} ${className}`}
      disabled={disabled}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </button>
  );
};

// Pill / Status Badges
interface BadgeProps {
  children: React.ReactNode;
  variant?: 'neutral' | 'subtle' | 'accent' | 'success' | 'warning' | 'danger';
  icon?: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  icon,
  className = '',
}) => {
  const variants = {
    neutral: 'bg-[#F1F2ED] text-[#191919]',
    subtle: 'bg-[#F1F2ED] text-[#717171]',
    accent: 'bg-[#B8F36B]/40 text-[#102000] border border-[#B8F36B]/60 font-semibold',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border border-amber-200',
    danger: 'bg-red-50 text-red-600 border border-red-200',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${variants[variant]} ${className}`}>
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </span>
  );
};

// Elevated Surface Card
export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <div
      className={`bg-white border border-[#E8E8E5] rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

// Explicit Development Placeholder Banner
export const DevPlaceholderBadge: React.FC<{ label?: string }> = ({
  label = 'Openquire Notice',
}) => {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1 bg-[#F1F2ED] text-[#717171] border border-[#E8E8E5] rounded-md text-[11px] font-mono tracking-wide">
      <Info className="w-3.5 h-3.5 text-[#9E9E99] shrink-0" />
      <span>{label}</span>
    </div>
  );
};
