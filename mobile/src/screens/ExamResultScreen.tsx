import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ExamStackParamList } from '../navigation/types';
import { api, ApiError } from '../api/client';
import { theme } from '../theme';
import { useLayout } from '../hooks/useLayout';

type Props = NativeStackScreenProps<ExamStackParamList, 'ExamResult'>;

interface ExamResultData {
  session_id: string;
  total_score: number | null;
  math_score: number | null;
  rw_score: number | null;
  total_questions: number;
  correct_answers: number;
  skills_breakdown: Array<{ skill_id: string; skill_name: string; correct: number; total: number }>;
}

export function ExamResultScreen({ route, navigation }: Props) {
  const layout = useLayout();
  const { sessionId } = route.params;
  const [result, setResult] = useState<ExamResultData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .getExamResult(sessionId)
      .then((r) => {
        if (!cancelled) {
          setResult({
            session_id: r.session_id,
            total_score: r.total_score,
            math_score: r.math_score,
            rw_score: r.rw_score,
            total_questions: r.total_questions,
            correct_answers: r.correct_answers,
            skills_breakdown: r.skills_breakdown,
          });
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof ApiError ? e.message : 'Failed to load result');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading results…</Text>
      </View>
    );
  }

  if (error || !result) {
    return (
      <View style={[styles.container, styles.centered, { padding: layout.pagePaddingHorizontal }]}>
        <Text style={styles.errorText}>{error || 'No result'}</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.getParent()?.navigate('Dashboard')}>
          <Text style={styles.primaryButtonText}>Dashboard</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const pct = result.total_questions > 0 ? Math.round((result.correct_answers / result.total_questions) * 100) : 0;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[
        styles.scrollContent,
        {
          paddingHorizontal: layout.pagePaddingHorizontal,
          paddingTop: layout.insets.top + layout.pagePaddingVertical,
          paddingBottom: layout.scrollContentBottomPadding,
          maxWidth: layout.maxContentWidth,
          alignSelf: layout.maxContentWidth ? 'center' : undefined,
          width: layout.maxContentWidth ? '100%' : undefined,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Exam complete</Text>

      <View style={styles.scoreCard}>
        <Text style={styles.totalScore}>{result.total_score ?? '—'}</Text>
        <Text style={styles.totalLabel}>Total (out of 1600)</Text>
        <View style={styles.scoreRow}>
          <View style={styles.scoreBox}>
            <Text style={styles.scoreLabel}>Reading & Writing</Text>
            <Text style={styles.scoreValue}>{result.rw_score ?? '—'}</Text>
          </View>
          <View style={styles.scoreBox}>
            <Text style={styles.scoreLabel}>Math</Text>
            <Text style={styles.scoreValue}>{result.math_score ?? '—'}</Text>
          </View>
        </View>
        <Text style={styles.correctText}>
          {result.correct_answers} of {result.total_questions} correct ({pct}%)
        </Text>
      </View>

      {result.skills_breakdown.length > 0 ? (
        <View style={styles.skillsCard}>
          <Text style={styles.skillsTitle}>Skills breakdown</Text>
          {result.skills_breakdown.slice(0, 10).map((s) => (
            <View key={s.skill_id} style={styles.skillRow}>
              <Text style={styles.skillName} numberOfLines={1}>{s.skill_name}</Text>
              <Text style={styles.skillScore}>{s.correct}/{s.total}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => navigation.navigate('ExamReview', { sessionId })}
      >
        <Text style={styles.primaryButtonText}>View full review</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => navigation.getParent()?.navigate('History')}
      >
        <Text style={styles.secondaryButtonText}>Exam history</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => navigation.getParent()?.navigate('Dashboard')}
      >
        <Text style={styles.secondaryButtonText}>Dashboard</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  centered: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, ...theme.typography.small, color: theme.colors.mutedForeground },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  title: { ...theme.typography.title, marginBottom: 20, color: theme.colors.foreground },
  scoreCard: {
    backgroundColor: theme.colors.examCardBg,
    borderRadius: theme.radius.xl,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.examCardBorder,
  },
  totalScore: { fontSize: 40, fontWeight: '700', color: theme.colors.examText },
  totalLabel: { ...theme.typography.small, color: theme.colors.mutedForeground, marginBottom: 16 },
  scoreRow: { flexDirection: 'row', gap: 16, width: '100%', justifyContent: 'center' },
  scoreBox: { flex: 1, alignItems: 'center' },
  scoreLabel: { ...theme.typography.caption, color: theme.colors.mutedForeground, marginBottom: 4 },
  scoreValue: { fontSize: 22, fontWeight: '700', color: theme.colors.foreground },
  correctText: { ...theme.typography.small, color: theme.colors.mutedForeground, marginTop: 12 },
  skillsCard: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: theme.colors.muted,
    borderRadius: theme.radius.lg,
  },
  skillsTitle: { ...theme.typography.bodyMedium, marginBottom: 12, color: theme.colors.foreground },
  skillRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  skillName: { flex: 1, ...theme.typography.small, color: theme.colors.foreground },
  skillScore: { ...theme.typography.small, color: theme.colors.mutedForeground },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: { color: theme.colors.primaryForeground, ...theme.typography.bodyMedium },
  secondaryButton: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  secondaryButtonText: { ...theme.typography.body, color: theme.colors.foreground },
  errorText: { ...theme.typography.small, color: theme.colors.destructive, marginBottom: 16 },
});
