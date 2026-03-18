import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { api, ApiError } from '../api/client';
import type { ExamReviewResponse, ExamReviewQuestion } from '../api/client';

/** Used in both Exam stack and History stack; both pass { sessionId: string }. */
type Props = {
  route: { params: { sessionId: string } };
  navigation: any;
};

export function ExamReviewScreen({ route, navigation }: Props) {
  const { sessionId } = route.params;
  const [review, setReview] = useState<ExamReviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setReview(null);
    api
      .getExamReview(sessionId)
      .then(setReview)
      .catch((e: unknown) => setError(e instanceof ApiError ? e.message : 'Failed to load review'))
      .finally(() => setLoading(false));
  }, [sessionId]);

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading review…</Text>
      </View>
    );
  }

  if (error || !review) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error ?? 'Review not found'}</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.goBack()}>
          <Text style={styles.primaryButtonText}>Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { result, analysis, questions } = review;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
      <View style={styles.summary}>
        <Text style={styles.summaryTitle}>Exam review</Text>
        <Text style={styles.summaryScore}>Total: {result.total_scaled ?? '—'} / 1600</Text>
        <Text style={styles.summaryCorrect}>
          {analysis.total_correct} of {analysis.total_questions} correct
        </Text>
      </View>

      <Text style={styles.questionsTitle}>Questions</Text>
      {questions.map((q, index) => (
        <QuestionItem
          key={q.question_id}
          question={q}
          index={index}
          expanded={expandedIndex === index}
          onToggle={() => setExpandedIndex(expandedIndex === index ? null : index)}
        />
      ))}
    </ScrollView>
  );
}

function QuestionItem({
  question,
  index,
  expanded,
  onToggle,
}: {
  question: ExamReviewQuestion;
  index: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const choiceKeys = ['A', 'B', 'C', 'D'] as const;
  return (
    <View style={styles.questionCard}>
      <TouchableOpacity style={styles.questionHeader} onPress={onToggle} activeOpacity={0.8}>
        <Text style={styles.questionIndex}>Q{index + 1}</Text>
        <View style={styles.questionHeaderRight}>
          <Text style={[styles.questionBadge, question.is_correct ? styles.badgeCorrect : styles.badgeWrong]}>
            {question.is_correct ? 'Correct' : 'Incorrect'}
          </Text>
          <Text style={styles.questionSection}>{question.section}</Text>
        </View>
      </TouchableOpacity>
      {expanded && (
        <View style={styles.questionBody}>
          <Text style={styles.questionText}>{question.question_text}</Text>
          <View style={styles.choices}>
            {choiceKeys.map((key) => {
              const text = question.choices[key];
              if (!text) return null;
              const isCorrect = question.correct_answer === key;
              const isUserAnswer = question.user_answer === key;
              return (
                <View
                  key={key}
                  style={[
                    styles.choiceRow,
                    isCorrect && styles.choiceCorrect,
                    isUserAnswer && !question.is_correct && styles.choiceWrong,
                  ]}
                >
                  <Text style={styles.choiceKey}>{key}.</Text>
                  <Text style={styles.choiceText}>{text}</Text>
                  {isCorrect && <Text style={styles.correctLabel}>Correct</Text>}
                  {isUserAnswer && !question.is_correct && key === question.user_answer && (
                    <Text style={styles.wrongLabel}>Your answer</Text>
                  )}
                </View>
              );
            })}
          </View>
          {question.explanation ? (
            <View style={styles.explanationBox}>
              <Text style={styles.explanationLabel}>Explanation</Text>
              <Text style={styles.explanationText}>{question.explanation}</Text>
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 24 },
  centered: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#64748b' },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 32 },
  summary: { marginBottom: 24 },
  summaryTitle: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  summaryScore: { fontSize: 16, color: '#1e293b' },
  summaryCorrect: { fontSize: 14, color: '#64748b' },
  questionsTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  questionCard: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, marginBottom: 10, overflow: 'hidden' },
  questionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
  questionIndex: { fontSize: 15, fontWeight: '600' },
  questionHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  questionBadge: { fontSize: 12, fontWeight: '600', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  badgeCorrect: { backgroundColor: '#dcfce7', color: '#16a34a' },
  badgeWrong: { backgroundColor: '#fee2e2', color: '#dc2626' },
  questionSection: { fontSize: 12, color: '#64748b' },
  questionBody: { padding: 14, paddingTop: 0, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  questionText: { fontSize: 15, lineHeight: 22, color: '#1e293b', marginBottom: 12 },
  choices: { gap: 6, marginBottom: 12 },
  choiceRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', paddingVertical: 4 },
  choiceKey: { fontSize: 14, fontWeight: '600', marginRight: 6 },
  choiceText: { flex: 1, fontSize: 14, color: '#475569' },
  choiceCorrect: { backgroundColor: '#f0fdf4' },
  choiceWrong: { backgroundColor: '#fef2f2' },
  correctLabel: { fontSize: 11, color: '#16a34a', marginLeft: 4 },
  wrongLabel: { fontSize: 11, color: '#dc2626', marginLeft: 4 },
  explanationBox: { backgroundColor: '#f8fafc', padding: 12, borderRadius: 8 },
  explanationLabel: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  explanationText: { fontSize: 14, color: '#475569', lineHeight: 20 },
  errorText: { fontSize: 14, color: '#dc2626', marginBottom: 16 },
  primaryButton: { backgroundColor: '#2563eb', borderRadius: 8, paddingVertical: 14, alignItems: 'center' },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
