import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { PracticeStackParamList } from '../navigation/types';
import { api, ApiError } from '../api/client';
import { theme } from '../theme';
import { useLayout } from '../hooks/useLayout';

type Props = NativeStackScreenProps<PracticeStackParamList, 'PracticeStart'>;

const SECTIONS: Array<{ id: 'MATH' | 'RW'; label: string; icon: 'book-outline' | 'calculator-outline' }> = [
  { id: 'RW', label: 'Reading & Writing', icon: 'book-outline' },
  { id: 'MATH', label: 'Math', icon: 'calculator-outline' },
];

export function PracticeStartScreen({ navigation }: Props) {
  const layout = useLayout();
  const [selectedSection, setSelectedSection] = useState<'MATH' | 'RW' | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStart = async () => {
    if (!selectedSection) return;
    setLoading(true);
    setError(null);
    try {
      const session = await api.startPractice(selectedSection);
      navigation.replace('PracticeSession', {
        sessionId: session.session_id,
        section: session.section,
      });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to start practice');
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[
        styles.container,
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
      <Text style={styles.title}>Practice</Text>
      <Text style={styles.subtitle}>Choose a section to practice</Text>

      <View style={styles.sectionList}>
        {SECTIONS.map((sec) => (
          <TouchableOpacity
            key={sec.id}
            style={[styles.sectionCard, selectedSection === sec.id && styles.sectionCardSelected]}
            onPress={() => {
              setSelectedSection(sec.id);
              setError(null);
            }}
            activeOpacity={0.8}
          >
            <View style={[styles.sectionIconBox, selectedSection === sec.id && styles.sectionIconBoxSelected]}>
              <Ionicons
                name={sec.icon}
                size={28}
                color={selectedSection === sec.id ? theme.colors.primaryForeground : theme.colors.mutedForeground}
              />
            </View>
            <Text style={[styles.sectionLabel, selectedSection === sec.id && styles.sectionLabelSelected]}>
              {sec.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <TouchableOpacity
        style={[styles.primaryButton, (!selectedSection || loading) && styles.primaryButtonDisabled]}
        onPress={handleStart}
        disabled={!selectedSection || loading}
      >
        {loading ? (
          <ActivityIndicator color={theme.colors.primaryForeground} />
        ) : (
          <Text style={styles.primaryButtonText}>Start practice</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  container: {
    flexGrow: 1,
    backgroundColor: theme.colors.background,
  },
  title: {
    ...theme.typography.title,
    color: theme.colors.foreground,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    ...theme.typography.small,
    color: theme.colors.mutedForeground,
    marginBottom: theme.spacing.lg,
  },
  sectionList: {
    gap: theme.spacing.item,
    marginBottom: theme.spacing.lg,
  },
  sectionCard: {
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.xl,
    paddingVertical: 18,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  sectionCardSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.muted,
  },
  sectionIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: theme.colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionIconBoxSelected: {
    backgroundColor: theme.colors.primary,
  },
  sectionLabel: {
    ...theme.typography.bodyMedium,
    color: theme.colors.foreground,
    flex: 1,
  },
  sectionLabelSelected: {
    color: theme.colors.primary,
  },
  errorText: {
    ...theme.typography.small,
    color: theme.colors.destructive,
    marginBottom: theme.spacing.item,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    backgroundColor: theme.colors.mutedForeground,
  },
  primaryButtonText: {
    color: theme.colors.primaryForeground,
    ...theme.typography.bodyMedium,
  },
});
