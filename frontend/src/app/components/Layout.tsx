import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router';
import { Sun, Moon, Menu, X, LogOut } from 'lucide-react';
import { Button } from './ui/button';
import { useUser } from '../context/UserContext';
import { useSession } from '../context/SessionContext';
import { ConfirmDialog } from './ConfirmDialog';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../api/client';
import { hasAdminKey } from '../api/admin';

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useUser();
  const { sessionType, examSessionId, clearSession } = useSession();
  const navigate = useNavigate();
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [leaveExamDialogOpen, setLeaveExamDialogOpen] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  const handleNavigation = (path: string) => {
    if (sessionType === 'exam' && examSessionId) {
      setPendingNavigation(path);
      setLeaveExamDialogOpen(true);
    } else {
      navigate(path);
    }
    setMobileMenuOpen(false);
  };

  const handleLeaveExam = async () => {
    if (!examSessionId) return;

    setIsSubmitting(true);
    try {
      await api.endExam(examSessionId);
      clearSession();
      setLeaveExamDialogOpen(false);
      if (pendingNavigation) {
        navigate(pendingNavigation);
        setPendingNavigation(null);
      }
    } catch (error) {
      console.error('Failed to end exam:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const inExam = sessionType === 'exam' && !!examSessionId;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-primary-foreground border-b border-border sticky top-0 z-40">
        <div className="max-w-screen-lg mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-4">
              {inExam ? (
                <span className="text-xl font-semibold cursor-default select-none" aria-hidden>
                  Adaptive SAT
                </span>
              ) : (
                <Link to="/" className="text-xl font-semibold hover:opacity-80 transition-opacity">
                  Adaptive SAT
                </Link>
              )}

              {/* Session indicator */}
              {sessionType && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="hidden sm:flex items-center gap-2 px-3 py-1 bg-primary-foreground/10 rounded-full text-sm"
                >
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  {sessionType === 'practice' ? 'Practice in progress' : 'Exam in progress'}
                </motion.div>
              )}
            </div>

            {/* Desktop Navigation */}
            {user && (
              <nav className="hidden md:flex items-center gap-4" aria-label="Main navigation">
                {inExam ? (
                  <>
                    <span className="text-sm opacity-80">Exam in progress — use End Exam to leave</span>
                  </>
                ) : (
                  <>
                    <NavLink
                      to="/"
                      end
                      className={({ isActive }) =>
                        `text-sm transition-opacity rounded px-2 py-1 focus-visible:ring-2 focus-visible:ring-primary-foreground/50 ${
                          isActive ? 'opacity-100 font-medium ring-2 ring-primary-foreground/30' : 'hover:opacity-80 opacity-90'
                        }`
                      }
                    >
                      Dashboard
                    </NavLink>
                    <NavLink
                      to="/progress"
                      className={({ isActive }) =>
                        `text-sm transition-opacity rounded px-2 py-1 focus-visible:ring-2 focus-visible:ring-primary-foreground/50 ${
                          isActive ? 'opacity-100 font-medium ring-2 ring-primary-foreground/30' : 'hover:opacity-80 opacity-90'
                        }`
                      }
                    >
                      Progress
                    </NavLink>
                    {hasAdminKey() && (
                      <NavLink
                        to="/admin"
                        className={({ isActive }) =>
                          `text-sm transition-opacity rounded px-2 py-1 focus-visible:ring-2 focus-visible:ring-primary-foreground/50 ${
                            isActive ? 'opacity-100 font-medium ring-2 ring-primary-foreground/30' : 'hover:opacity-80 opacity-90'
                          }`
                        }
                      >
                        Admin
                      </NavLink>
                    )}
                  </>
                )}

                <span className="text-sm opacity-80">Hi, {user.name}</span>

                <button
                  onClick={toggleTheme}
                  className="p-2 hover:bg-primary-foreground/10 rounded-lg transition-colors"
                  aria-label="Toggle theme"
                >
                  {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                </button>

                {!inExam && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={signOut}
                    className="text-primary-foreground hover:bg-primary-foreground/10"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign out
                  </Button>
                )}
              </nav>
            )}

            {/* Mobile menu button */}
            {user && (
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 hover:bg-primary-foreground/10 rounded-lg transition-colors"
                aria-label="Toggle menu"
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            )}
          </div>

          {/* Mobile Navigation */}
          <AnimatePresence>
            {mobileMenuOpen && user && (
              <motion.nav
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="md:hidden mt-4 pt-4 border-t border-primary-foreground/20 space-y-2"
                aria-label="Mobile navigation"
              >
                {inExam ? (
                  <p className="text-sm opacity-90 py-2">
                    Exam in progress — use the End Exam button on the page to leave.
                  </p>
                ) : (
                  <>
                    <button
                      onClick={() => handleNavigation('/')}
                      className="block w-full text-left py-2 text-sm hover:opacity-80 transition-opacity rounded focus-visible:ring-2 focus-visible:ring-primary-foreground/50"
                    >
                      Dashboard
                    </button>
                    <button
                      onClick={() => handleNavigation('/progress')}
                      className="block w-full text-left py-2 text-sm hover:opacity-80 transition-opacity rounded focus-visible:ring-2 focus-visible:ring-primary-foreground/50"
                    >
                      Progress
                    </button>
                    {hasAdminKey() && (
                      <button
                        onClick={() => handleNavigation('/admin')}
                        className="block w-full text-left py-2 text-sm hover:opacity-80 transition-opacity rounded focus-visible:ring-2 focus-visible:ring-primary-foreground/50"
                      >
                        Admin
                      </button>
                    )}
                  </>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-primary-foreground/20">
                  <span className="text-sm">Hi, {user.name}</span>
                  <button
                    onClick={toggleTheme}
                    className="p-2 hover:bg-primary-foreground/10 rounded-lg transition-colors"
                    aria-label="Toggle theme"
                  >
                    {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                  </button>
                </div>

                {!inExam && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={signOut}
                    className="w-full text-primary-foreground hover:bg-primary-foreground/10"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign out
                  </Button>
                )}
              </motion.nav>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-screen-lg mx-auto px-4 sm:px-6 py-8">{children}</main>

      {/* Leave exam confirmation dialog */}
      <ConfirmDialog
        open={leaveExamDialogOpen}
        onClose={() => {
          setLeaveExamDialogOpen(false);
          setPendingNavigation(null);
        }}
        onConfirm={handleLeaveExam}
        title="Leave exam?"
        message="Your progress will be submitted and you'll see your results. You can't return to this exam."
        confirmLabel="Leave and submit"
        cancelLabel="Stay"
        confirmDisabled={isSubmitting}
        variant="danger"
      />
    </div>
  );
}
