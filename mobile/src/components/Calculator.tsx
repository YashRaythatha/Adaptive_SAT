import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '../theme';

/**
 * Simple scientific calculator for Math section (SAT-style).
 * Supports: digits, decimal, +, -, *, /, √, clear, equals.
 */
export function Calculator() {
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

  const btn = (label: string, key: string, highlight = false) => (
    <TouchableOpacity
      key={key}
      style={[styles.btn, highlight && styles.btnHighlight]}
      onPress={() => handleKey(key)}
      activeOpacity={0.7}
    >
      <Text style={[styles.btnText, highlight && styles.btnTextHighlight]}>{label}</Text>
    </TouchableOpacity>
  );

  const row = (items: Array<{ label: string; key: string; highlight?: boolean }>) => (
    <View key={items.map((i) => i.key).join('')} style={styles.row}>
      {items.map(({ label, key, highlight }) => btn(label, key, !!highlight))}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.display}>
        <Text style={styles.displayText} numberOfLines={1}>
          {displayValue}
        </Text>
      </View>
      <View style={styles.grid}>
        {row([{ label: 'C', key: 'C' }, { label: '√', key: '√' }, { label: '÷', key: '/' }, { label: '×', key: '*' }])}
        {row([{ label: '7', key: '7' }, { label: '8', key: '8' }, { label: '9', key: '9' }, { label: '+', key: '+' }])}
        {row([{ label: '4', key: '4' }, { label: '5', key: '5' }, { label: '6', key: '6' }, { label: '-', key: '-' }])}
        {row([{ label: '1', key: '1' }, { label: '2', key: '2' }, { label: '3', key: '3' }, { label: '=', key: '=', highlight: true }])}
        {row([{ label: '0', key: '0' }, { label: '.', key: '.' }])}
      </View>
    </View>
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

const styles = StyleSheet.create({
  container: {
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.muted,
    padding: 12,
  },
  display: {
    height: 48,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    marginBottom: 12,
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  displayText: {
    fontSize: 22,
    fontVariant: ['tabular-nums'],
    color: theme.colors.foreground,
  },
  grid: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  btn: {
    flex: 1,
    minWidth: 56,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  btnHighlight: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  btnText: {
    fontSize: 18,
    fontWeight: '500',
    color: theme.colors.foreground,
  },
  btnTextHighlight: {
    color: theme.colors.primaryForeground,
  },
});
