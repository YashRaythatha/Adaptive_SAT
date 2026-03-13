import React from 'react';
import { motion } from 'motion/react';
import { Check, X } from 'lucide-react';
import { cn } from './ui/utils';

interface Choice {
  label: 'A' | 'B' | 'C' | 'D';
  text: string;
}

interface ChoiceListProps {
  choices: Choice[];
  selectedChoice: 'A' | 'B' | 'C' | 'D' | null;
  onSelect: (choice: 'A' | 'B' | 'C' | 'D') => void;
  correctAnswer?: 'A' | 'B' | 'C' | 'D';
  showResult?: boolean;
  disabled?: boolean;
}

export function ChoiceList({
  choices,
  selectedChoice,
  onSelect,
  correctAnswer,
  showResult = false,
  disabled = false,
}: ChoiceListProps) {
  return (
    <div className="space-y-3">
      {choices.map((choice, index) => {
        const isSelected = selectedChoice === choice.label;
        const isCorrect = showResult && correctAnswer === choice.label;
        const isWrong = showResult && isSelected && correctAnswer !== choice.label;

        return (
          <motion.button
            key={choice.label}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            whileHover={!disabled ? { scale: 1.01 } : undefined}
            whileTap={!disabled ? { scale: 0.98 } : undefined}
            onClick={() => !disabled && onSelect(choice.label)}
            disabled={disabled}
            className={cn(
              'w-full text-left p-4 rounded-lg border-2 transition-all',
              'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
              isSelected && !showResult && 'border-primary bg-primary/5',
              !isSelected && !showResult && 'border-border hover:border-primary/50',
              isCorrect && 'border-green-500 bg-green-50 dark:bg-green-950',
              isWrong && 'border-red-500 bg-red-50 dark:bg-red-950',
              disabled && 'cursor-not-allowed opacity-60'
            )}
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'flex items-center justify-center w-8 h-8 rounded-full font-medium flex-shrink-0',
                  isSelected && !showResult && 'bg-primary text-primary-foreground',
                  !isSelected && !showResult && 'bg-muted text-muted-foreground',
                  isCorrect && 'bg-green-500 text-white',
                  isWrong && 'bg-red-500 text-white'
                )}
              >
                {showResult && isCorrect ? (
                  <Check className="w-5 h-5" />
                ) : showResult && isWrong ? (
                  <X className="w-5 h-5" />
                ) : (
                  choice.label
                )}
              </div>
              <span className="flex-1">{choice.text}</span>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}