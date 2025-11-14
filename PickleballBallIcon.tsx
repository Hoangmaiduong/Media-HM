import React from 'react';

export const PickleballBallIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <circle cx="12" cy="12" r="10" />
    <circle cx="15.5" cy="8.5" r="1.5" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <circle cx="12" cy="15" r="1.5" />
    <circle cx="7" cy="14" r="1" />
    <circle cx="17" cy="14" r="1" />
    <circle cx="18" cy="10" r="0.5" />
    <circle cx="6" cy="10" r="0.5" />
  </svg>
);
