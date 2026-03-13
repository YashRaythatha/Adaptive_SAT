import React from 'react';
import { motion } from 'motion/react';
import { cn } from './ui/utils';

interface AnimatedCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hover?: boolean;
  delay?: number;
}

export function AnimatedCard({
  children,
  className,
  onClick,
  hover = true,
  delay = 0,
}: AnimatedCardProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick();
    }
  };

  const sharedProps = {
    initial: { opacity: 0, y: 20 } as const,
    animate: { opacity: 1, y: 0 } as const,
    transition: { duration: 0.4, delay } as const,
    className: cn(
      'bg-card rounded-lg border border-border p-6 shadow-sm',
      hover && 'cursor-pointer transition-shadow hover:shadow-md',
      className
    ),
  };

  if (onClick) {
    return (
      <motion.div
        {...sharedProps}
        whileHover={hover ? { y: -4, scale: 1.01 } : undefined}
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <motion.div {...sharedProps} whileHover={hover ? { y: -4, scale: 1.01 } : undefined}>
      {children}
    </motion.div>
  );
}

interface PageTitleProps {
  children: React.ReactNode;
  subtitle?: string;
  className?: string;
}

export function PageTitle({ children, subtitle, className }: PageTitleProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn('mb-6', className)}
    >
      <h1 className="text-2xl font-medium mb-1">{children}</h1>
      {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
    </motion.div>
  );
}

interface ErrorMessageProps {
  children: React.ReactNode;
  className?: string;
}

export function ErrorMessage({ children, className }: ErrorMessageProps) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className={cn('text-sm text-destructive mt-2', className)}
    >
      {children}
    </motion.div>
  );
}

export function LoadingSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('animate-pulse bg-muted rounded', className)} />
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-current border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite]',
        className
      )}
      role="status"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}