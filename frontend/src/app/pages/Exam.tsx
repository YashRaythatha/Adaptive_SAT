import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { FileText, Clock, AlertCircle } from 'lucide-react';
import { Layout } from '../components/Layout';
import { PageTitle, AnimatedCard } from '../components/AnimatedComponents';
import { ErrorMessage } from '../components/AnimatedComponents';
import { Button } from '../components/ui/button';
import { api } from '../api/client';

export function Exam() {
  const navigate = useNavigate();
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const handleStart = async () => {
    setIsStarting(true);
    setStartError(null);
    try {
      const session = await api.startExam();
      navigate(`/exam/session/${session.session_id}`);
    } catch (error) {
      console.error('Failed to start exam:', error);
      setStartError('Failed to start exam. Please check your connection and try again.');
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
        <PageTitle subtitle="Simulate real SAT test conditions">
          Full Practice Exam
        </PageTitle>

        <AnimatedCard delay={0.2} hover={false} className="mb-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="p-3 bg-amber-500 text-white rounded-lg">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-medium mb-2">SAT Practice Test</h3>
              <p className="text-sm text-muted-foreground">
                This full-length practice exam simulates the real SAT experience. Complete all sections to get an accurate score estimate.
              </p>
            </div>
          </div>

          <div className="space-y-4 mb-6">
            <div className="flex items-center gap-3 text-sm">
              <Clock className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Duration</p>
                <p className="text-muted-foreground">Approximately 2-3 hours</p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-sm">
              <FileText className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Structure</p>
                <p className="text-muted-foreground">Reading & Writing, then Math (2 modules each)</p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-sm">
              <AlertCircle className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Important</p>
                <p className="text-muted-foreground">Find a quiet place and avoid interruptions</p>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              💡 <strong>Tip:</strong> Take this exam when you have dedicated time available. You can end the exam early, but you cannot pause and resume later.
            </p>
          </div>

          <Button
            onClick={handleStart}
            disabled={isStarting}
            size="lg"
            className="w-full"
          >
            {isStarting ? 'Starting Exam...' : 'Start Full Exam'}
          </Button>
          {startError && <ErrorMessage className="mt-4">{startError}</ErrorMessage>}
        </AnimatedCard>
      </motion.div>
    </Layout>
  );
}
