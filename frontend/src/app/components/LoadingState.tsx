import React from 'react';
import { Spinner } from './AnimatedComponents';
import { Skeleton } from './ui/skeleton';
import { cn } from './ui/utils';

interface LoadingStateProps {
  /** 'spinner' for centered spinner, 'skeleton' for content-placeholder blocks */
  variant?: 'spinner' | 'skeleton';
  /** Optional className for the container */
  className?: string;
  /** For skeleton: number of placeholder lines or custom content */
  skeletonLines?: number;
}

export function LoadingState({
  variant = 'spinner',
  className,
  skeletonLines = 3,
}: LoadingStateProps) {
  if (variant === 'spinner') {
    return (
      <div
        className={cn('flex items-center justify-center py-12', className)}
        role="status"
        aria-live="polite"
        aria-label="Loading"
      >
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)} role="status" aria-label="Loading content">
      {Array.from({ length: skeletonLines }).map((_, i) => (
        <Skeleton key={i} className="h-4 w-full" style={{ maxWidth: i === skeletonLines - 1 ? '75%' : undefined }} />
      ))}
    </div>
  );
}
