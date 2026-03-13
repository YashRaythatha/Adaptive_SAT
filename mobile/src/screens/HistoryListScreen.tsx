import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { HistoryStackParamList } from '../navigation/types';
import { api, ApiError } from '../api/client';
import type { ExamHistoryItem } from '../api/client';
import { theme } from '../theme';
import { useLayout } from '../hooks/useLayout';

type Props = NativeStackScreenProps<HistoryStackParamList, 'HistoryList'>;

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return iso;
  }
}

export function HistoryListScreen({ navigation }: Props) {
  const layout = useLayout();
  const [list, setList] = useState<ExamHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api
      .getExamHistory(50)
      .then(setList)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Failed to load history'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading history…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { padding: layout.pagePaddingHorizontal }]}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.getParent()?.navigate('Dashboard')}>
          <Text style={styles.primaryButtonText}>Dashboard</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (list.length === 0) {
    return (
      <View style={[styles.container, styles.emptyState]}>
        <View style={styles.emptyIconBox}>
          <Ionicons name="time-outline" size={48} color={theme.colors.mutedForeground} />
        </View>
        <Text style={styles.emptyText}>No exams yet</Text>
        <Text style={styles.emptySubtext}>Complete a full exam to see your history here.</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.getParent()?.navigate('Exam')}>
          <Text style={styles.primaryButtonText}>Start exam</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <FlatList
      data={list}
      keyExtractor={(item) => item.session_id}
      contentContainerStyle={[styles.listContent, { paddingHorizontal: layout.pagePaddingHorizontal, paddingBottom: layout.scrollContentBottomPadding }]}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.row}
          onPress={() => navigation.navigate('ExamReview', { sessionId: item.session_id })}
          activeOpacity={0.7}
        >
          <View style={styles.rowIcon}>
            <Ionicons name="document-text-outline" size={22} color={theme.colors.primary} />
          </View>
          <View style={styles.rowMain}>
            <Text style={styles.rowDate}>{formatDate(item.ended_at)}</Text>
            <Text style={styles.rowScore}>
              Total: {item.total_scaled ?? '—'} · RW: {item.rw_scaled ?? '—'} · Math: {item.math_scaled ?? '—'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.mutedForeground} />
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  centered: { justifyContent: 'center', alignItems: 'center' },
  emptyState: { padding: 24, alignItems: 'center', justifyContent: 'center' },
  emptyIconBox: { marginBottom: 16, opacity: 0.7 },
  loadingText: { marginTop: 12, ...theme.typography.small, color: theme.colors.mutedForeground },
  listContent: { paddingTop: 16, paddingBottom: 32 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  rowIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: theme.colors.muted, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  rowMain: { flex: 1, minWidth: 0 },
  rowDate: { ...theme.typography.bodyMedium, color: theme.colors.foreground },
  rowScore: { ...theme.typography.small, color: theme.colors.mutedForeground, marginTop: 2 },
  errorText: { ...theme.typography.small, color: theme.colors.destructive, marginBottom: 16 },
  emptyText: { ...theme.typography.title2, color: theme.colors.foreground, marginBottom: 8 },
  emptySubtext: { ...theme.typography.small, color: theme.colors.mutedForeground, marginBottom: 24, textAlign: 'center' },
  primaryButton: { backgroundColor: theme.colors.primary, borderRadius: theme.radius.md, paddingVertical: 14, paddingHorizontal: 24, alignItems: 'center' },
  primaryButtonText: { color: theme.colors.primaryForeground, ...theme.typography.bodyMedium },
});
