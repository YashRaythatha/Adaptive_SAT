import React from 'react';
import { motion } from 'motion/react';
import { cn } from './ui/utils';

interface ProgressBarProps {
  value: number; // 0-100
  className?: string;
  animated?: boolean;
  showLabel?: boolean;
}

export function ProgressBar({ value, className, animated = true, showLabel = false }: ProgressBarProps) {
  const clampedValue = Math.max(0, Math.min(100, value));
  
  // Determine color based on value
  const getColorClass = () => {
    if (clampedValue >= 70) return 'bg-gradient-to-r from-green-400 to-emerald-400';
    if (clampedValue >= 40) return 'bg-gradient-to-r from-yellow-400 to-amber-400';
    return 'bg-gradient-to-r from-red-400 to-orange-400';
  };

  return (
    <div className={cn('w-full', className)}>
      <div
        className="h-2 bg-muted rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={Math.round(clampedValue)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={showLabel ? `${Math.round(clampedValue)}%` : undefined}
      >
        <motion.div
          initial={animated ? { width: 0 } : { width: `${clampedValue}%` }}
          animate={{ width: `${clampedValue}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={cn('h-full', getColorClass())}
        />
      </div>
      {showLabel && (
        <div className="flex justify-between items-center mt-1">
          <span className="text-xs text-muted-foreground">
            {clampedValue >= 70 && 'Mastered'}
            {clampedValue >= 40 && clampedValue < 70 && 'Progressing'}
            {clampedValue < 40 && 'Developing'}
          </span>
          <span className="text-xs font-medium">{Math.round(clampedValue)}%</span>
        </div>
      )}
    </div>
  );
}