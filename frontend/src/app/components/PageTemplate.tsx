import React from 'react';
import { cn } from './ui/utils';

interface PageTemplateProps {
  /** Page title (h1) */
  title: string;
  /** Optional short helper text below title */
  subtitle?: string;
  /** Optional primary action(s) - render buttons or links */
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/**
 * Consistent page structure: title first, then helper text, then optional actions, then content.
 * Use one primary action when possible.
 */
export function PageTemplate({ title, subtitle, actions, children, className }: PageTemplateProps) {
  return (
    <div className={cn('space-y-8', className)}>
      <header className="space-y-1">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-medium tracking-tight">{title}</h1>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
        {subtitle && (
          <p className="text-muted-foreground text-sm max-w-2xl">{subtitle}</p>
        )}
      </header>
      <div>{children}</div>
    </div>
  );
}
