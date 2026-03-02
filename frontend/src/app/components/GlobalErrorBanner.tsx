import React from 'react';
import { motion } from 'motion/react';
import { AlertCircle, X } from 'lucide-react';
import { Button } from './ui/button';
import { useGlobalError } from '../context/GlobalErrorContext';

export function GlobalErrorBanner() {
  const { error, clearError } = useGlobalError();

  if (!error) return null;

  return (
    <motion.div
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -100, opacity: 0 }}
      className="fixed top-0 left-0 right-0 z-50 bg-destructive text-destructive-foreground p-4 shadow-lg"
      role="alert"
    >
      <div className="max-w-screen-lg mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">{error.message}</p>
        </div>

        <div className="flex items-center gap-2">
          {error.retry && (
            <Button
              variant="outline"
              size="sm"
              onClick={error.retry}
              className="bg-white text-destructive hover:bg-gray-100"
            >
              Retry
            </Button>
          )}
          <button
            onClick={clearError}
            className="text-destructive-foreground hover:opacity-80 transition-opacity"
            aria-label="Dismiss error"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
