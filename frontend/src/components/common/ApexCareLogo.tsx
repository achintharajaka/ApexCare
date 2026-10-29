import React from 'react';

interface ApexCareLogoProps {
  variant?: 'light' | 'dark'; // 'dark' = for dark sidebar (white text), 'light' = for light card/page
  className?: string;
}

export const ApexCareLogo: React.FC<ApexCareLogoProps> = ({ variant = 'dark', className = 'h-9 w-auto' }) => {
  const isDark = variant === 'dark';

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 200 50"
        className="h-9 w-auto select-none"
      >
        <defs>
          <linearGradient id="apexGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0284C7" />
            <stop offset="100%" stopColor="#0369A1" />
          </linearGradient>
        </defs>
        {/* Rounded square container */}
        <rect x="4" y="7" width="36" height="36" rx="8" fill="url(#apexGrad)" />
        {/* Cross symbol */}
        <path d="M22 15 V35 M12 25 H32" stroke="#FFFFFF" strokeWidth="4.5" strokeLinecap="round" />
        {/* Precision cyan dot */}
        <circle cx="28" cy="19" r="3" fill="#38BDF8" />
        {/* ApexCare Text */}
        <text
          x="50"
          y="27"
          fontFamily="Inter, sans-serif"
          fontWeight="700"
          fontSize="17"
          fill={isDark ? '#F8FAFC' : '#0F172A'}
          letterSpacing="-0.02em"
        >
          ApexCare
        </text>
        {/* Hospital System subtitle */}
        <text
          x="50"
          y="39"
          fontFamily="Inter, sans-serif"
          fontWeight="600"
          fontSize="9.5"
          fill={isDark ? '#38BDF8' : '#0284C7'}
          letterSpacing="0.08em"
        >
          HOSPITAL SYSTEM
        </text>
      </svg>
    </div>
  );
};
