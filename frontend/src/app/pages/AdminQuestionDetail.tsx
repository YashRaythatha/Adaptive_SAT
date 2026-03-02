import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router';
import { ArrowLeft, ChevronLeft, ChevronRight, CheckCircle, XCircle } from 'lucide-react';
import { Layout } from '../components/Layout';
import { PageTitle, Spinner, ErrorMessage, AnimatedCard } from '../components/AnimatedComponents';
import { Button } from '../components/ui/button';
import { adminApi, hasAdminKey } from '../api/admin';
import type { AdminQuestion, AdminQuestionDetail } from '../types';

interface LocationState {
  questions?: AdminQuestion[];
}

export function AdminQuestionDetail() {
  const { questionId } = useParams<{ questionId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;
  const questions = state?.questions ?? [];

  const [detail, setDetail] = useState<AdminQuestionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    if (!hasAdminKey()) {
      navigate('/admin', { replace: true });
      return;
    }
    if (!questionId) {
      setError('Missing question ID');
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError('');
    adminApi
      .getQuestionDetail(questionId)
      .then((data) => {
        if (!cancelled) {
          setDetail(data);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err?.message ?? 'Failed to load question.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [questionId, navigate]);

  const currentIndex = detail ? questions.findIndex((q) => q.id === detail.id) : -1;
  const prevQuestion = currentIndex > 0 ? questions[currentIndex - 1] : null;
  const nextQuestion =
    currentIndex >= 0 && currentIndex < questions.length - 1 ? questions[currentIndex + 1] : null;

  const goToQuestion = (id: string) => {
    navigate(`/admin/questions/${id}`, { state: { questions } });
  };

  const handleSetStatus = async (status: 'APPROVED' | 'REJECTED') => {
    if (!detail) return;
    setUpdatingStatus(true);
    try {
      await adminApi.setQuestionStatus(detail.id, status);
      setDetail((prev) => (prev ? { ...prev, quality_status: status } : null));
      if (nextQuestion) {
        goToQuestion(nextQuestion.id);
      } else {
        navigate('/admin');
      }
    } catch {
      setError('Failed to update status.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (!hasAdminKey()) {
    return null;
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/admin')}
            className="gap-2"
            aria-label="Back to question list"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to list
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Spinner />
          </div>
        ) : error ? (
          <AnimatedCard>
            <ErrorMessage>{error}</ErrorMessage>
            <Button variant="outline" className="mt-4" onClick={() => navigate('/admin')}>
              Back to list
            </Button>
          </AnimatedCard>
        ) : detail ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <PageTitle
                subtitle={`${detail.section} · Difficulty ${detail.difficulty_llm} · ${detail.quality_status}`}
              >
                Question
              </PageTitle>
              <div className="flex gap-2">
                {prevQuestion ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToQuestion(prevQuestion.id)}
                    aria-label="Previous question"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Previous
                  </Button>
                ) : null}
                {nextQuestion ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToQuestion(nextQuestion.id)}
                    aria-label="Next question"
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                ) : null}
              </div>
            </div>

            <AnimatedCard hover={false} className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Question</h3>
                <div className="p-4 bg-muted rounded-lg border border-border">
                  <p className="whitespace-pre-wrap">{detail.question_text}</p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Choices</h3>
                <div className="space-y-2">
                  {(['A', 'B', 'C', 'D'] as const).map((letter) => {
                    const isCorrect = detail.correct_answer === letter;
                    return (
                      <div
                        key={letter}
                        className={`p-3 rounded-lg border ${
                          isCorrect
                            ? 'border-green-500 bg-green-50 dark:bg-green-950'
                            : 'border-border bg-muted/50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{letter}.</span>
                          <span>{detail.choices[letter]}</span>
                          {isCorrect && (
                            <span className="ml-auto text-sm text-green-600 dark:text-green-400 font-medium">
                              (correct)
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {detail.explanation && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Explanation</h3>
                  <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-border text-sm">
                    <p className="whitespace-pre-wrap">{detail.explanation}</p>
                  </div>
                </div>
              )}

              {detail.quality_status === 'DRAFT' && (
                <div className="flex flex-wrap gap-3 pt-4 border-t border-border">
                  <Button
                    onClick={() => handleSetStatus('APPROVED')}
                    disabled={updatingStatus}
                    className="gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Approve
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleSetStatus('REJECTED')}
                    disabled={updatingStatus}
                    className="text-red-600 hover:text-red-700 gap-2"
                  >
                    <XCircle className="w-4 h-4" />
                    Reject
                  </Button>
                </div>
              )}
            </AnimatedCard>

            {questions.length > 0 && (
              <p className="text-sm text-muted-foreground mt-4">
                {currentIndex >= 0
                  ? `Question ${currentIndex + 1} of ${questions.length} on this page`
                  : 'Opened from list'}
              </p>
            )}
          </>
        ) : null}
      </div>
    </Layout>
  );
}
