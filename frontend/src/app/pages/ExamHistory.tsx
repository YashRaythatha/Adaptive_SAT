import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { History, ChevronRight, FileText } from 'lucide-react';
import { Layout } from '../components/Layout';
import { PageTitle, AnimatedCard } from '../components/AnimatedComponents';
import { Button } from '../components/ui/button';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { api } from '../api/client';
import type { ExamHistoryItem } from '../api/client';

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function ExamHistory() {
  const navigate = useNavigate();
  const [list, setList] = useState<ExamHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getExamHistory()
      .then(setList)
      .catch((err) => setError(err?.message ?? 'Failed to load exam history'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Layout>
        <LoadingState variant="spinner" className="py-20" />
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="max-w-md mx-auto py-12">
          <ErrorState
            message={error}
            onRetry={() => api.getExamHistory().then(setList).catch(() => {})}
          />
          <Button variant="outline" className="mt-4" onClick={() => navigate('/')}>
            Back to Dashboard
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="mb-4">
            ← Back to Dashboard
          </Button>
          <PageTitle subtitle="View scores and open any past exam to see the full question-by-question review">
            Exam History
          </PageTitle>
        </div>

        {list.length === 0 ? (
          <AnimatedCard hover={false} className="text-center py-12">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-2">No past exams yet</p>
            <p className="text-sm text-muted-foreground mb-6">
              Complete a full practice exam to see it here. You can then open it to review every question and explanation.
            </p>
            <Button onClick={() => navigate('/exam')}>Start an exam</Button>
          </AnimatedCard>
        ) : (
          <ul className="space-y-3" aria-label="Past exams">
            {list.map((item, i) => (
              <motion.li
                key={item.session_id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <Link
                  to={`/exam/review/${item.session_id}`}
                  className="block focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
                >
                  <AnimatedCard
                    hover
                    className="flex items-center gap-4 p-4 sm:p-5"
                    delay={0}
                  >
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                      <History className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground">
                        {formatDate(item.ended_at)}
                      </p>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        Total: {item.total_scaled ?? '—'} &nbsp;·&nbsp; RW: {item.rw_scaled ?? '—'} &nbsp;·&nbsp; Math: {item.math_scaled ?? '—'}
                        {item.rw_total_correct != null && item.math_total_correct != null && (
                          <> &nbsp;·&nbsp; {item.rw_total_correct + item.math_total_correct}/98 correct</>
                        )}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" aria-hidden />
                  </AnimatedCard>
                </Link>
              </motion.li>
            ))}
          </ul>
        )}
      </div>
    </Layout>
  );
}
