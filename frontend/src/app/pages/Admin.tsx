import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, RefreshCw, Eye, CheckCircle, XCircle, BarChart } from 'lucide-react';
import { Layout } from '../components/Layout';
import { PageTitle, Spinner, ErrorMessage, AnimatedCard } from '../components/AnimatedComponents';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { adminApi, hasAdminKey, clearAdminKey } from '../api/admin';
import type { AdminQuestion, AdminQuestionDetail, QuestionStats, QualityStatus } from '../types';

export function Admin() {
  const [isAuthenticated, setIsAuthenticated] = useState(hasAdminKey());
  const [adminKey, setAdminKey] = useState('');
  const [keyError, setKeyError] = useState('');
  const [questions, setQuestions] = useState<AdminQuestion[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewDetail, setViewDetail] = useState<AdminQuestionDetail | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [statsMap, setStatsMap] = useState<Record<string, QuestionStats>>({});
  const viewDialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isAuthenticated) {
      loadQuestions();
    }
  }, [isAuthenticated, selectedStatus]);

  const FOCUSABLE_SELECTOR =
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  useEffect(() => {
    if (!viewDialogOpen) return;
    const el = viewDialogRef.current;
    if (!el) return;
    const focusables = el.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    first?.focus();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setViewDialogOpen(false);
        return;
      }
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [viewDialogOpen]);

  const handleKeySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setKeyError('');

    if (!adminKey.trim()) {
      setKeyError('Please enter the admin key');
      return;
    }

    try {
      // Store key and test it
      const { setAdminKey: storeKey } = await import('../api/admin');
      storeKey(adminKey);
      await adminApi.listQuestions('All', 1); // Test request
      setIsAuthenticated(true);
    } catch (err) {
      clearAdminKey();
      setKeyError('Invalid admin key. Please try again.');
    }
  };

  const handleSignOut = () => {
    clearAdminKey();
    setIsAuthenticated(false);
    setAdminKey('');
  };

  const loadQuestions = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await adminApi.listQuestions(
        selectedStatus === 'All' ? undefined : selectedStatus,
        50
      );
      setQuestions(data);
    } catch (err) {
      setError('Failed to load questions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleView = async (id: string) => {
    setViewDialogOpen(true);
    setViewLoading(true);
    setViewDetail(null);
    try {
      const detail = await adminApi.getQuestionDetail(id);
      setViewDetail(detail);
    } catch (err) {
      setError('Failed to load question details.');
      setViewDialogOpen(false);
    } finally {
      setViewLoading(false);
    }
  };

  const handleSetStatus = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    setUpdatingStatus(id);
    try {
      await adminApi.setQuestionStatus(id, status);
      // Update local state
      setQuestions((prev) =>
        prev.map((q) => (q.id === id ? { ...q, quality_status: status } : q))
      );
      if (viewDetail?.id === id) {
        setViewDetail((prev) => prev ? { ...prev, quality_status: status } : null);
      }
      if (viewDialogOpen) {
        setViewDialogOpen(false);
      }
    } catch (err) {
      setError('Failed to update question status.');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleLoadStats = async (id: string) => {
    try {
      const stats = await adminApi.getQuestionStats(id);
      setStatsMap((prev) => ({ ...prev, [id]: stats }));
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  // Key gate
  if (!isAuthenticated) {
    return (
      <Layout>
        <div className="max-w-md mx-auto">
          <PageTitle subtitle="Enter the admin key to manage the question bank">
            Admin
          </PageTitle>

          <AnimatedCard delay={0.2} hover={false}>
            <form onSubmit={handleKeySubmit} className="space-y-4">
              <div>
                <Label htmlFor="admin-key">Admin Key</Label>
                <Input
                  id="admin-key"
                  type="password"
                  value={adminKey}
                  onChange={(e) => setAdminKey(e.target.value)}
                  placeholder="Enter X-ADMIN-KEY value"
                  aria-invalid={!!keyError}
                  aria-describedby={keyError ? 'admin-key-error' : undefined}
                />
                {keyError && (
                  <div id="admin-key-error" role="alert" className="mt-1">
                    <ErrorMessage>{keyError}</ErrorMessage>
                  </div>
                )}
                {import.meta.env.DEV && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Demo key: <code className="bg-muted px-1 py-0.5 rounded">demo-admin-key</code>
                  </p>
                )}
              </div>

              <Button type="submit" className="w-full">
                Continue
              </Button>
            </form>
          </AnimatedCard>
        </div>
      </Layout>
    );
  }

  // Main admin UI
  return (
    <Layout>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <PageTitle subtitle="Review and approve or reject questions in the bank">
            Question Bank Admin
          </PageTitle>
          <Button variant="outline" size="sm" onClick={handleSignOut}>
            Admin Sign Out
          </Button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex gap-2">
            {['All', 'DRAFT', 'APPROVED', 'REJECTED'].map((status) => (
              <Button
                key={status}
                variant={selectedStatus === status ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedStatus(status)}
              >
                {status}
              </Button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={loadQuestions}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Loading...' : 'Refresh'}
          </Button>
        </div>

        {error && <ErrorMessage className="mb-4">{error}</ErrorMessage>}

        {/* Questions table */}
        {loading && questions.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <Spinner />
          </div>
        ) : questions.length === 0 ? (
          <AnimatedCard className="text-center py-12">
            <p className="text-muted-foreground mb-4">No questions in the list.</p>
            <Button onClick={loadQuestions}>Load Questions</Button>
          </AnimatedCard>
        ) : (
          <AnimatedCard hover={false} className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm" aria-label="Question bank">
                <thead className="bg-muted border-b border-border">
                  <tr>
                    <th scope="col" className="text-left p-3 font-medium">Section</th>
                    <th scope="col" className="text-left p-3 font-medium">Difficulty</th>
                    <th scope="col" className="text-left p-3 font-medium">Status</th>
                    <th scope="col" className="text-left p-3 font-medium">Created</th>
                    <th scope="col" className="text-left p-3 font-medium">ID</th>
                    <th scope="col" className="text-left p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {questions.map((q) => (
                    <motion.tr
                      key={q.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="border-b border-border hover:bg-muted/50"
                    >
                      <td className="p-3">{q.section}</td>
                      <td className="p-3">{q.difficulty_llm}</td>
                      <td className="p-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                            q.quality_status === 'APPROVED'
                              ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400'
                              : q.quality_status === 'REJECTED'
                              ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400'
                              : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                          }`}
                          aria-label={`Status: ${q.quality_status}`}
                        >
                          {q.quality_status}
                        </span>
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {q.created_at
                          ? new Date(q.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '—'}
                      </td>
                      <td className="p-3 font-mono text-xs text-muted-foreground" title={q.id}>
                        {q.id.slice(0, 8)}...
                      </td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleView(q.id)}
                            aria-label="View question"
                          >
                            <Eye className="w-3 h-3" />
                          </Button>
                          {q.quality_status === 'DRAFT' && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleSetStatus(q.id, 'APPROVED')}
                                disabled={updatingStatus === q.id}
                                aria-label="Approve"
                              >
                                <CheckCircle className="w-3 h-3 text-green-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSetStatus(q.id, 'REJECTED')}
                                disabled={updatingStatus === q.id}
                                aria-label="Reject"
                              >
                                <XCircle className="w-3 h-3 text-red-600" />
                              </Button>
                            </>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleLoadStats(q.id)}
                            aria-label="Load stats"
                          >
                            <BarChart className="w-3 h-3" />
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </AnimatedCard>
        )}

        {/* Stats panel */}
        {Object.keys(statsMap).length > 0 && (
          <AnimatedCard delay={0.3} hover={false} className="mt-6">
            <h3 className="text-sm font-medium mb-3">Stats (click Stats to load)</h3>
            <div className="space-y-2 font-mono text-xs text-muted-foreground">
              {Object.entries(statsMap).map(([id, stats]) => (
                <div key={id}>
                  {id.slice(0, 8)}... → used {stats.times_used}×
                  {stats.correct_rate !== undefined && `, correct ${Math.round(stats.correct_rate * 100)}%`}
                  {stats.avg_time_taken_sec && `, avg ${Math.round(stats.avg_time_taken_sec)}s`}
                </div>
              ))}
            </div>
          </AnimatedCard>
        )}

        {/* View question modal */}
        <AnimatePresence>
          {viewDialogOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => !viewLoading && setViewDialogOpen(false)}
                className="fixed inset-0 bg-black/50 z-50"
              />

              <div className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none">
                <motion.div
                  ref={viewDialogRef}
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  transition={{ duration: 0.2 }}
                  className="bg-card rounded-lg border border-border shadow-lg max-w-2xl w-full max-h-[90vh] flex flex-col pointer-events-auto"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="view-question-title"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between p-6 border-b border-border">
                    <h2 id="view-question-title" className="text-lg font-medium">
                      {viewDetail
                        ? `Question · ${viewDetail.section} · Difficulty ${viewDetail.difficulty_llm}`
                        : 'View Question'}
                    </h2>
                    <button
                      onClick={() => setViewDialogOpen(false)}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      aria-label="Close dialog"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Body */}
                  <div className="flex-1 overflow-y-auto p-6">
                    {viewLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <Spinner />
                      </div>
                    ) : viewDetail ? (
                      <div className="space-y-4">
                        <div className="p-4 bg-muted rounded-lg border border-border">
                          <p className="whitespace-pre-wrap">{viewDetail.question_text}</p>
                        </div>

                        <div className="space-y-2">
                          {(['A', 'B', 'C', 'D'] as const).map((letter) => {
                            const isCorrect = viewDetail.correct_answer === letter;
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
                                  <span>{viewDetail.choices[letter]}</span>
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

                        {viewDetail.explanation && (
                          <div>
                            <h4 className="font-medium mb-2">Explanation</h4>
                            <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg text-sm text-muted-foreground">
                              <p className="whitespace-pre-wrap">{viewDetail.explanation}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <ErrorMessage>Failed to load question details.</ErrorMessage>
                    )}
                  </div>

                  {/* Footer */}
                  {viewDetail && (
                    <div className="flex gap-3 p-6 border-t border-border">
                      {viewDetail.quality_status === 'DRAFT' && (
                        <>
                          <Button
                            onClick={() => handleSetStatus(viewDetail.id, 'APPROVED')}
                            disabled={updatingStatus === viewDetail.id}
                          >
                            Approve
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => handleSetStatus(viewDetail.id, 'REJECTED')}
                            disabled={updatingStatus === viewDetail.id}
                            className="text-red-600 hover:text-red-700"
                          >
                            Reject
                          </Button>
                        </>
                      )}
                      <Button variant="ghost" onClick={() => setViewDialogOpen(false)} className="ml-auto">
                        Close
                      </Button>
                    </div>
                  )}
                </motion.div>
              </div>
            </>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
}
