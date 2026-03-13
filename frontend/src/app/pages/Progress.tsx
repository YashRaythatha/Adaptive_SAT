import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { TrendingUp, BookOpen, Calculator } from 'lucide-react';
import { Layout } from '../components/Layout';
import { PageTitle, AnimatedCard } from '../components/AnimatedComponents';
import { ProgressBar } from '../components/ProgressBar';
import { Button } from '../components/ui/button';
import { LoadingState } from '../components/LoadingState';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { api } from '../api/client';
import type { Skill } from '../types';
import { SECTION_LABELS } from '../constants';

export function Progress() {
  const navigate = useNavigate();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState<'ALL' | 'MATH' | 'RW'>('ALL');

  useEffect(() => {
    loadSkills();
  }, []);

  const loadSkills = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const data = await api.getSkills();
      setSkills(data);
    } catch (error) {
      console.error('Failed to load skills:', error);
      setLoadError('Failed to load progress. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filteredSkills = selectedSection === 'ALL' 
    ? skills 
    : skills.filter(s => s.section === selectedSection);

  const mathSkills = skills.filter(s => s.section === 'MATH');
  const rwSkills = skills.filter(s => s.section === 'RW');

  const avgMastery = (skillList: Skill[]) => 
    skillList.length > 0
      ? Math.round(skillList.reduce((sum, s) => sum + s.mastery_level, 0) / skillList.length)
      : 0;

  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <PageTitle subtitle="Track your progress across all skills">
          Your Progress
        </PageTitle>

        {loading ? (
          <LoadingState variant="spinner" className="py-20" />
        ) : loadError ? (
          <ErrorState message={loadError} onRetry={loadSkills} />
        ) : skills.length === 0 ? (
          <AnimatedCard hover={false}>
            <EmptyState
              icon={TrendingUp}
              title="No progress yet"
              description="Start practicing to track your progress across different skills."
              actionLabel="Start Practice"
              onAction={() => navigate('/practice')}
            />
          </AnimatedCard>
        ) : (
          <>
            {/* Section overview */}
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <AnimatedCard delay={0.1} hover={false} className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-blue-500 text-white rounded-lg">
                    <Calculator className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-medium">{SECTION_LABELS.MATH}</h3>
                    <p className="text-2xl font-semibold">{avgMastery(mathSkills)}%</p>
                  </div>
                </div>
                <ProgressBar value={avgMastery(mathSkills)} />
              </AnimatedCard>

              <AnimatedCard delay={0.2} hover={false} className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-purple-500 text-white rounded-lg">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-medium">{SECTION_LABELS.RW}</h3>
                    <p className="text-2xl font-semibold">{avgMastery(rwSkills)}%</p>
                  </div>
                </div>
                <ProgressBar value={avgMastery(rwSkills)} />
              </AnimatedCard>
            </div>

            {/* Filter */}
            <div className="flex gap-2 mb-6">
              <Button
                variant={selectedSection === 'ALL' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedSection('ALL')}
              >
                All Skills
              </Button>
              <Button
                variant={selectedSection === 'MATH' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedSection('MATH')}
              >
                Math
              </Button>
              <Button
                variant={selectedSection === 'RW' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedSection('RW')}
              >
                Reading & Writing
              </Button>
            </div>

            {/* Skills list */}
            <AnimatedCard delay={0.3} hover={false}>
              <div className="space-y-6">
                {filteredSkills.map((skill, index) => (
                  <motion.div
                    key={skill.skill_id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.4 + index * 0.05 }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h4 className="font-medium">{skill.skill_name}</h4>
                        <p className="text-xs text-muted-foreground">
                          {skill.section}
                          {skill.last_seen != null && skill.last_seen !== '' && ` • Last seen ${new Date(skill.last_seen).toLocaleDateString()}`}
                        </p>
                      </div>
                      <span className="text-sm font-medium">{skill.mastery_level}%</span>
                    </div>
                    <ProgressBar value={skill.mastery_level} showLabel />
                  </motion.div>
                ))}
              </div>
            </AnimatedCard>
          </>
        )}
      </motion.div>
    </Layout>
  );
}
