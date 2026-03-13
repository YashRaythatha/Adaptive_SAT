import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, CheckCircle, XCircle } from 'lucide-react';
import { Layout } from '../components/Layout';
import { PageTitle, Spinner } from '../components/AnimatedComponents';
import { QuestionCard } from '../components/QuestionCard';
import { ChoiceList } from '../components/ChoiceList';
import { Button } from '../components/ui/button';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ErrorState } from '../components/ErrorState';
import { useSession } from '../context/SessionContext';
import { api } from '../api/client';
import type { Question } from '../types';

export function PracticeSession() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { setSessionType, clearSession } = useSession();
  
  const [question, setQuestion] = useState<Question | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<'A' | 'B' | 'C' | 'D' | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [correctAnswer, setCorrectAnswer] = useState<'A' | 'B' | 'C' | 'D' | null>(null);
  const [explanation, setExplanation] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [endDialogOpen, setEndDialogOpen] = useState(false);
  const [score, setScore] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [showingSummary, setShowingSummary] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    setSessionType('practice');
    loadQuestion();

    return () => clearSession();
  }, []);

  const loadQuestion = async () => {
    if (!sessionId) return;

    setLoading(true);
    setLoadError(null);
    try {
      const q = await api.getNextPracticeQuestion(sessionId);
      if (!q) {
        setShowingSummary(true);
        setQuestion(null);
      } else {
        setQuestion(q);
        setTotalQuestions((prev) => prev + 1);
        setSelectedAnswer(null);
        setSubmitted(false);
        setIsCorrect(false);
        setCorrectAnswer(null);
        setExplanation('');
      }
    } catch (error) {
      console.error('Failed to load question:', error);
      setLoadError('Failed to load this question. You can try again or end the session.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedAnswer || !question || !sessionId) return;

    try {
      const result = await api.submitPracticeAnswer(sessionId, question.question_id, selectedAnswer);
      setSubmitted(true);
      setIsCorrect(result.is_correct);
      setCorrectAnswer(result.correct_answer);
      setExplanation(result.explanation || '');
      if (result.is_correct) {
        setScore((prev) => prev + 1);
      }
    } catch (error) {
      console.error('Failed to submit answer:', error);
    }
  };

  const handleNext = () => {
    setTimeout(loadQuestion, 100);
  };

  const handleEndSession = async () => {
    if (!sessionId) return;

    try {
      await api.endPractice(sessionId);
      clearSession();
      navigate('/');
    } catch (error) {
      console.error('Failed to end session:', error);
    }
  };

  if (showingSummary) {
    return (
      <Layout>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-2xl mx-auto text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.2 }}
            className="mb-6"
          >
            <CheckCircle className="w-20 h-20 text-green-500 mx-auto" />
          </motion.div>

          <PageTitle>Practice Complete! 🎉</PageTitle>

          <div className="bg-card border border-border rounded-lg p-8 mb-6">
            <div className="mb-6">
              <p className="text-5xl font-bold mb-2">
                {totalQuestions ? Math.round((score / totalQuestions) * 100) : 0}%
              </p>
              <p className="text-muted-foreground">
                {score} out of {totalQuestions} correct
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                <p className="font-medium text-green-600 dark:text-green-400">Correct</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{score}</p>
              </div>
              <div className="p-4 bg-red-50 dark:bg-red-950 rounded-lg">
                <p className="font-medium text-red-600 dark:text-red-400">Incorrect</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{totalQuestions - score}</p>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <Button onClick={() => navigate('/practice')} variant="outline" className="flex-1">
              Practice Again
            </Button>
            <Button onClick={() => navigate('/')} className="flex-1">
              Back to Dashboard
            </Button>
          </div>
        </motion.div>
      </Layout>
    );
  }

  if (loadError && !loading) {
    return (
      <Layout>
        <div className="max-w-md mx-auto py-12 space-y-4">
          <ErrorState message={loadError} onRetry={loadQuestion} />
          <div className="flex justify-center">
            <Button variant="outline" onClick={handleEndSession}>
              End session
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  if (loading || !question) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20">
          <Spinner />
        </div>
      </Layout>
    );
  }

  const choices = [
    { label: 'A' as const, text: question.choices.A },
    { label: 'B' as const, text: question.choices.B },
    { label: 'C' as const, text: question.choices.C },
    { label: 'D' as const, text: question.choices.D },
  ];

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        {/* Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">
              Question {totalQuestions}
            </span>
            <span className="text-sm font-medium">
              Score: {score}/{totalQuestions}
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${totalQuestions ? Math.min(100, totalQuestions * 10) : 0}%` }}
              className="h-full bg-primary"
            />
          </div>
        </div>

        <QuestionCard difficulty={question.difficulty}>
          <div className="mb-6">
            <p className="text-lg whitespace-pre-wrap">{question.question_text}</p>
          </div>

          <ChoiceList
            choices={choices}
            selectedChoice={selectedAnswer}
            onSelect={setSelectedAnswer}
            correctAnswer={correctAnswer || undefined}
            showResult={submitted}
            disabled={submitted}
          />

          {submitted && explanation && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-6 p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg"
            >
              <p className="font-medium mb-2 flex items-center gap-2">
                {isCorrect ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500" />
                )}
                Explanation
              </p>
              <p className="text-sm text-muted-foreground">{explanation}</p>
            </motion.div>
          )}

          <div className="mt-6 flex gap-3">
            <Button
              variant="outline"
              onClick={() => setEndDialogOpen(true)}
              className="flex-shrink-0"
            >
              End Session
            </Button>

            {!submitted ? (
              <Button
                onClick={handleSubmit}
                disabled={!selectedAnswer}
                className="flex-1"
              >
                Submit Answer
              </Button>
            ) : (
              <Button onClick={handleNext} className="flex-1">
                Next Question
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </QuestionCard>
      </div>

      <ConfirmDialog
        open={endDialogOpen}
        onClose={() => setEndDialogOpen(false)}
        onConfirm={handleEndSession}
        title="End practice session?"
        message="Your progress will be saved. You can start a new practice session anytime."
        confirmLabel="End Session"
        cancelLabel="Keep Practicing"
      />
    </Layout>
  );
}
