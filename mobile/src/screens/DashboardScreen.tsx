import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MainTabParamList } from '../navigation/types';
import { api, ApiError } from '../api/client';
import { theme } from '../theme';
import { useLayout } from '../hooks/useLayout';

type Props = NativeStackScreenProps<MainTabParamList, 'Dashboard'>;

type WeakArea = { skill_id: string; skill_name: string; section: string; score_from_exam: number };

export function DashboardScreen({ navigation }: Props) {
  const { user, signOut } = useAuth();
  const layout = useLayout();
  const [weakAreas, setWeakAreas] = useState<WeakArea[]>([]);
  const [weakLoading, setWeakLoading] = useState(true);
  const [practiceLoading, setPracticeLoading] = useState<string | null>(null);
  const [practiceError, setPracticeError] = useState<string | null>(null);

  useEffect(() => {
    api.getWeakAreas(10).then(setWeakAreas).catch(() => setWeakAreas([])).finally(() => setWeakLoading(false));
  }, []);

  const handleWeakAreaPractice = async (skillName: string) => {
    setPracticeLoading(skillName);
    setPracticeError(null);
    try {
      const session = await api.startTargetedPractice(skillName);
      navigation.navigate('Practice', {
        screen: 'PracticeSession',
        params: { sessionId: session.session_id, section: session.section },
      });
    } catch (e) {
      setPracticeError(e instanceof ApiError ? e.message : 'Failed to start practice');
    } finally {
      setPracticeLoading(null);
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
      <Text style={styles.title}>Welcome back, {user?.name ?? 'there'}! 👋</Text>
      <Text style={styles.subtitle}>
        Choose how you want to practice. Take a full exam to see your weak areas, then practice them.
      </Text>

      {/* Practice card - matches web teal card */}
      <TouchableOpacity
        style={[styles.actionCard, theme.shadow.card]}
        onPress={() => navigation.navigate('Practice')}
        activeOpacity={0.85}
      >
        <View style={[styles.iconBox, styles.iconBoxPractice]}>
          <Ionicons name="book-outline" size={26} color={theme.colors.practiceText} />
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>Practice Session</Text>
          <Text style={styles.cardDesc}>
            Work on specific skills with targeted questions. Perfect for daily practice.
          </Text>
          <View style={styles.cardCtaRow}>
            <Text style={styles.cardCtaPractice}>Start Practice</Text>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.practiceText} />
          </View>
        </View>
      </TouchableOpacity>

      {/* Exam card - matches web amber card */}
      <TouchableOpacity
        style={[styles.actionCard, styles.actionCardExam, theme.shadow.card]}
        onPress={() => navigation.navigate('Exam')}
        activeOpacity={0.85}
      >
        <View style={[styles.iconBox, styles.iconBoxExam]}>
          <Ionicons name="document-text-outline" size={26} color={theme.colors.examText} />
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>Full Practice Exam</Text>
          <Text style={styles.cardDesc}>
            Take a complete SAT practice test. We’ll show your weak areas so you know what to practice next.
          </Text>
          <View style={styles.cardCtaRow}>
            <Text style={styles.cardCtaExam}>Start Exam</Text>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.examText} />
          </View>
        </View>
      </TouchableOpacity>

      <View style={styles.linksRow}>
        <TouchableOpacity style={styles.linkTouch} onPress={() => navigation.navigate('Progress')}>
          <Ionicons name="trending-up-outline" size={20} color={theme.colors.primary} />
          <Text style={styles.link}>View your progress and all skills</Text>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.mutedForeground} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.linkTouch, styles.linkSpacer]} onPress={() => navigation.navigate('History')}>
          <Ionicons name="time-outline" size={20} color={theme.colors.primary} />
          <Text style={styles.link}>Exam history</Text>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      {(weakLoading || weakAreas.length > 0) && (
        <View style={styles.weakSection}>
          <View style={styles.weakTitleRow}>
            <Ionicons name="analytics-outline" size={20} color={theme.colors.examAccent} />
            <Text style={styles.weakTitle}>Your weak areas</Text>
          </View>
          {weakLoading ? (
            <ActivityIndicator size="small" color={theme.colors.primary} style={styles.weakLoader} />
          ) : (
            <>
              <Text style={styles.weakSubtext}>From your last exam. Tap to practice that skill.</Text>
              {practiceError ? <Text style={styles.errorText}>{practiceError}</Text> : null}
              {weakAreas.map((area) => (
                <View key={area.skill_id} style={styles.weakRow}>
                  <View style={styles.weakRowMain}>
                    <Text style={styles.weakSkillName} numberOfLines={1}>{area.skill_name}</Text>
                    <Text style={styles.weakMeta}>{area.section} · {area.score_from_exam}%</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.weakPracticeBtn, practiceLoading === area.skill_name && styles.weakPracticeBtnDisabled]}
                    onPress={() => handleWeakAreaPractice(area.skill_name)}
                    disabled={!!practiceLoading}
                  >
                    {practiceLoading === area.skill_name ? (
                      <ActivityIndicator size="small" color={theme.colors.practiceText} />
                    ) : (
                      <Text style={styles.weakPracticeBtnText}>Practice</Text>
                    )}
                  </TouchableOpacity>
                </View>
              ))}
            </>
          )}
        </View>
      )}

      <TouchableOpacity style={styles.signOutButton} onPress={signOut} activeOpacity={0.7}>
        <Ionicons name="log-out-outline" size={20} color={theme.colors.mutedForeground} />
        <Text style={styles.signOutText}>Sign out</Text>
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
    lineHeight: 20,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.colors.practiceCardBg,
    borderWidth: 1,
    borderColor: theme.colors.practiceCardBorder,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.card,
    marginBottom: theme.spacing.item,
    minHeight: 100,
  },
  actionCardExam: {
    backgroundColor: theme.colors.examCardBg,
    borderColor: theme.colors.examCardBorder,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  iconBoxPractice: {
    backgroundColor: theme.colors.practiceAccent,
  },
  iconBoxExam: {
    backgroundColor: theme.colors.examAccent,
  },
  cardContent: { flex: 1 },
  cardTitle: {
    ...theme.typography.title2,
    color: theme.colors.foreground,
    marginBottom: theme.spacing.sm,
  },
  cardDesc: {
    ...theme.typography.small,
    color: theme.colors.mutedForeground,
    marginBottom: theme.spacing.sm,
    lineHeight: 20,
  },
  cardCtaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardCtaPractice: {
    ...theme.typography.smallMedium,
    color: theme.colors.practiceText,
  },
  cardCtaExam: {
    ...theme.typography.smallMedium,
    color: theme.colors.examText,
  },
  linksRow: {
    marginBottom: theme.spacing.lg,
  },
  linkTouch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingRight: 4,
  },
  link: {
    ...theme.typography.small,
    color: theme.colors.primary,
    flex: 1,
  },
  linkSpacer: { marginTop: 0 },
  weakSection: {
    marginTop: theme.spacing.section,
    paddingTop: theme.spacing.section,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  weakTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: theme.spacing.sm,
  },
  weakTitle: { ...theme.typography.bodyMedium, color: theme.colors.foreground },
  weakSubtext: {
    ...theme.typography.small,
    color: theme.colors.mutedForeground,
    marginBottom: theme.spacing.item,
  },
  weakLoader: { marginVertical: theme.spacing.sm },
  weakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.muted,
  },
  weakRowMain: { flex: 1, minWidth: 0, marginRight: theme.spacing.item },
  weakSkillName: { ...theme.typography.bodyMedium, color: theme.colors.foreground },
  weakMeta: { ...theme.typography.caption, color: theme.colors.mutedForeground, marginTop: 2 },
  weakPracticeBtn: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: 14,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.practiceCardBg,
    borderWidth: 1,
    borderColor: theme.colors.practiceCardBorder,
  },
  weakPracticeBtnDisabled: { opacity: 0.7 },
  weakPracticeBtnText: { ...theme.typography.smallMedium, color: theme.colors.practiceText },
  errorText: { ...theme.typography.small, color: theme.colors.destructive, marginBottom: theme.spacing.sm },
  signOutButton: {
    marginTop: theme.spacing.section,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.muted,
  },
  signOutText: {
    ...theme.typography.smallMedium,
    color: theme.colors.mutedForeground,
  },
});
