import React from 'react';
import { motion } from 'motion/react';
import { cn } from './ui/utils';

interface QuestionCardProps {
  difficulty: number;
  children: React.ReactNode;
  className?: string;
}

export function QuestionCard({ difficulty, children, className }: QuestionCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn(
        'bg-card border border-border rounded-lg p-6 shadow-sm',
        className
      )}
    >
      <div className="mb-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium" aria-hidden>
          <span>Difficulty:</span>
          {Array.from({ length: 5 }).map((_, i) => (
            <span key={i} className={cn('w-1.5 h-1.5 rounded-full', i < difficulty ? 'bg-primary' : 'bg-muted')} />
          ))}
        </div>
        <span className="sr-only">Difficulty: {difficulty} out of 5</span>
      </div>
      {children}
    </motion.div>
  );
}