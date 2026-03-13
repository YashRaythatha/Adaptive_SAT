import type { NavigatorScreenParams } from '@react-navigation/native';

export type MainTabParamList = {
  Dashboard: undefined;
  Practice: undefined;
  Exam: undefined;
  Progress: undefined;
  History: undefined;
};

/** Practice tab: start (choose section) → session (questions) */
export type PracticeStackParamList = {
  PracticeStart: undefined;
  PracticeSession: { sessionId: string; section: 'MATH' | 'RW' };
};

/** Exam tab: start → session → result → review */
export type ExamStackParamList = {
  ExamStart: undefined;
  ExamSession: { sessionId: string };
  ExamResult: { sessionId: string };
  ExamReview: { sessionId: string };
};

/** History tab: list → review */
export type HistoryStackParamList = {
  HistoryList: undefined;
  ExamReview: { sessionId: string };
};

export type RootStackParamList = {
  Setup: undefined;
  Main: NavigatorScreenParams<MainTabParamList>;
};
