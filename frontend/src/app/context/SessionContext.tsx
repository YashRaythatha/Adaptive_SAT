import React, { createContext, useContext, useState, ReactNode } from 'react';

interface SessionContextValue {
  sessionType: 'practice' | 'exam' | null;
  examSessionId: string | null;
  setSessionType: (type: 'practice' | 'exam' | null) => void;
  setExamSessionId: (id: string | null) => void;
  clearSession: () => void;
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [sessionType, setSessionType] = useState<'practice' | 'exam' | null>(null);
  const [examSessionId, setExamSessionId] = useState<string | null>(null);

  const clearSession = () => {
    setSessionType(null);
    setExamSessionId(null);
  };

  return (
    <SessionContext.Provider
      value={{
        sessionType,
        examSessionId,
        setSessionType,
        setExamSessionId,
        clearSession,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}
