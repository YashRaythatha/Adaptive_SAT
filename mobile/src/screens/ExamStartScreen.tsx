import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ExamStackParamList } from '../navigation/types';
import { api, ApiError } from '../api/client';
import { theme } from '../theme';

type Props = NativeStackScreenProps<ExamStackParamList, 'ExamStart'>;

export function ExamStartScreen({ navigation }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStart = async () => {
    setLoading(true);
    setError(null);
    try {
      const session = await api.startExam();
      navigation.replace('ExamSession', { sessionId: session.session_id });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to start exam');
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.iconRow}>
        <View style={styles.iconBox}>
          <Ionicons name="document-text-outline" size={32} color={theme.colors.examText} />
        </View>
        <Text style={styles.title}>Full practice exam</Text>
      </View>
      <Text style={styles.subtitle}>
        Timed like the real SAT: Reading & Writing (2 modules), then a 10‑minute break, then Math (2 modules).
      </Text>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <TouchableOpacity
        style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
        onPress={handleStart}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={theme.colors.primaryForeground} />
        ) : (
          <Text style={styles.primaryButtonText}>Start exam</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.lg,
    paddingTop: 48,
  },
  iconRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: theme.colors.examCardBg,
    borderWidth: 1,
    borderColor: theme.colors.examCardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...theme.typography.title,
    color: theme.colors.foreground,
    flex: 1,
  },
  subtitle: {
    ...theme.typography.small,
    color: theme.colors.mutedForeground,
    lineHeight: 22,
    marginBottom: 32,
  },
  errorText: {
    ...theme.typography.small,
    color: theme.colors.destructive,
    marginBottom: 16,
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
