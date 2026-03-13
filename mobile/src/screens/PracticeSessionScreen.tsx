import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { PracticeStackParamList } from '../navigation/types';
import { api, ApiError } from '../api/client';
import { theme } from '../theme';
import { useLayout } from '../hooks/useLayout';

type Props = NativeStackScreenProps<PracticeStackParamList, 'PracticeSession'>;

type ChoiceKey = 'A' | 'B' | 'C' | 'D';

interface QuestionData {
  question_id: string;
  question_text: string;
  choices: Record<ChoiceKey, string>;
  difficulty: number;
}

export function PracticeSessionScreen({ route, navigation }: Props) {
  const layout = useLayout();
  const { sessionId } = route.params;
  const [question, setQuestion] = useState<QuestionData | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<ChoiceKey | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [correctAnswer, setCorrectAnswer] = useState<ChoiceKey | null>(null);
  const [explanation, setExplanation] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [questionCount, setQuestionCount] = useState(0);
  const [score, setScore] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadQuestion = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const q = await api.getNextPracticeQuestion(sessionId);
      if (!q) {
        try {
          await api.endPractice(sessionId);
        } catch {
          // ignore
        }
        setShowSummary(true);
        setQuestion(null);
      } else {
        setQuestion({
          question_id: q.question_id,
          question_text: q.question_text,
          choices: q.choices,
          difficulty: q.difficulty,
        });
        setQuestionCount((prev) => prev + 1);
        setSelectedAnswer(null);
        setSubmitted(false);
        setCorrectAnswer(null);
        setExplanation('');
      }
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        try {
          await api.endPractice(sessionId);
        } catch {
          // ignore
        }
        setShowSummary(true);
        setQuestion(null);
      } else {
        setLoadError(e instanceof ApiError ? e.message : 'Failed to load question');
      }
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    loadQuestion();
  }, [loadQuestion]);

  const handleSubmit = async () => {
    if (!selectedAnswer || !question) return;
    setSubmitting(true);
    try {
      const result = await api.submitPracticeAnswer(sessionId, question.question_id, selectedAnswer);
      setSubmitted(true);
      setIsCorrect(result.is_correct);
      setCorrectAnswer(result.correct_answer);
      setExplanation(result.explanation || '');
      if (result.is_correct) setScore((prev) => prev + 1);
    } catch (e) {
      setLoadError(e instanceof ApiError ? e.message : 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = () => {
    loadQuestion();
  };

  const handleEndSession = () => {
    Alert.alert(
      'End practice?',
      'Your progress will be saved. You can start a new session anytime.',
      [
        { text: 'Keep practicing', style: 'cancel' },
        {
          text: 'End session',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.endPractice(sessionId);
            } catch {
              // ignore
            }
            navigation.getParent()?.navigate('Dashboard');
          },
        },
      ]
    );
  };

  // Summary screen
  if (showSummary) {
    const pct = questionCount > 0 ? Math.round((score / questionCount) * 100) : 0;
    return (
      <View style={[styles.container, { padding: layout.pagePaddingHorizontal }]}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Practice complete</Text>
          <Text style={styles.summaryScore}>{pct}%</Text>
          <Text style={styles.summarySubtext}>
            {score} out of {questionCount} correct
          </Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryBoxLabel}>Correct</Text>
              <Text style={[styles.summaryBoxValue, { color: theme.colors.practiceText }]}>{score}</Text>
            </View>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryBoxLabel}>Incorrect</Text>
              <Text style={[styles.summaryBoxValue, { color: theme.colors.destructive }]}>
                {questionCount - score}
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.popToTop()}>
            <Text style={styles.primaryButtonText}>Back to Practice</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.getParent()?.navigate('Dashboard')}
          >
            <Text style={styles.secondaryButtonText}>Dashboard</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Error state
  if (loadError && !loading) {
    return (
      <View style={[styles.container, { padding: layout.pagePaddingHorizontal }]}>
        <Text style={styles.errorText}>{loadError}</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => loadQuestion()}>
          <Text style={styles.primaryButtonText}>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={handleEndSession}>
          <Text style={styles.secondaryButtonText}>End session</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Loading
  if (loading || !question) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading question…</Text>
      </View>
    );
  }

  const choiceKeys: ChoiceKey[] = ['A', 'B', 'C', 'D'];

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
      <View style={styles.progressRow}>
        <Text style={styles.progressText}>Question {questionCount}</Text>
        <Text style={styles.progressText}>
          Score: {score}/{questionCount}
        </Text>
      </View>

      <Text style={styles.questionText}>{question.question_text}</Text>

      <View style={styles.choices}>
        {choiceKeys.map((key) => {
          const text = question.choices[key];
          if (!text) return null;
          const selected = selectedAnswer === key;
          const showCorrect = submitted && correctAnswer === key;
          const showWrong = submitted && selected && !isCorrect && key === selectedAnswer;
          return (
            <TouchableOpacity
              key={key}
              style={[
                styles.choice,
                selected && !submitted && styles.choiceSelected,
                showCorrect && styles.choiceCorrect,
                showWrong && styles.choiceWrong,
                submitted && styles.choiceDisabled,
              ]}
              onPress={() => !submitted && setSelectedAnswer(key)}
              disabled={submitted}
            >
              <Text style={styles.choiceKey}>{key}.</Text>
              <Text style={styles.choiceText}>{text}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {submitted && explanation ? (
        <View style={[styles.explanationBox, isCorrect ? styles.explanationCorrect : styles.explanationWrong]}>
          <Text style={styles.explanationLabel}>{isCorrect ? 'Correct' : 'Incorrect'}</Text>
          <Text style={styles.explanationText}>{explanation}</Text>
        </View>
      ) : null}

      <View style={styles.actions}>
        <TouchableOpacity style={styles.endButton} onPress={handleEndSession}>
          <Text style={styles.endButtonText}>End session</Text>
        </TouchableOpacity>
        {!submitted ? (
          <TouchableOpacity
            style={[styles.primaryButton, (!selectedAnswer || submitting) && styles.primaryButtonDisabled]}
            onPress={handleSubmit}
            disabled={!selectedAnswer || submitting}
          >
            {submitting ? (
              <ActivityIndicator color={theme.colors.primaryForeground} size="small" />
            ) : (
              <Text style={styles.primaryButtonText}>Submit</Text>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.primaryButton} onPress={handleNext}>
            <Text style={styles.primaryButtonText}>Next question</Text>
          </TouchableOpacity>
        )}
      </View>
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
  loadingText: {
    marginTop: 12,
    ...theme.typography.small,
    color: theme.colors.mutedForeground,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  progressText: {
    ...theme.typography.small,
    color: theme.colors.mutedForeground,
  },
  questionText: {
    fontSize: 17,
    lineHeight: 24,
    color: theme.colors.foreground,
    marginBottom: 20,
  },
  choices: {
    gap: 10,
    marginBottom: 20,
  },
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
  choiceCorrect: {
    borderColor: theme.colors.practiceAccent,
    backgroundColor: theme.colors.practiceCardBg,
  },
  choiceWrong: {
    borderColor: theme.colors.destructive,
    backgroundColor: '#fef2f2',
  },
  choiceDisabled: {
    opacity: 0.9,
  },
  choiceKey: {
    ...theme.typography.body,
    fontWeight: '600',
    color: theme.colors.mutedForeground,
    marginRight: 8,
  },
  choiceText: {
    flex: 1,
    minWidth: 0,
    fontSize: 15,
    color: theme.colors.foreground,
  },
  explanationBox: {
    padding: 14,
    borderRadius: theme.radius.lg,
    marginBottom: 20,
  },
  explanationCorrect: {
    backgroundColor: theme.colors.practiceCardBg,
    borderWidth: 1,
    borderColor: theme.colors.practiceCardBorder,
  },
  explanationWrong: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: theme.colors.destructive,
  },
  explanationLabel: {
    ...theme.typography.small,
    fontWeight: '600',
    marginBottom: 4,
  },
  explanationText: {
    ...theme.typography.small,
    color: theme.colors.mutedForeground,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  endButton: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  endButtonText: {
    fontSize: 15,
    color: theme.colors.mutedForeground,
  },
  primaryButton: {
    flex: 1,
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
  secondaryButton: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  secondaryButtonText: {
    ...theme.typography.body,
    color: theme.colors.foreground,
  },
  errorText: {
    ...theme.typography.small,
    color: theme.colors.destructive,
    marginBottom: 16,
  },
  summaryCard: {
    marginTop: 24,
  },
  summaryTitle: {
    ...theme.typography.title,
    marginBottom: 8,
    textAlign: 'center',
    color: theme.colors.foreground,
  },
  summaryScore: {
    fontSize: 42,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
    color: theme.colors.foreground,
  },
  summarySubtext: {
    ...theme.typography.body,
    color: theme.colors.mutedForeground,
    textAlign: 'center',
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  summaryBox: {
    flex: 1,
    padding: 16,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.muted,
    alignItems: 'center',
  },
  summaryBoxLabel: {
    ...theme.typography.caption,
    color: theme.colors.mutedForeground,
    marginBottom: 4,
  },
  summaryBoxValue: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.foreground,
  },
});
