import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ExamStackParamList } from '../navigation/types';
import { api, ApiError } from '../api/client';
import { theme } from '../theme';
import { useLayout } from '../hooks/useLayout';
import { Calculator } from '../components/Calculator';

type Props = NativeStackScreenProps<ExamStackParamList, 'ExamSession'>;

type ChoiceKey = 'A' | 'B' | 'C' | 'D';

interface QuestionData {
  question_id: string;
  question_text: string;
  choices: Record<ChoiceKey, string>;
  question_order: number;
  module_total: number;
  section: 'RW' | 'MATH';
  module_number: number;
}

export function ExamSessionScreen({ route, navigation }: Props) {
  const layout = useLayout();
  const { sessionId } = route.params;
  const [question, setQuestion] = useState<QuestionData | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<ChoiceKey | null>(null);
  const [currentSection, setCurrentSection] = useState<'RW' | 'MATH'>('RW');
  const [currentModule, setCurrentModule] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showBreak, setShowBreak] = useState(false);
  const [breakSecondsRemaining, setBreakSecondsRemaining] = useState<number>(10 * 60);
  const [breakEndsAt, setBreakEndsAt] = useState<string | null>(null);
  const [moduleSecondsRemaining, setModuleSecondsRemaining] = useState<number | null>(null);
  const [isEnding, setIsEnding] = useState(false);
  const [calculatorVisible, setCalculatorVisible] = useState(false);
  const autoAdvanceRef = useRef(false);

  const loadQuestion = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      let q = await api.getNextExamQuestion(sessionId);
      if (!q) {
        const advance = await api.advanceExam(sessionId);
        if (advance.status === 'ENDED') {
          navigation.replace('ExamResult', { sessionId });
          return;
        }
        if (advance.status === 'BREAK') {
          setShowBreak(true);
          setBreakEndsAt(advance.break_ends_at ?? null);
          setBreakSecondsRemaining(advance.break_duration_sec ?? 10 * 60);
          setQuestion(null);
          setLoading(false);
          return;
        }
        if (advance.status === 'ACTIVE' && advance.current_section && advance.current_module != null) {
          setCurrentSection(advance.current_section as 'RW' | 'MATH');
          setCurrentModule(advance.current_module);
        }
        q = await api.getNextExamQuestion(sessionId);
      }
      if (q) {
        setQuestion({
          question_id: q.question_id,
          question_text: q.question_text,
          choices: q.choices,
          question_order: q.question_order,
          module_total: q.module_total,
          section: q.section,
          module_number: q.module_number,
        });
        setSelectedAnswer(null);
      }
    } catch (e) {
      if (e instanceof ApiError && (e.status === 404 || e.status === 409)) {
        try {
          const advance = await api.advanceExam(sessionId);
          if (advance.status === 'ENDED') {
            navigation.replace('ExamResult', { sessionId });
            return;
          }
          if (advance.status === 'BREAK') {
            setShowBreak(true);
            setBreakEndsAt(advance.break_ends_at ?? null);
            setBreakSecondsRemaining(advance.break_duration_sec ?? 10 * 60);
            setQuestion(null);
          }
        } catch {
          setLoadError('Failed to advance');
        }
      } else {
        setLoadError(e instanceof ApiError ? e.message : 'Failed to load question');
      }
    } finally {
      setLoading(false);
    }
  }, [sessionId, navigation]);

  useEffect(() => {
    loadQuestion();
  }, [loadQuestion]);

  // Poll time remaining every second; on expiry, advance once
  useEffect(() => {
    if (!sessionId || !question) return;
    autoAdvanceRef.current = false;
    const tick = async () => {
      try {
        const { seconds_remaining, expired } = await api.getExamTimeRemaining(sessionId);
        setModuleSecondsRemaining(seconds_remaining ?? 0);
        if (expired && !autoAdvanceRef.current) {
          autoAdvanceRef.current = true;
          setModuleSecondsRemaining(0);
          setLoading(true);
          try {
            const advance = await api.advanceExam(sessionId);
            if (advance.status === 'ENDED') {
              navigation.replace('ExamResult', { sessionId });
              return;
            }
            if (advance.status === 'BREAK') {
              setShowBreak(true);
              setBreakEndsAt(advance.break_ends_at ?? null);
              setBreakSecondsRemaining(advance.break_duration_sec ?? 10 * 60);
              setQuestion(null);
              setLoading(false);
              return;
            }
            if (advance.status === 'ACTIVE' && advance.current_section != null && advance.current_module != null) {
              setCurrentSection(advance.current_section as 'RW' | 'MATH');
              setCurrentModule(advance.current_module);
              const q = await api.getNextExamQuestion(sessionId);
              if (q) {
                setQuestion({
                  question_id: q.question_id,
                  question_text: q.question_text,
                  choices: q.choices,
                  question_order: q.question_order,
                  module_total: q.module_total,
                  section: q.section,
                  module_number: q.module_number,
                });
                setSelectedAnswer(null);
              }
            }
          } catch {
            // ignore
          } finally {
            setLoading(false);
          }
        }
      } catch {
        setModuleSecondsRemaining(null);
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [sessionId, question?.question_id, navigation]);

  // Break countdown
  useEffect(() => {
    if (!showBreak || !breakEndsAt) return;
    const endsAt = new Date(breakEndsAt).getTime();
    const tick = () => {
      const rem = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setBreakSecondsRemaining(Math.min(10 * 60, rem));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [showBreak, breakEndsAt]);

  const handleSubmitAndNext = async () => {
    if (!selectedAnswer || !question) return;
    try {
      await api.submitExamAnswer(sessionId, question.question_id, selectedAnswer);
      loadQuestion();
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        setModuleSecondsRemaining(0);
        try {
          await api.advanceExam(sessionId);
          loadQuestion();
        } catch {
          // ignore
        }
        return;
      }
      setLoadError(e instanceof ApiError ? e.message : 'Failed to submit');
    }
  };

  const handleContinueToMath = async () => {
    setLoading(true);
    setShowBreak(false);
    try {
      const advance = await api.advanceExam(sessionId);
      if (advance.status === 'ACTIVE' && advance.current_section && advance.current_module != null) {
        setCurrentSection(advance.current_section as 'RW' | 'MATH');
        setCurrentModule(advance.current_module);
      }
      await loadQuestion();
    } finally {
      setLoading(false);
    }
  };

  const handleEndExam = () => {
    Alert.alert(
      'End exam?',
      "Your progress will be submitted and you'll see your results. You can't return to this exam.",
      [
        { text: 'Keep going', style: 'cancel' },
        {
          text: 'End exam',
          style: 'destructive',
          onPress: async () => {
            setIsEnding(true);
            try {
              await api.endExam(sessionId);
              navigation.replace('ExamResult', { sessionId });
            } catch {
              setIsEnding(false);
            }
          },
        },
      ]
    );
  };

  // Break screen
  if (showBreak) {
    const mins = Math.floor(breakSecondsRemaining / 60);
    const secs = breakSecondsRemaining % 60;
    return (
      <View style={[styles.container, { padding: layout.pagePaddingHorizontal }]}>
        <View style={styles.breakCard}>
          <Text style={styles.breakTitle}>10‑minute break</Text>
          <Text style={styles.breakSubtitle}>
            You've finished Reading & Writing. Take a short break before Math.
          </Text>
          <Text style={styles.breakTimer}>
            {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
          </Text>
          <TouchableOpacity style={styles.primaryButton} onPress={handleContinueToMath}>
            <Text style={styles.primaryButtonText}>Continue to Math section</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Loading
  if (loading && !question) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading…</Text>
      </View>
    );
  }

  // Error
  if (loadError && !question) {
    return (
      <View style={[styles.container, { padding: layout.pagePaddingHorizontal }]}>
        <Text style={styles.errorText}>{loadError}</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => loadQuestion()}>
          <Text style={styles.primaryButtonText}>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={handleEndExam}>
          <Text style={styles.secondaryButtonText}>End exam</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!question) return null;

  const choiceKeys: ChoiceKey[] = ['A', 'B', 'C', 'D'];
  const timerMins = moduleSecondsRemaining != null ? Math.floor(moduleSecondsRemaining / 60) : 0;
  const timerSecs = moduleSecondsRemaining != null ? moduleSecondsRemaining % 60 : 0;
  const timerLow = moduleSecondsRemaining != null && moduleSecondsRemaining <= 60;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[
        styles.scrollContent,
        {
          paddingHorizontal: layout.pagePaddingHorizontal,
          paddingTop: layout.pagePaddingVertical,
          paddingBottom: layout.scrollContentBottomPadding,
          maxWidth: layout.maxContentWidth,
          alignSelf: layout.maxContentWidth ? 'center' : undefined,
          width: layout.maxContentWidth ? '100%' : undefined,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.sectionLabel}>
          {currentSection} – Module {currentModule}
        </Text>
        <View style={styles.headerRight}>
          {currentSection === 'MATH' && (
            <TouchableOpacity
              style={styles.calculatorButton}
              onPress={() => setCalculatorVisible(true)}
            >
              <Ionicons name="calculator-outline" size={20} color={theme.colors.foreground} />
              <Text style={styles.calculatorButtonText}>Calculator</Text>
            </TouchableOpacity>
          )}
          {moduleSecondsRemaining != null && (
            <Text style={[styles.timer, timerLow && styles.timerLow]}>
              {timerMins}:{String(timerSecs).padStart(2, '0')}
            </Text>
          )}
          <Text style={styles.progressLabel}>
            Question {question.question_order} of {question.module_total}
          </Text>
        </View>
      </View>

      <Text style={styles.questionText}>{question.question_text}</Text>

      <View style={styles.choices}>
        {choiceKeys.map((key) => {
          const text = question.choices[key];
          if (!text) return null;
          const selected = selectedAnswer === key;
          return (
            <TouchableOpacity
              key={key}
              style={[styles.choice, selected && styles.choiceSelected]}
              onPress={() => setSelectedAnswer(key)}
            >
              <Text style={styles.choiceKey}>{key}.</Text>
              <Text style={styles.choiceText}>{text}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.endButton} onPress={handleEndExam} disabled={isEnding}>
          <Text style={styles.endButtonText}>End exam</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.primaryButton, !selectedAnswer && styles.primaryButtonDisabled]}
          onPress={handleSubmitAndNext}
          disabled={!selectedAnswer}
        >
          <Text style={styles.primaryButtonText}>Submit & next</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={calculatorVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCalculatorVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setCalculatorVisible(false)}
        >
          <View
            style={styles.modalContent}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Calculator</Text>
              <TouchableOpacity onPress={() => setCalculatorVisible(false)} hitSlop={12}>
                <Ionicons name="close" size={24} color={theme.colors.foreground} />
              </TouchableOpacity>
            </View>
            <Calculator />
          </View>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: { marginTop: 12, ...theme.typography.small, color: theme.colors.mutedForeground },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 8,
  },
  sectionLabel: { ...theme.typography.small, fontWeight: '600', color: theme.colors.foreground },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  timer: { fontSize: 16, fontVariant: ['tabular-nums'], color: theme.colors.mutedForeground },
  timerLow: { color: theme.colors.destructive, fontWeight: '600' },
  progressLabel: { ...theme.typography.small, color: theme.colors.mutedForeground },
  questionText: {
    fontSize: 17,
    lineHeight: 24,
    color: theme.colors.foreground,
    marginBottom: 20,
  },
  choices: { gap: 10, marginBottom: 24 },
  choice: {
    flexDirection: 'row',
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    padding: 14,
    alignItems: 'flex-start',
  },
  choiceSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.muted,
  },
  choiceKey: { ...theme.typography.body, fontWeight: '600', color: theme.colors.mutedForeground, marginRight: 8 },
  choiceText: { flex: 1, minWidth: 0, fontSize: 15, color: theme.colors.foreground },
  actions: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  endButton: { paddingVertical: 14, paddingHorizontal: 16 },
  endButtonText: { fontSize: 15, color: theme.colors.mutedForeground },
  primaryButton: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonDisabled: { backgroundColor: theme.colors.mutedForeground },
  primaryButtonText: { color: theme.colors.primaryForeground, ...theme.typography.bodyMedium },
  secondaryButton: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  secondaryButtonText: { ...theme.typography.body, color: theme.colors.foreground },
  errorText: { ...theme.typography.small, color: theme.colors.destructive, marginBottom: 16 },
  breakCard: { marginTop: 24, alignItems: 'center' },
  breakTitle: { ...theme.typography.title, marginBottom: 8, color: theme.colors.foreground },
  breakSubtitle: { ...theme.typography.small, color: theme.colors.mutedForeground, textAlign: 'center', marginBottom: 16 },
  breakTimer: { fontSize: 36, fontVariant: ['tabular-nums'], marginBottom: 24, color: theme.colors.examText },
  calculatorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  calculatorButtonText: { ...theme.typography.small, fontWeight: '500', color: theme.colors.foreground },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.xl,
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: { ...theme.typography.title2, color: theme.colors.foreground },
});
