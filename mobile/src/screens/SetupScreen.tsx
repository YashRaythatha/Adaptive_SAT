import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { api, ApiError } from '../api/client';
import { theme } from '../theme';
import { useLayout } from '../hooks/useLayout';

export function SetupScreen() {
  const { setUser } = useAuth();
  const layout = useLayout();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGetStarted = async () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    if (!trimmedName || !trimmedEmail) {
      setError('Please enter your name and email.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const user = await api.createUser(trimmedName, trimmedEmail);
      await setUser(user);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Something went wrong. Try again.';
      setError(msg);
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingHorizontal: layout.pagePaddingHorizontal }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.inner, { maxWidth: layout.maxContentWidth ?? 400 }]}>
        <View style={styles.titleRow}>
          <View style={styles.logoBox}>
            <Ionicons name="school-outline" size={32} color={theme.colors.primaryForeground} />
          </View>
          <Text style={styles.title}>Adaptive SAT</Text>
        </View>
        <Text style={styles.subtitle}>Enter your name and email to get started.</Text>

        <TextInput
          style={styles.input}
          placeholder="Name"
          placeholderTextColor={theme.colors.mutedForeground}
          value={name}
          onChangeText={(t) => {
            setName(t);
            setError(null);
          }}
          autoCapitalize="words"
          editable={!loading}
        />
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={theme.colors.mutedForeground}
          value={email}
          onChangeText={(t) => {
            setEmail(t);
            setError(null);
          }}
          keyboardType="email-address"
          autoCapitalize="none"
          editable={!loading}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleGetStarted}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={theme.colors.primaryForeground} />
          ) : (
            <Text style={styles.buttonText}>Get started</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    paddingTop: 0,
    paddingBottom: 0,
  },
  inner: {
    width: '100%',
    alignSelf: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: theme.spacing.sm,
  },
  logoBox: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
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
    marginBottom: theme.spacing.lg,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: theme.spacing.item,
  },
  error: {
    color: theme.colors.destructive,
    ...theme.typography.small,
    marginBottom: theme.spacing.item,
  },
  button: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: theme.spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: theme.colors.primaryForeground,
    ...theme.typography.bodyMedium,
  },
});
