import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, ChevronRight, Trophy, BarChart3, BookOpen, CheckCircle, XCircle } from 'lucide-react';
import { Layout } from '../components/Layout';
import { PageTitle, AnimatedCard } from '../components/AnimatedComponents';
import { Button } from '../components/ui/button';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { api } from '../api/client';
import type { ExamReviewResponse, ExamReviewQuestion } from '../api/client';

export function ExamReview() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [review, setReview] = useState<ExamReviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [filterSection, setFilterSection] = useState<string>('All');

  useEffect(() => {
    if (!sessionId) {
      setError('Missing session ID');
      setLoading(false);
      return;
    }
    api
      .getExamReview(sessionId)
      .then(setReview)
      .catch((err) => setError(err?.message ?? 'Failed to load exam review'))
      .finally(() => setLoading(false));
  }, [sessionId]);

  if (loading) {
    return (
      <Layout>
        <LoadingState variant="spinner" className="py-20" />
      </Layout>
    );
  }

  if (error || !review) {
    return (
      <Layout>
        <div className="max-w-md mx-auto py-12">
          <ErrorState
            message={error ?? 'Review not found'}
            onRetry={() => sessionId && api.getExamReview(sessionId).then(setReview).catch(() => {})}
          />
          <Button variant="outline" className="mt-4" onClick={() => navigate('/')}>
            Back to Dashboard
          </Button>
        </div>
      </Layout>
    );
  }

  const { result, analysis, questions } = review;
  const filteredQuestions =
    filterSection === 'All'
      ? questions
      : questions.filter((q) => q.section === filterSection);

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="mb-4">
            ← Back to Dashboard
          </Button>
          <PageTitle subtitle="Detailed analysis and question-by-question review">
            Exam Review
          </PageTitle>
        </div>

        {/* Detailed analysis */}
        <section className="mb-10" aria-labelledby="analysis-heading">
          <h2 id="analysis-heading" className="text-xl font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Detailed Analysis
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 mb-6">
            <AnimatedCard hover={false} className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-950">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="w-5 h-5 text-amber-600" />
                <span className="font-medium">Total Score</span>
              </div>
              <p className="text-4xl font-bold text-amber-600 dark:text-amber-400">
                {result.total_scaled}
              </p>
              <p className="text-sm text-muted-foreground">out of 1600</p>
            </AnimatedCard>
            <AnimatedCard hover={false}>
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="font-medium">Correct answers</span>
              </div>
              <p className="text-4xl font-bold">
                {analysis.total_correct} / {analysis.total_questions}
              </p>
              <p className="text-sm text-muted-foreground">
                {analysis.total_questions > 0
                  ? `${Math.round((analysis.total_correct / analysis.total_questions) * 100)}%`
                  : ''}
              </p>
            </AnimatedCard>
          </div>

          <AnimatedCard hover={false} className="mb-6">
            <h3 className="font-medium mb-3">Section scores</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Reading & Writing</p>
                <p className="text-2xl font-bold">{result.rw_scaled}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Math</p>
                <p className="text-2xl font-bold">{result.math_scaled}</p>
              </div>
            </div>
          </AnimatedCard>

          <AnimatedCard hover={false}>
            <h3 className="font-medium mb-3">By module</h3>
            <ul className="space-y-2">
              {analysis.by_module.map((m, i) => (
                <li
                  key={`${m.section}-${m.module}`}
                  className="flex justify-between items-center py-2 border-b border-border last:border-0"
                >
                  <span className="font-medium">
                    {m.section} Module {m.module}
                  </span>
                  <span>
                    {m.correct} / {m.total} correct
                  </span>
                </li>
              ))}
            </ul>
          </AnimatedCard>
        </section>

        {/* Review all questions */}
        <section className="mb-8" aria-labelledby="review-heading">
          <h2 id="review-heading" className="text-xl font-semibold mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Review all {questions.length} questions
          </h2>

          <div className="flex flex-wrap gap-2 mb-4">
            {['All', 'RW', 'MATH'].map((s) => (
              <Button
                key={s}
                variant={filterSection === s ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterSection(s)}
              >
                {s === 'All' ? 'All' : s === 'RW' ? 'Reading & Writing' : 'Math'}
              </Button>
            ))}
          </div>

          <div className="space-y-2">
            <AnimatePresence>
              {filteredQuestions.map((q) => (
                <QuestionReviewCard
                  key={q.question_id}
                  question={q}
                  expanded={expandedIndex === q.index}
                  onToggle={() => setExpandedIndex(expandedIndex === q.index ? null : q.index)}
                />
              ))}
            </AnimatePresence>
          </div>
        </section>

        <Button variant="outline" onClick={() => navigate('/')}>
          Back to Dashboard
        </Button>
      </div>
    </Layout>
  );
}

function QuestionReviewCard({
  question,
  expanded,
  onToggle,
}: {
  question: ExamReviewQuestion;
  expanded: boolean;
  onToggle: () => void;
}) {
  const choices = question.choices || {};
  const letters = ['A', 'B', 'C', 'D'].filter((l) => choices[l] != null);

  return (
    <motion.div
      layout
      initial={false}
      className="border border-border rounded-lg overflow-hidden bg-card"
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/50 transition-colors"
        aria-expanded={expanded}
      >
        {expanded ? (
          <ChevronDown className="w-5 h-5 flex-shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-5 h-5 flex-shrink-0 text-muted-foreground" />
        )}
        <span className="font-mono text-sm text-muted-foreground w-10">
          #{question.index}
        </span>
        <span className="text-xs px-2 py-0.5 rounded bg-muted">
          {question.section} M{question.module_number}
        </span>
        {question.is_correct ? (
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" aria-label="Correct" />
        ) : (
          <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" aria-label="Incorrect" />
        )}
        <span className="flex-1 truncate text-sm">
          {question.question_text.slice(0, 80)}
          {question.question_text.length > 80 ? '…' : ''}
        </span>
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-border"
          >
            <div className="p-4 pt-3 space-y-4">
              <div>
                <p className="font-medium text-sm text-muted-foreground mb-1">Question</p>
                <p className="whitespace-pre-wrap">{question.question_text}</p>
              </div>
              <div>
                <p className="font-medium text-sm text-muted-foreground mb-2">Choices</p>
                <ul className="space-y-2">
                  {letters.map((letter) => {
                    const isCorrect = question.correct_answer === letter;
                    const isUser = question.user_answer === letter;
                    return (
                      <li
                        key={letter}
                        className={`p-3 rounded-lg border ${
                          isCorrect
                            ? 'border-green-500 bg-green-50 dark:bg-green-950'
                            : isUser && !question.is_correct
                              ? 'border-red-500 bg-red-50 dark:bg-red-950'
                              : 'border-border bg-muted/30'
                        }`}
                      >
                        <span className="font-medium">{letter}.</span>{' '}
                        {choices[letter]}
                        {isCorrect && (
                          <span className="ml-2 text-sm text-green-600 dark:text-green-400 font-medium">
                            (correct)
                          </span>
                        )}
                        {isUser && !question.is_correct && (
                          <span className="ml-2 text-sm text-red-600 dark:text-red-400 font-medium">
                            (your answer)
                          </span>
                        )}
                        {isUser && question.is_correct && (
                          <span className="ml-2 text-sm text-green-600 dark:text-green-400 font-medium">
                            (your answer)
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
              {question.user_answer != null && (
                <p className="text-sm text-muted-foreground">
                  Your answer: <strong>{question.user_answer}</strong>
                  {!question.is_correct && (
                    <> · Correct answer: <strong>{question.correct_answer}</strong></>
                  )}
                </p>
              )}
              {question.explanation && (
                <div>
                  <p className="font-medium text-sm text-muted-foreground mb-1">Explanation</p>
                  <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950 text-sm whitespace-pre-wrap">
                    {question.explanation}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
