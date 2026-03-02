import { RouterProvider } from 'react-router';
import { Toaster } from './components/ui/sonner';
import { UserProvider } from './context/UserContext';
import { SessionProvider } from './context/SessionContext';
import { GlobalErrorProvider } from './context/GlobalErrorContext';
import { GlobalErrorBanner } from './components/GlobalErrorBanner';
import { ErrorBoundary } from './components/ErrorBoundary';
import { router } from './routes';

export default function App() {
  return (
    <ErrorBoundary>
      <GlobalErrorProvider>
        <UserProvider>
          <SessionProvider>
            <GlobalErrorBanner />
            <RouterProvider router={router} />
            <Toaster />
          </SessionProvider>
        </UserProvider>
      </GlobalErrorProvider>
    </ErrorBoundary>
  );
}