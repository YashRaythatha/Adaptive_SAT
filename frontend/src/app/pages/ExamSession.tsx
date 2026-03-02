import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { Trophy, TrendingUp, Target, Coffee } from 'lucide-react';
import { Layout } from '../components/Layout';
import { PageTitle, AnimatedCard } from '../components/AnimatedComponents';
import { QuestionCard } from '../components/QuestionCard';
import { ChoiceList } from '../components/ChoiceList';
import { Button } from '../components/ui/button';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ProgressBar } from '../components/ProgressBar';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { useSession } from '../context/SessionContext';
import { api } from '../api/client';
import type { Question, ExamResult } from '../types';

export function ExamSession() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { setSessionType, setExamSessionId, clearSession } = useSession();
  
  const [question, setQuestion] = useState<Question | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<'A' | 'B' | 'C' | 'D' | null>(null);
  const [currentSection, setCurrentSection] = useState<'RW' | 'MATH'>('RW');
  const [currentModule, setCurrentModule] = useState(1);
  const [questionOrder, setQuestionOrder] = useState(0);
  const [moduleTotal, setModuleTotal] = useState(27);
  const [loading, setLoading] = useState(true);
  const [endDialogOpen, setEndDialogOpen] = useState(false);
  const [result, setResult] = useState<ExamResult | null>(null);
  const [isEnding, setIsEnding] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [weakAreas, setWeakAreas] = useState<Array<{ skill_id: string; skill_name: string; section: string; score_from_exam: number }>>([]);
  const [weakAreasLoading, setWeakAreasLoading] = useState(false);
  const [showBreakScreen, setShowBreakScreen] = useState(false);
  const [breakEndsAt, setBreakEndsAt] = useState<string | null>(null);
  const [breakSecondsRemaining, setBreakSecondsRemaining] = useState<number | null>(null);

  useEffect(() => {
    setSessionType('exam');
    setExamSessionId(sessionId || null);
    loadQuestion();

    return () => clearSession();
  }, []);

  const loadQuestion = async () => {
    if (!sessionId) return;

    setLoading(true);
    setLoadError(null);
    try {
      let q = await api.getNextExamQuestion(sessionId);
      if (!q) {
        const advance = await api.advanceExam(sessionId);
        if (advance.status === 'ENDED') {
          const examResult = await api.getExamResult(sessionId);
          setResult(examResult);
          clearSession();
          setLoading(false);
          return;
        }
        if (advance.status === 'BREAK') {
          setShowBreakScreen(true);
          setBreakEndsAt(advance.break_ends_at ?? null);
          setBreakSecondsRemaining(advance.break_duration_sec ?? 10 * 60);
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
          correct_answer: q.correct_answer,
          difficulty: q.difficulty,
          section: q.section,
          skill_id: q.skill_id,
        });
        setQuestionOrder(q.question_order);
        setModuleTotal(q.module_total);
        setSelectedAnswer(null);
      }
    } catch (error) {
      console.error('Failed to load question:', error);
      setLoadError('Failed to load this question. You can try again or end the exam.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAndNext = async () => {
    if (!selectedAnswer || !question || !sessionId) return;

    try {
      await api.submitExamAnswer(sessionId, question.question_id, selectedAnswer);
      setTimeout(loadQuestion, 100);
    } catch (error) {
      console.error('Failed to submit answer:', error);
    }
  };

  const handleEndExam = async () => {
    if (!sessionId) return;

    setIsEnding(true);
    try {
      const examResult = await api.endExam(sessionId);
      setResult(examResult);
      clearSession();
    } catch (error) {
      console.error('Failed to end exam:', error);
      setIsEnding(false);
    }
  };

  const questionsPerModuleNum = 27;
  const totalProgress =
    (currentSection === 'RW' ? 0 : questionsPerModuleNum * 2) +
    (currentModule - 1) * questionsPerModuleNum +
    questionOrder;
  const totalQuestions = questionsPerModuleNum * 4; // 2 sections × 2 modules

  // Break countdown: update seconds remaining every second
  useEffect(() => {
    if (!showBreakScreen || breakEndsAt == null) return;
    const endsAt = new Date(breakEndsAt).getTime();
    const tick = () => {
      const rem = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setBreakSecondsRemaining(rem);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [showBreakScreen, breakEndsAt]);

  const handleContinueToMath = async () => {
    if (!sessionId) return;
    setLoading(true);
    setShowBreakScreen(false);
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

  // When we have a result, fetch weak areas from latest exam for "practice these" recommendations
  useEffect(() => {
    if (!result) return;
    let cancelled = false;
    setWeakAreasLoading(true);
    api
      .getWeakAreas(5)
      .then((list) => {
        if (!cancelled) setWeakAreas(list);
      })
      .catch(() => {
        if (!cancelled) setWeakAreas([]);
      })
      .finally(() => {
        if (!cancelled) setWeakAreasLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [result]);

  if (result) {
    return (
      <Layout>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-3xl mx-auto text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.2 }}
            className="mb-6"
          >
            <Trophy className="w-24 h-24 text-amber-500 mx-auto" />
          </motion.div>

          <PageTitle>Exam Complete! 🎉</PageTitle>

          <AnimatedCard delay={0.3} hover={false} className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-950 mb-6">
            <div className="mb-6">
              <p className="text-6xl font-bold text-amber-600 dark:text-amber-400 mb-2">
                {result.total_score}
              </p>
              <p className="text-muted-foreground">Total Score (out of 1600)</p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-white dark:bg-gray-900 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Math</p>
                <p className="text-3xl font-bold">{result.math_score}</p>
              </div>
              <div className="p-4 bg-white dark:bg-gray-900 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Reading & Writing</p>
                <p className="text-3xl font-bold">{result.rw_score}</p>
              </div>
            </div>

            <div className="text-sm text-muted-foreground">
              {result.correct_answers} out of {result.total_questions} questions correct
              {result.total_questions > 0
                ? ` (${Math.round((result.correct_answers / result.total_questions) * 100)}%)`
                : ''}
            </div>
          </AnimatedCard>

          <AnimatedCard delay={0.4} hover={false}>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-medium">Skills Breakdown</h3>
            </div>

            <div className="space-y-4">
              {result.skills_breakdown.map((skill, index) => (
                <motion.div
                  key={skill.skill_id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.5 + index * 0.1 }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{skill.skill_name}</span>
                    <span className="text-sm text-muted-foreground">
                      {skill.correct}/{skill.total}
                    </span>
                  </div>
                  <ProgressBar value={(skill.correct / skill.total) * 100} />
                </motion.div>
              ))}
            </div>
          </AnimatedCard>

          {/* Weak areas from this exam — recommend practice */}
          {(weakAreasLoading || weakAreas.length > 0) && (
            <AnimatedCard delay={0.45} hover={false}>
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-medium">Weak areas to practice</h3>
              </div>
              {weakAreasLoading ? (
                <LoadingState variant="spinner" className="py-6" />
              ) : (
                <>
                  <p className="text-sm text-muted-foreground mb-4">
                    These skills had the lowest performance on your exam. Practice them to improve your score next time.
                  </p>
                  <ul className="space-y-2 mb-6">
                    {weakAreas.map((area, index) => (
                      <li key={area.skill_id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                        <span className="font-medium">{area.skill_name}</span>
                        <span className="text-xs text-muted-foreground">
                          {area.section} · {area.score_from_exam}%
                        </span>
                      </li>
                    ))}
                  </ul>
                  <Button onClick={() => navigate('/practice')} className="w-full" size="lg">
                    Practice these areas
                  </Button>
                </>
              )}
            </AnimatedCard>
          )}

          <div className="mt-6 flex flex-col sm:flex-row gap-4">
            <Button
              onClick={() => sessionId && navigate(`/exam/review/${sessionId}`)}
              className="flex-1"
            >
              View detailed analysis & review all questions
            </Button>
            <Button onClick={() => navigate('/exam')} variant="outline" className="flex-1">
              Take Another Exam
            </Button>
            <Button onClick={() => navigate('/')} variant="outline" className="flex-1">
              Back to Dashboard
            </Button>
          </div>
        </motion.div>
      </Layout>
    );
  }

  if (showBreakScreen) {
    const minutes = breakSecondsRemaining != null ? Math.floor(breakSecondsRemaining / 60) : 10;
    const seconds = breakSecondsRemaining != null ? breakSecondsRemaining % 60 : 0;
    return (
      <Layout>
        <div className="max-w-lg mx-auto text-center py-12">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="inline-flex p-4 rounded-full bg-amber-100 dark:bg-amber-950 mb-6">
              <Coffee className="w-16 h-16 text-amber-600 dark:text-amber-400" />
            </div>
            <PageTitle>10-Minute Break</PageTitle>
            <p className="text-muted-foreground mt-2">
              You've finished the Reading & Writing section. Take a short break before the Math section—just like the official SAT.
            </p>
          </motion.div>
          <AnimatedCard hover={false} className="mb-8">
            {breakSecondsRemaining != null && (
              <p className="text-4xl font-mono font-semibold text-amber-600 dark:text-amber-400 mb-2">
                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
              </p>
            )}
            <p className="text-sm text-muted-foreground mb-6">
              When you're ready, click below to start the Math section.
            </p>
            <Button onClick={handleContinueToMath} size="lg" className="w-full sm:w-auto">
              Continue to Math Section
            </Button>
          </AnimatedCard>
          <Button
            variant="ghost"
            onClick={() => setEndDialogOpen(true)}
            className="text-muted-foreground"
          >
            End exam instead
          </Button>
        </div>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout>
        <LoadingState variant="spinner" className="py-20" />
      </Layout>
    );
  }

  if (!question && loadError) {
    return (
      <Layout>
        <div className="max-w-md mx-auto py-12">
          <ErrorState message={loadError} onRetry={loadQuestion} />
        </div>
      </Layout>
    );
  }

  if (!question) {
    return (
      <Layout>
        <LoadingState variant="spinner" className="py-20" />
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
            <span className="text-sm font-medium">
              {currentSection} - Module {currentModule}
            </span>
            <span className="text-sm text-muted-foreground">
              Question {questionOrder} of {moduleTotal}
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden mb-1">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(totalProgress / totalQuestions) * 100}%` }}
              className="h-full bg-amber-500"
            />
          </div>
          <p className="text-xs text-muted-foreground text-right">
            Overall: {totalProgress}/{totalQuestions}
          </p>
        </div>

        <QuestionCard difficulty={question.difficulty}>
          <div className="mb-6">
            <p className="text-lg whitespace-pre-wrap">{question.question_text}</p>
          </div>

          <ChoiceList
            choices={choices}
            selectedChoice={selectedAnswer}
            onSelect={setSelectedAnswer}
          />

          <div className="mt-6 flex gap-3">
            <Button
              variant="outline"
              onClick={() => setEndDialogOpen(true)}
              className="flex-shrink-0"
            >
              End Exam
            </Button>

            <Button
              onClick={handleSubmitAndNext}
              disabled={!selectedAnswer}
              className="flex-1"
            >
              Submit & Next
            </Button>
          </div>
        </QuestionCard>
      </div>

      <ConfirmDialog
        open={endDialogOpen}
        onClose={() => setEndDialogOpen(false)}
        onConfirm={handleEndExam}
        title="End exam?"
        message="Your progress will be submitted and you'll see your results. You can't return to this exam."
        confirmLabel="End Exam"
        cancelLabel="Keep Going"
        confirmDisabled={isEnding}
        variant="danger"
      />
    </Layout>
  );
}
