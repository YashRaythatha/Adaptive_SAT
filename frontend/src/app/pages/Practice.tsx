import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { Calculator, BookOpen, Target } from 'lucide-react';
import { Layout } from '../components/Layout';
import { PageTitle, AnimatedCard } from '../components/AnimatedComponents';
import { ErrorMessage } from '../components/AnimatedComponents';
import { Button } from '../components/ui/button';
import { LoadingState } from '../components/LoadingState';
import { api, ApiError } from '../api/client';
import type { Section } from '../types';
import { SECTION_LABELS } from '../constants';

type WeakArea = { skill_id: string; skill_name: string; section: string; score_from_exam: number };

/** One weak area: click to start targeted practice for that skill. */
function WeakAreaCard({ area }: { area: WeakArea }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePractice = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLoading(true);
    setError(null);
    try {
      const session = await api.startTargetedPractice(area.skill_name);
      navigate(`/practice/session/${session.session_id}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to start practice');
      setLoading(false);
    }
  };

  return (
    <AnimatedCard
      delay={0}
      hover
      onClick={handlePractice}
      className={`flex items-center justify-between gap-4 p-4 cursor-pointer ${loading ? 'opacity-70 pointer-events-none' : ''}`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
          <Target className="w-5 h-5 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="min-w-0">
          <p className="font-medium text-foreground truncate">{area.skill_name}</p>
          <p className="text-sm text-muted-foreground">
            {area.section} · {area.score_from_exam}% on last exam
          </p>
          {error && <p className="text-xs text-destructive mt-1">{error}</p>}
        </div>
      </div>
      <Button size="sm" variant="secondary" disabled={loading} onClick={handlePractice}>
        {loading ? 'Starting…' : 'Practice'}
      </Button>
    </AnimatedCard>
  );
}

export function Practice() {
  const navigate = useNavigate();
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [weakAreas, setWeakAreas] = useState<WeakArea[]>([]);
  const [weakAreasLoading, setWeakAreasLoading] = useState(true);

  useEffect(() => {
    api
      .getWeakAreas(10)
      .then(setWeakAreas)
      .catch(() => setWeakAreas([]))
      .finally(() => setWeakAreasLoading(false));
  }, []);

  const handleStart = async () => {
    if (!selectedSection) return;

    setIsStarting(true);
    setStartError(null);
    try {
      const session = await api.startPractice(selectedSection);
      navigate(`/practice/session/${session.session_id}`);
    } catch (error) {
      console.error('Failed to start practice:', error);
      setStartError('Failed to start practice. Please check your connection and try again.');
      setIsStarting(false);
    }
  };

  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-2xl mx-auto"
      >
        <PageTitle subtitle="Choose a section to practice">
          Practice Session
        </PageTitle>

        <h2 className="text-lg font-medium mb-3">Practice by section</h2>
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <AnimatedCard
            delay={0.2}
            onClick={() => setSelectedSection('MATH')}
            className={
              selectedSection === 'MATH'
                ? 'ring-2 ring-primary bg-primary/5'
                : ''
            }
          >
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-blue-500 text-white rounded-full flex items-center justify-center mb-4">
                <Calculator className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-medium mb-2">{SECTION_LABELS.MATH}</h3>
              <p className="text-sm text-muted-foreground">
                Practice algebra, geometry, data analysis, and advanced math concepts.
              </p>
            </div>
          </AnimatedCard>

          <AnimatedCard
            delay={0.3}
            onClick={() => setSelectedSection('RW')}
            className={
              selectedSection === 'RW'
                ? 'ring-2 ring-primary bg-primary/5'
                : ''
            }
          >
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-purple-500 text-white rounded-full flex items-center justify-center mb-4">
                <BookOpen className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-medium mb-2">{SECTION_LABELS.RW}</h3>
              <p className="text-sm text-muted-foreground">
                Practice reading comprehension, grammar, vocabulary, and rhetorical skills.
              </p>
            </div>
          </AnimatedCard>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          {startError && <ErrorMessage className="mb-4">{startError}</ErrorMessage>}
          <Button
            onClick={handleStart}
            disabled={!selectedSection || isStarting}
            className="w-full"
            size="lg"
          >
            {isStarting ? 'Starting...' : 'Start Practice'}
          </Button>
        </motion.div>

        {/* Weak areas from last exam — click to practice that skill */}
        {(weakAreasLoading || weakAreas.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="mt-10"
          >
            <h2 className="text-lg font-medium mb-3 flex items-center gap-2">
              <Target className="w-5 h-5 text-amber-500" />
              Your weak areas
            </h2>
            {weakAreasLoading ? (
              <LoadingState variant="spinner" className="py-8" />
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-4">
                  Based on your last exam. Click a skill to practice 10–20 questions on that topic.
                </p>
                <ul className="space-y-3">
                  {weakAreas.map((area) => (
                    <li key={area.skill_id}>
                      <WeakAreaCard area={area} />
                    </li>
                  ))}
                </ul>
              </>
            )}
          </motion.div>
        )}

        {!weakAreasLoading && weakAreas.length === 0 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm text-muted-foreground mt-10"
          >
            No weak areas yet. Take a full exam to see skills to practice here.
          </motion.p>
        )}
      </motion.div>
    </Layout>
  );
}
