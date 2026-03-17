import React, { useState, useCallback } from 'react';
import { Button } from './ui/button';
import { cn } from './ui/utils';

/**
 * Simple scientific calculator for Math section (SAT-style).
 * Supports: digits, decimal, +, -, *, /, √, clear, equals.
 */
export function Calculator({ className }: { className?: string }) {
  const [display, setDisplay] = useState('0');
  const [pendingOp, setPendingOp] = useState<{ value: number; op: string } | null>(null);
  const [freshResult, setFreshResult] = useState(false);

  const clear = useCallback(() => {
    setDisplay('0');
    setPendingOp(null);
    setFreshResult(false);
  }, []);

  const append = useCallback((char: string) => {
    setDisplay((prev) => {
      if (freshResult) return char === '.' ? '0.' : char;
      if (char === '.') {
        if (prev.includes('.')) return prev;
        return prev === '' ? '0.' : prev + '.';
      }
      if (char === '0' && prev === '0') return prev;
      if (prev === '0' && char !== '.') return char;
      return prev + char;
    });
    setFreshResult(false);
  }, [freshResult]);

  const runOp = useCallback((op: string) => {
    const num = parseFloat(display) || 0;
    let nextValue = num;
    if (pendingOp) {
      const result = compute(pendingOp.value, pendingOp.op, num);
      nextValue = roundResult(result);
      setDisplay(String(nextValue));
      setFreshResult(true);
    }
    if (op !== '=') {
      setPendingOp({ value: nextValue, op });
      setFreshResult(true);
    } else {
      setPendingOp(null);
    }
  }, [display, pendingOp]);

  const sqrt = useCallback(() => {
    const num = parseFloat(display) || 0;
    if (num < 0) {
      setDisplay('Error');
      setPendingOp(null);
      setFreshResult(true);
      return;
    }
    setDisplay(String(roundResult(Math.sqrt(num))));
    setFreshResult(true);
  }, [display]);

  const handleKey = useCallback((key: string) => {
    if (key >= '0' && key <= '9') append(key);
    else if (key === '.') append('.');
    else if (key === 'C') clear();
    else if (key === '√') sqrt();
    else if (['+', '-', '*', '/', '='].includes(key)) runOp(key);
  }, [append, clear, sqrt, runOp]);

  const displayValue = display.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  const btn = (label: string, key: string, variant: 'default' | 'secondary' | 'outline' = 'secondary') => (
    <Button
      type="button"
      variant={variant}
      size="icon"
      className="h-11 w-11 sm:h-12 sm:w-12 text-base font-mono"
      onClick={() => handleKey(key)}
      aria-label={label}
    >
      {label}
    </Button>
  );

  return (
    <div className={cn('rounded-lg border bg-muted/30 p-3', className)}>
      <div
        className="mb-3 flex h-12 items-center justify-end rounded border bg-background px-3 font-mono text-xl tabular-nums"
        aria-live="polite"
      >
        {displayValue}
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {btn('C', 'C', 'outline')}
        {btn('√', '√', 'outline')}
        {btn('÷', '/', 'outline')}
        {btn('×', '*', 'outline')}
        {['7', '8', '9'].map((d) => btn(d, d))}
        {btn('+', '+', 'outline')}
        {['4', '5', '6'].map((d) => btn(d, d))}
        {btn('-', '-', 'outline')}
        {['1', '2', '3'].map((d) => btn(d, d))}
        {btn('=', '=', 'default')}
        {btn('0', '0')}
        {btn('.', '.')}
      </div>
    </div>
  );
}

function compute(a: number, op: string, b: number): number {
  switch (op) {
    case '+': return a + b;
    case '-': return a - b;
    case '*': return a * b;
    case '/': return b === 0 ? NaN : a / b;
    default: return b;
  }
}

function roundResult(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 1e10) / 1e10;
}
