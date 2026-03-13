import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router';
import { RefreshCw, Eye, CheckCircle, XCircle, BarChart, ChevronLeft, ChevronRight } from 'lucide-react';
import { Layout } from '../components/Layout';
import { PageTitle, Spinner, ErrorMessage, AnimatedCard } from '../components/AnimatedComponents';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { adminApi, hasAdminKey, clearAdminKey } from '../api/admin';
import type { AdminQuestion, QuestionStats } from '../types';

export function Admin() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(hasAdminKey());
  const [adminKey, setAdminKey] = useState('');
  const [keyError, setKeyError] = useState('');
  const [questions, setQuestions] = useState<AdminQuestion[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [statsMap, setStatsMap] = useState<Record<string, QuestionStats>>({});

  useEffect(() => {
    if (isAuthenticated) {
      loadQuestions(page);
    }
  }, [isAuthenticated, selectedStatus, page]);

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
      await adminApi.listQuestions(undefined, 1, 10); // Test request
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

  const loadQuestions = async (pageNum: number) => {
    setLoading(true);
    setError('');
    try {
      const data = await adminApi.listQuestions(
        selectedStatus === 'All' ? undefined : selectedStatus,
        pageNum,
        pageSize
      );
      setQuestions(data.items);
      setTotal(data.total);
    } catch (err) {
      setError('Failed to load questions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleView = (id: string) => {
    navigate(`/admin/questions/${id}`, { state: { questions } });
  };

  const handleSetStatus = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    setUpdatingStatus(id);
    try {
      await adminApi.setQuestionStatus(id, status);
      // Update local state
      setQuestions((prev) =>
        prev.map((q) => (q.id === id ? { ...q, quality_status: status } : q))
      );
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
                    Use the <code className="bg-muted px-1 py-0.5 rounded">ADMIN_KEY</code> value from <code className="bg-muted px-1 py-0.5 rounded">backend/.env</code>
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
                onClick={() => {
                  setSelectedStatus(status);
                  setPage(1);
                }}
              >
                {status}
              </Button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => loadQuestions(page)}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Loading...' : 'Refresh'}
          </Button>
        </div>

        {/* Pagination info and controls */}
        {total > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <p className="text-sm text-muted-foreground">
              Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total} questions
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </Button>
              <span className="text-sm text-muted-foreground px-2">
                Page {page} of {Math.max(1, Math.ceil(total / pageSize))}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(Math.ceil(total / pageSize), p + 1))}
                disabled={page >= Math.ceil(total / pageSize) || loading}
                aria-label="Next page"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {error && <ErrorMessage className="mb-4">{error}</ErrorMessage>}

        {/* Questions table */}
        {loading && questions.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <Spinner />
          </div>
        ) : questions.length === 0 ? (
          <AnimatedCard className="text-center py-12">
            <p className="text-muted-foreground mb-4">No questions in the list.</p>
            <Button onClick={() => loadQuestions(1)}>Load Questions</Button>
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

      </div>
    </Layout>
  );
}
