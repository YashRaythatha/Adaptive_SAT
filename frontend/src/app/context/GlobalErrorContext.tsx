import React, { createContext, useContext, useState, ReactNode } from 'react';

interface GlobalError {
  message: string;
  retry?: () => void;
}

interface GlobalErrorContextValue {
  error: GlobalError | null;
  setError: (error: GlobalError | null) => void;
  clearError: () => void;
}

const GlobalErrorContext = createContext<GlobalErrorContextValue | undefined>(undefined);

export function GlobalErrorProvider({ children }: { children: ReactNode }) {
  const [error, setError] = useState<GlobalError | null>(null);

  const clearError = () => setError(null);

  return (
    <GlobalErrorContext.Provider value={{ error, setError, clearError }}>
      {children}
    </GlobalErrorContext.Provider>
  );
}

export function useGlobalError() {
  const context = useContext(GlobalErrorContext);
  if (context === undefined) {
    throw new Error('useGlobalError must be used within a GlobalErrorProvider');
  }
  return context;
}
