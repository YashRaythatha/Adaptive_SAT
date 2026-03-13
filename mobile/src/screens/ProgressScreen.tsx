import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api, ApiError } from '../api/client';
import { theme } from '../theme';
import { useLayout } from '../hooks/useLayout';

interface SkillRow {
  skill_id: string;
  skill_name: string;
  section: 'MATH' | 'RW';
  mastery_level: number;
}

export function ProgressScreen() {
  const layout = useLayout();
  const [skills, setSkills] = useState<SkillRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api
      .getSkills()
      .then(setSkills)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Failed to load progress'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading progress…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  const rw = skills.filter((s) => s.section === 'RW');
  const math = skills.filter((s) => s.section === 'MATH');

  return (
    <FlatList
      contentContainerStyle={[styles.listContent, { paddingHorizontal: layout.pagePaddingHorizontal, paddingBottom: layout.scrollContentBottomPadding }]}
      ListHeaderComponent={
        <View style={styles.titleRow}>
          <Ionicons name="trending-up-outline" size={24} color={theme.colors.primary} />
          <Text style={styles.title}>Skills & mastery</Text>
        </View>
      }
      data={[{ key: 'rw', title: 'Reading & Writing', icon: 'book-outline' as const, items: rw }, { key: 'math', title: 'Math', icon: 'calculator-outline' as const, items: math }]}
      renderItem={({ item }) => (
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name={item.icon} size={18} color={theme.colors.mutedForeground} />
            <Text style={styles.sectionTitle}>{item.title}</Text>
          </View>
          {item.items.length === 0 ? (
            <Text style={styles.emptySection}>No skills yet</Text>
          ) : (
            item.items.map((s) => (
              <View key={s.skill_id} style={styles.skillRow}>
                <Text style={styles.skillName} numberOfLines={1}>{s.skill_name}</Text>
                <View style={styles.masteryBar}>
                  <View
                    style={[styles.masteryFill, { width: `${Math.min(100, Math.max(0, s.mastery_level))}%` }]}
                  />
                </View>
                <Text style={styles.masteryText}>{Math.round(s.mastery_level)}%</Text>
              </View>
            ))
          )}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  centered: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, ...theme.typography.small, color: theme.colors.mutedForeground },
  listContent: { paddingTop: 16, paddingBottom: 32 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  title: { ...theme.typography.title, color: theme.colors.foreground },
  section: { marginBottom: 24 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { ...theme.typography.bodyMedium, color: theme.colors.foreground },
  emptySection: { ...theme.typography.small, color: theme.colors.mutedForeground },
  skillRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  skillName: { flex: 1, minWidth: 0, ...theme.typography.small, color: theme.colors.foreground, marginRight: 12 },
  masteryBar: { width: 80, height: 8, backgroundColor: theme.colors.muted, borderRadius: 4, overflow: 'hidden' },
  masteryFill: { height: '100%', backgroundColor: theme.colors.primary, borderRadius: 4 },
  masteryText: { ...theme.typography.caption, color: theme.colors.mutedForeground, width: 36, textAlign: 'right' },
  errorText: { ...theme.typography.small, color: theme.colors.destructive, padding: 24 },
});
