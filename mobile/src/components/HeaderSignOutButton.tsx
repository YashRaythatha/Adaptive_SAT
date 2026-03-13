import React from 'react';
import { TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { theme } from '../theme';

/** Renders a header-right Sign out icon. Use in stack/tab options. */
export function HeaderSignOutButton() {
  const { signOut } = useAuth();
  return (
    <TouchableOpacity
      onPress={() => signOut()}
      style={styles.button}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      accessibilityLabel="Sign out"
    >
      <Ionicons name="log-out-outline" size={22} color={theme.colors.primaryForeground} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: Platform.OS === 'ios' ? 12 : 8,
    marginRight: Platform.OS === 'ios' ? 4 : 0,
  },
});
