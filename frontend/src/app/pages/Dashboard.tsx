import React from 'react';
import { Link, useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { BookOpen, FileText } from 'lucide-react';
import { Layout } from '../components/Layout';
import { AnimatedCard, PageTitle } from '../components/AnimatedComponents';
import { useUser } from '../context/UserContext';

export function Dashboard() {
  const { user } = useUser();
  const navigate = useNavigate();

  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Hero */}
        <div className="mb-8">
          <PageTitle>Welcome back, {user?.name}! 👋</PageTitle>
          <p className="text-muted-foreground">
            Choose how you want to practice. Take a full exam to see your weak areas and then practice them.
          </p>
        </div>

        {/* Action cards: Practice + Full Exam only */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <AnimatedCard
            delay={0.1}
            onClick={() => navigate('/practice')}
            className="bg-gradient-to-br from-teal-50 to-cyan-100 dark:from-teal-950 dark:to-cyan-900 border-teal-300 dark:border-teal-700"
          >
            <div className="flex items-start gap-4">
              <div className="p-4 bg-teal-500 text-white rounded-xl">
                <BookOpen className="w-8 h-8" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-medium mb-2">Practice Session</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Work on specific skills with targeted questions. Perfect for daily practice.
                </p>
                <div className="inline-flex items-center gap-2 text-sm font-medium text-teal-600 dark:text-teal-400">
                  Start Practice
                  <span aria-hidden="true">→</span>
                </div>
              </div>
            </div>
          </AnimatedCard>

          <AnimatedCard
            delay={0.2}
            onClick={() => navigate('/exam')}
            className="bg-gradient-to-br from-amber-50 to-orange-100 dark:from-amber-950 dark:to-orange-900 border-amber-300 dark:border-amber-700"
          >
            <div className="flex items-start gap-4">
              <div className="p-4 bg-amber-500 text-white rounded-xl">
                <FileText className="w-8 h-8" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-medium mb-2">Full Practice Exam</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Take a complete SAT practice test. After the exam we’ll show your weak areas so you know what to practice next.
                </p>
                <div className="inline-flex items-center gap-2 text-sm font-medium text-amber-600 dark:text-amber-400">
                  Start Exam
                  <span aria-hidden="true">→</span>
                </div>
              </div>
            </div>
          </AnimatedCard>
        </div>

        <p className="text-sm text-muted-foreground">
          <Link to="/progress" className="text-primary hover:underline">
            View your progress and all skills →
          </Link>
        </p>
      </motion.div>
    </Layout>
  );
}
