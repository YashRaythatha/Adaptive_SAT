import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from './ui/utils';

interface ErrorStateProps {
  title?: string;
  message: string;
  /** Callback when user clicks Retry */
  onRetry?: () => void;
  /** Optional detailed error (e.g. for dev or support); shown in a toggle */
  details?: string;
  className?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  details,
  className,
}: ErrorStateProps) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center py-12 px-4 border border-destructive/30 rounded-lg bg-destructive/5',
        className
      )}
      role="alert"
    >
      <AlertCircle className="w-12 h-12 text-destructive mb-4 flex-shrink-0" aria-hidden />
      <h3 className="text-lg font-medium mb-2">{title}</h3>
      <p className="text-muted-foreground mb-6 max-w-md">{message}</p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {onRetry && (
          <Button onClick={onRetry} variant="default">
            Try again
          </Button>
        )}
        {details && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDetails((v) => !v)}
            aria-expanded={showDetails}
          >
            {showDetails ? 'Hide details' : 'Show details'}
          </Button>
        )}
      </div>
      {details && showDetails && (
        <pre
          className="mt-4 p-4 w-full max-w-md text-left text-xs bg-muted rounded-md overflow-auto"
          role="region"
          aria-label="Error details"
        >
          {details}
        </pre>
      )}
    </div>
  );
}
