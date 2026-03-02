import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { Calculator, BookOpen } from 'lucide-react';
import { Layout } from '../components/Layout';
import { PageTitle, AnimatedCard } from '../components/AnimatedComponents';
import { ErrorMessage } from '../components/AnimatedComponents';
import { Button } from '../components/ui/button';
import { api } from '../api/client';
import type { Section } from '../types';
import { SECTION_LABELS } from '../constants';

export function Practice() {
  const navigate = useNavigate();
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

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
      </motion.div>
    </Layout>
  );
}
