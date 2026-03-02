import { createBrowserRouter, Navigate } from 'react-router';
import { Dashboard } from './pages/Dashboard';
import { Practice } from './pages/Practice';
import { PracticeSession } from './pages/PracticeSession';
import { Exam } from './pages/Exam';
import { ExamSession } from './pages/ExamSession';
import { Progress } from './pages/Progress';
import { Admin } from './pages/Admin';
import { UserSetup } from './pages/UserSetup';
import { NotFound } from './pages/NotFound';
import { useUser } from './context/UserContext';
import { ReactNode } from 'react';

// Route guard for authenticated routes
function RequireUser({ children }: { children: ReactNode }) {
  const { user, loading } = useUser();

  if (loading) {
    return (
      <div
        className="flex items-center justify-center min-h-screen"
        role="status"
        aria-live="polite"
        aria-label="Loading"
      >
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/setup" replace />;
  }

  return <>{children}</>;
}

// Redirect to dashboard if already logged in
function RedirectIfLoggedIn({ children }: { children: ReactNode }) {
  const { user, loading } = useUser();

  if (loading) {
    return (
      <div
        className="flex items-center justify-center min-h-screen"
        role="status"
        aria-live="polite"
        aria-label="Loading"
      >
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export const router = createBrowserRouter([
  {
    path: '/setup',
    element: (
      <RedirectIfLoggedIn>
        <UserSetup />
      </RedirectIfLoggedIn>
    ),
  },
  {
    path: '/',
    element: (
      <RequireUser>
        <Dashboard />
      </RequireUser>
    ),
  },
  {
    path: '/practice',
    element: (
      <RequireUser>
        <Practice />
      </RequireUser>
    ),
  },
  {
    path: '/practice/session/:sessionId',
    element: (
      <RequireUser>
        <PracticeSession />
      </RequireUser>
    ),
  },
  {
    path: '/exam',
    element: (
      <RequireUser>
        <Exam />
      </RequireUser>
    ),
  },
  {
    path: '/exam/session/:sessionId',
    element: (
      <RequireUser>
        <ExamSession />
      </RequireUser>
    ),
  },
  {
    path: '/progress',
    element: (
      <RequireUser>
        <Progress />
      </RequireUser>
    ),
  },
  {
    path: '/admin',
    element: (
      <RequireUser>
        <Admin />
      </RequireUser>
    ),
  },
  {
    path: '*',
    element: <NotFound />,
  },
]);