import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showWordmark?: boolean;
  showTagline?: boolean;
}

export const Logo: React.FC<LogoProps> = ({
  className = '',
  size = 'md',
  showWordmark = true,
  showTagline = false,
}) => {
  const iconSizes = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
  };

  const wordmarkSizes = {
    sm: 'text-base font-semibold',
    md: 'text-xl font-semibold',
    lg: 'text-2xl font-semibold',
  };

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Openquire Geometric Brand Mark */}
      <div className={`relative shrink-0 ${iconSizes[size]}`}>
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          {/* Outer Lens Ring */}
          <circle cx="46" cy="46" r="32" stroke="#B8F36B" strokeWidth="13" />
          {/* Angled Handle */}
          <path
            d="M69 69L88 88"
            stroke="#B8F36B"
            strokeWidth="13"
            strokeLinecap="round"
          />
          {/* 4-Pointed Clarity Star in Center */}
          <path
            d="M46 29C46 38.5 53.5 46 63 46C53.5 46 46 53.5 46 63C46 53.5 38.5 46 29 46C38.5 46 46 38.5 46 29Z"
            fill="#20251A"
          />
        </svg>
      </div>

      {showWordmark && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className={`tracking-tight text-[#191919] font-sans ${wordmarkSizes[size]}`}>
              Openquire
            </span>
          </div>
          {showTagline && (
            <span className="text-xs text-[#717171] tracking-normal -mt-0.5 font-normal">
              Research deeper. Know better.
            </span>
          )}
        </div>
      )}
    </div>
  );
};
