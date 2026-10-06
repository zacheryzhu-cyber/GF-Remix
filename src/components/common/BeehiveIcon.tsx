import React from 'react';

/**
 * BeehiveIcon renders a clean geometric beehive / honeycomb icon
 * styled with standard Lucide-compatible props (className, etc.)
 */
export const BeehiveIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({
  className = 'w-5 h-5',
  ...props
}) => {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Top central comb */}
      <polygon points="12 2 15 4.5 15 8 12 10 9 8 9 4.5 12 2" />
      {/* Bottom left comb */}
      <polygon points="6 8.5 9 11 9 14.5 6 16.5 3 14.5 3 11 6 8.5" />
      {/* Bottom right comb */}
      <polygon points="18 8.5 21 11 21 14.5 18 16.5 15 14.5 15 11 18 8.5" />
      {/* Center lower comb */}
      <polygon points="12 13.5 15 16 15 19.5 12 21.5 9 19.5 9 16 12 13.5" />
    </svg>
  );
};
