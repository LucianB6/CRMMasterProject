import * as React from 'react';

type ProgressiveBlurProps = {
  position?: 'top' | 'bottom';
  height?: string;
  className?: string;
};

export function ProgressiveBlur({
  position = 'bottom',
  height = '22vh',
  className = '',
}: ProgressiveBlurProps) {
  const isBottom = position === 'bottom';
  const gradientClass = isBottom
    ? 'bg-gradient-to-t from-white/80 via-white/45 to-transparent'
    : 'bg-gradient-to-b from-white/80 via-white/45 to-transparent';

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed inset-x-0 z-40 ${isBottom ? 'bottom-0' : 'top-0'} ${className}`}
      style={{ height }}
    >
      <div className={`h-full w-full ${gradientClass}`} />
    </div>
  );
}
